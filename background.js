chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

async function syncRules() {
  const data = await chrome.storage.local.get(['rules', 'masterSwitch']);
  const rules = data.rules || [];
  const masterSwitch = data.masterSwitch !== false;

  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const currentRuleIds = currentRules.map(r => r.id);

  const newRules = [];
  
  if (masterSwitch) {
    for (const rule of rules) {
      if (rule.active && rule.source && rule.destination) {
        let safeSource = rule.source.replace(/^https?:\/\//, '').replace(/\/?$/, '');
        
        let host = 'localhost';
        let port = '80'; // default port if none is found
        
        // Strip out protocols (http://, https://, or http:)
        let cleanDest = rule.destination.replace(/^(https?:)?\/\/?/i, '').replace(/^https?:/i, '');

        if (cleanDest.includes(':')) {
           const parts = cleanDest.split(':');
           host = parts[0];
           port = parts[1];
        } else if (/^\d+$/.test(cleanDest)) {
           // It's just a port number like "3000"
           host = 'localhost';
           port = cleanDest;
        } else {
           // It's just a host like "example.local"
           host = cleanDest;
           port = ''; // empty string means keep original port or default
        }

        host = host.replace(/^\/+|\/+$/g, '');
        port = port.replace(/\D/g, '');

        newRules.push({
          id: parseInt(rule.id, 10),
          priority: 1,
          action: {
            type: 'redirect',
            redirect: {
              transform: {
                scheme: 'http',
                host: host,
                ...(port ? { port: port } : {})
              }
            }
          },
          condition: {
            urlFilter: `||${safeSource}`,
            resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
          }
        });
      }
    }
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: currentRuleIds,
      addRules: newRules
    });
    console.log("Success updating rules:", newRules);
  } catch (e) {
    console.error("Error updating rules:", e, JSON.stringify(newRules, null, 2));
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.rules || changes.masterSwitch)) {
    syncRules();
  }
});

// Try syncing on start
syncRules();

if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    chrome.runtime.sendMessage({
      type: 'LOG_ENTRY',
      log: {
        timestamp: Date.now(),
        url: info.request.url,
        ruleId: info.rule.ruleId,
        method: info.request.method
      }
    }).catch(() => { /* Ignore: side panel might be closed */ });
  });
}
