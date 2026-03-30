const puppeteer = require('puppeteer');
(async () => {
  const extPath = '/home/kaber420/Documentos/proyectos/strawslite';
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox", 
      "--disable-setuid-sandbox", 
      `--disable-extensions-except=${extPath}`, 
      `--load-extension=${extPath}`
    ]
  });
  
  const background = await browser.waitForTarget(t => t.type() === 'service_worker');
  const worker = await background.worker();
  worker.on('console', msg => console.log('SW:', msg.text()));
  worker.on('error', err => console.error('SW ERR:', err));
  
  await worker.evaluate(() => {
    chrome.storage.local.set({
      rules: [{ id: 1, source: "kaber420.dev", destination: "localhost:3000", active: true }],
      masterSwitch: true
    });
  });

  await new Promise(r => setTimeout(r, 2000));

  await worker.evaluate(() => {
    chrome.storage.local.set({
      rules: [
        { id: 1, source: "https://kaber420.dev/", destination: "http:127.0.0.1:8100", active: true },
        { id: 2, source: "example.com", destination: "8080", active: true }
      ],
      masterSwitch: true
    });
  });

  await new Promise(r => setTimeout(r, 2000));
  console.log("Test finished.");
  await browser.close();
})();
