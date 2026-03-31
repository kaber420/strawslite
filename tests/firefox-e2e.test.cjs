const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const extensionPath = path.resolve(__dirname, 'dist', 'firefox');
  console.log(`Loading extension from: ${extensionPath}`);

  const browser = await puppeteer.launch({
    product: 'firefox',
    executablePath: '/usr/bin/firefox',
    headless: false, // Keep it visible for debugging if needed, but for automated test we can use true
    args: [
      `--start-debugger-server`,
      `--load-extension=${extensionPath}`,
      `--install-extension=${extensionPath}`,
      `--no-sandbox`,
      `--disable-setuid-sandbox`
    ],
    ignoreHTTPSErrors: true // Since it's a self-signed cert
  });

  const page = await browser.newPage();

  // Setup Extension Storage
  // We need to find the background page or use runtime.sendMessage
  // For simplicity, we'll try to use a sidepanel or extension page if available
  // But wait, we can just use the extension's internal storage if we know how.
  // Puppeteer can access browser.storage if we go to an extension URL.
  
  // Find the extension ID
  console.log("Waiting for extension target...");
  
  let extensionTarget = null;
  for (let i = 0; i < 20; i++) {
    const allTargets = await browser.targets();
    console.log(`Attempt ${i+1}: targets:`, allTargets.map(t => `${t.type()}: ${t.url()}`));
    extensionTarget = allTargets.find(t => t.url().startsWith('moz-extension://') || t.type() === 'background_page');
    if (extensionTarget) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  
  if (extensionTarget) {
    console.log(`Found extension target: ${extensionTarget.url()} (${extensionTarget.type()})`);
    const extPage = await extensionTarget.page() || (await extensionTarget.worker() ? null : await browser.newPage());
    // If it's a background page with no 'page', we might need to open an extension URL to interact with storage
    const storagePage = extPage || await browser.newPage();
    if (!extPage) {
        const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath, 'manifest.json'), 'utf8'));
        const internalId = extensionTarget.url().split('/')[2];
        console.log(`Internal ID: ${internalId}`);
        await storagePage.goto(`moz-extension://${internalId}/sidepanel.html`);
    }

    await storagePage.evaluate(async () => {
          const rule = {
            id: '1',
            source: '127.0.0.1',
            destination: '127.0.0.1:8100',
            active: true,
            type: 'engine'
          };
          await browser.storage.local.set({ 
            rules: { '1': rule },
            masterSwitch: true
          });
          console.log("Rule set in storage");
    }).catch(err => console.error("Error setting rule:", err));
  } else {
    console.warn("Extension target not found after 10s.");
  }

  // Navigate to the test URL
  console.log("Navigating to https://127.0.0.1:8100...");
  try {
    await page.goto('https://127.0.0.1:8100', { waitUntil: 'networkidle2' });
    const content = await page.content();
    console.log("Page Content:", content);
    
    if (content.includes("Hello from careldpos!")) {
      console.log("TEST PASSED: Successfully connected to careldpos through the proxy.");
    } else {
      console.log("TEST FAILED: Content doesn't match.");
    }
  } catch (e) {
    console.error("TEST FAILED: Could not navigate:", e.message);
  }

  // screenshot for proof
  await page.screenshot({ path: 'test_result.png' });
  console.log("Screenshot saved to test_result.png");

  // Keep open for a bit to see the proxy logs
  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
})();
