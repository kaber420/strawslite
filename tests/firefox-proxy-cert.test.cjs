const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execSync } = require('child_process');

(async () => {
    const rootDir = path.resolve(__dirname, '..');
    const extensionPath = path.join(rootDir, 'dist', 'firefox');
    const certsDir = path.join(rootDir, 'go-engine', 'certs');
    const domain = 'mysite.test';

    console.log("--- 1. Generating Certificates ---");
    try {
        execSync(`bash ${path.join(rootDir, 'go-engine', 'scripts', 'generate_test_certs.sh')}`, { stdio: 'inherit' });
    } catch (e) {
        console.error("Failed to generate certs:", e.message);
        process.exit(1);
    }

    console.log("--- 2. Starting Go Engine ---");
    const goEngine = spawn('go', ['run', 'go-engine/cmd/proxy/main.go', '-port', '5782'], {
        cwd: rootDir,
        detached: true
    });
    
    console.log("--- 3. Starting Test HTTPS Server ---");
    const testServer = spawn('go', [
        'run', 'go-engine/test-server.go', 
        '-addr', ':8100',
        '-cert', path.join(certsDir, 'server.crt'),
        '-key', path.join(certsDir, 'server.key')
    ], {
        cwd: rootDir,
        detached: true
    });

    // Cleanup helper
    const cleanup = () => {
        console.log("Cleaning up processes...");
        if (goEngine.pid) process.kill(-goEngine.pid);
        if (testServer.pid) process.kill(-testServer.pid);
    };

    process.on('SIGINT', () => { cleanup(); process.exit(); });
    process.on('exit', cleanup);

    console.log("--- 4. Launching Firefox with Puppeteer ---");
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-firefox-'));

    const browser = await puppeteer.launch({
        product: 'firefox',
        executablePath: '/usr/bin/firefox',
        headless: true,
        args: [
            '--profile', userDataDir,
            '--no-remote',
            `--load-extension=${extensionPath}`,
            `--install-extension=${extensionPath}`,
            `--no-sandbox`,
            `--ignore-certificate-errors`
        ],
        ignoreHTTPSErrors: true,
        protocolTimeout: 60000
    });

    try {
        const page = await browser.newPage();
        
        console.log("--- 5. Configuring Extension Rules ---");
        // We need to wait for the extension to load and then inject the rule into storage
        // Since we don't have the internal ID easily, we wait for the background target
        let extensionTarget = null;
        for (let i = 0; i < 10; i++) {
            const targets = await browser.targets();
            extensionTarget = targets.find(t => t.url().startsWith('moz-extension://'));
            if (extensionTarget) break;
            await new Promise(r => setTimeout(r, 1000));
        }

        if (!extensionTarget) throw new Error("Extension not found");

        const internalId = extensionTarget.url().split('/')[2];
        const setupPage = await browser.newPage();
        await setupPage.goto(`moz-extension://${internalId}/sidepanel.html`);

        await setupPage.evaluate(async (domain) => {
            const rule = {
                id: Date.now().toString(),
                source: domain,
                destination: '127.0.0.1:8100',
                active: true,
                type: 'engine' // Redirects to port 5782
            };
            const data = await browser.storage.local.get('rules');
            const rules = data.rules || {};
            rules[rule.id] = rule;
            await browser.storage.local.set({ rules, masterSwitch: true });
            console.log("Rule injected for", domain);
        }, domain);

        await new Promise(r => setTimeout(r, 1000)); // Wait for sync

        console.log(`--- 6. Navigating to https://${domain} ---`);
        await page.goto(`https://${domain}`, { waitUntil: 'networkidle2' });
        
        const content = await page.content();
        if (content.includes("Hello from careldpos!")) {
            console.log("✅ TEST SUCCESS: Content matched. Proxy and Certs are working.");
        } else {
            console.log("❌ TEST FAILED: Content did not match.");
            console.log("Body:", content);
        }

        await page.screenshot({ path: path.join(rootDir, 'test-cert-result.png') });
        console.log("Screenshot saved to test-cert-result.png");

    } catch (e) {
        console.error("❌ Test Error:", e.message);
    } finally {
        await new Promise(r => setTimeout(r, 3000)); // Let the user see it
        await browser.close();
        cleanup();
    }
})();
