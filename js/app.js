// js/app.js

document.addEventListener('DOMContentLoaded', () => {
  const rulesList = document.getElementById('rules-list');
  const masterSwitch = document.getElementById('master-switch');
  const addBtn = document.getElementById('add-rule-btn');
  const importBtn = document.getElementById('import-btn');
  const exportBtn = document.getElementById('export-btn');
  const importFile = document.getElementById('import-file');
  const clearLogsBtn = document.getElementById('clear-logs-btn');
  
  const modal = document.getElementById('rule-modal');
  const ruleForm = document.getElementById('rule-form');
  const cancelRuleBtn = document.getElementById('cancel-rule-btn');
  const modalTitle = document.getElementById('modal-title');
  const ruleIdInput = document.getElementById('rule-id');
  const ruleSourceInput = document.getElementById('rule-source');
  const ruleDestInput = document.getElementById('rule-dest');
  
  const terminalContent = document.querySelector('.terminal-content');

  let state = {
    rules: [],
    masterSwitch: true
  };

  // --- Init & Load ---
  
  async function loadState() {
    const data = await chrome.storage.local.get(['rules', 'masterSwitch']);
    state.rules = data.rules || [];
    state.masterSwitch = (data.masterSwitch !== false); // Default to true
    
    masterSwitch.checked = state.masterSwitch;
    renderRules();
  }

  async function saveState() {
    await chrome.storage.local.set({
      rules: state.rules,
      masterSwitch: state.masterSwitch
    });
  }

  // --- Rendering ---
  
  function renderRules() {
    if (state.rules.length === 0) {
      rulesList.innerHTML = '';
      rulesList.classList.add('empty');
      return;
    }
    
    rulesList.classList.remove('empty');
    rulesList.innerHTML = '';
    
    state.rules.forEach(rule => {
      const el = document.createElement('div');
      el.className = `rule-card ${rule.active && state.masterSwitch ? '' : 'inactive'}`;
      
      el.innerHTML = `
        <div class="rule-info">
          <div class="rule-source" title="${escapeHtml(rule.source)}">${escapeHtml(rule.source)}</div>
          <div class="rule-dest">${escapeHtml(rule.destination)}</div>
        </div>
        <div class="rule-actions">
          <label class="switch">
            <input type="checkbox" class="rule-toggle" data-id="${rule.id}" ${rule.active && state.masterSwitch ? 'checked' : ''} ${!state.masterSwitch ? 'disabled' : ''}>
            <span class="slider round"></span>
          </label>
          <button class="btn-icon edit-rule-btn" data-id="${rule.id}" title="Edit">✏️</button>
          <button class="btn-icon delete-rule-btn" data-id="${rule.id}" title="Delete">🗑️</button>
        </div>
      `;
      rulesList.appendChild(el);
    });

    // Attach listeners
    document.querySelectorAll('.rule-toggle').forEach(el => {
      el.addEventListener('change', (e) => toggleRule(parseInt(e.target.dataset.id), e.target.checked));
    });
    
    document.querySelectorAll('.edit-rule-btn').forEach(el => {
      el.addEventListener('click', (e) => openModal(parseInt(e.currentTarget.dataset.id)));
    });
    
    document.querySelectorAll('.delete-rule-btn').forEach(el => {
      el.addEventListener('click', (e) => deleteRule(parseInt(e.currentTarget.dataset.id)));
    });
  }

  // --- Logic ---

  masterSwitch.addEventListener('change', async (e) => {
    state.masterSwitch = e.target.checked;
    await saveState();
    renderRules();
    addLog(`System ${state.masterSwitch ? 'Activated' : 'Paused'}.`, 'warn');
  });

  function toggleRule(id, active) {
    const rule = state.rules.find(r => r.id === id);
    if (rule) {
      rule.active = active;
      saveState().then(renderRules);
    }
  }

  function deleteRule(id) {
    state.rules = state.rules.filter(r => r.id !== id);
    saveState().then(renderRules);
  }

  // --- Modal ---
  
  addBtn.addEventListener('click', () => openModal());
  cancelRuleBtn.addEventListener('click', closeModal);

  function openModal(id = null) {
    ruleForm.reset();
    if (id) {
      modalTitle.textContent = 'Edit Straw';
      const rule = state.rules.find(r => r.id === id);
      if (rule) {
        ruleIdInput.value = rule.id;
        ruleSourceInput.value = rule.source;
        ruleDestInput.value = rule.destination;
      }
    } else {
      modalTitle.textContent = 'Add Straw';
      ruleIdInput.value = '';
    }
    modal.classList.remove('hidden');
    ruleSourceInput.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  ruleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let source = ruleSourceInput.value.trim();
    let dest = ruleDestInput.value.trim();
    const id = ruleIdInput.value;

    source = source.replace(/^https?:\/\//, '').replace(/\/?$/, '');
    dest = dest.replace(/^(https?:)?\/\/?/i, '').replace(/^https?:/i, '').replace(/\/+$/, '');

    if (!source || !dest) return;

    if (id) {
      // Edit
      const rule = state.rules.find(r => r.id === parseInt(id));
      if (rule) {
        rule.source = source;
        rule.destination = dest;
      }
    } else {
      // Add new
      const nextId = state.rules.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      state.rules.push({
        id: nextId,
        source: source,
        destination: dest,
        active: true
      });
    }

    await saveState();
    renderRules();
    closeModal();
  });

  // --- Logs Handling ---
  
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'LOG_ENTRY') {
      const { timestamp, url, ruleId, method } = msg.log;
      const rule = state.rules.find(r => r.id === ruleId);
      const urlObj = new URL(url);
      const host = `${urlObj.hostname}${urlObj.pathname}`;
      
      const time = new Date(timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
      addLogHTML(`
        <span class="time">[${time}]</span>
        <span class="method">${method}</span>
        <span class="url">${escapeHtml(host)}</span>
        <span style="color:var(--text-secondary)"> ➔ </span>
        <span style="color:var(--accent-primary)">${rule ? rule.destination : 'Intercepted'}</span>
      `, 'hit');
    }
  });

  function addLog(text, type = 'info') {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
    addLogHTML(`
      <span class="time">[${time}]</span>
      <span>${escapeHtml(text)}</span>
    `, type);
  }

  function addLogHTML(html, type) {
    const el = document.createElement('div');
    el.className = `log ${type}`;
    el.innerHTML = html;
    terminalContent.appendChild(el);
    
    // Auto scroll to bottom
    const terminalWindow = document.getElementById('terminal-output');
    terminalWindow.scrollTop = terminalWindow.scrollHeight;
    
    // Limits
    while(terminalContent.children.length > 100) {
      terminalContent.removeChild(terminalContent.firstChild);
    }
  }

  clearLogsBtn.addEventListener('click', () => {
    terminalContent.innerHTML = '';
  });

  // --- Import / Export ---
  
  exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.rules, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "strawslight_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addLog('Rules exported to JSON.');
  });

  importBtn.addEventListener('click', () => {
    importFile.click();
  });

  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported)) {
          // Merge or Override? Let's Override for simplicity, but adjust IDs
          state.rules = imported.map((r, i) => ({
            id: i + 1,
            source: r.source || '',
            destination: r.destination || '',
            active: r.active !== false
          })).filter(r => r.source && r.destination);
          
          await saveState();
          renderRules();
          addLog('Rules imported successfully.', 'success');
        }
      } catch (err) {
        addLog('Failed to import rules. Invalid format.', 'error');
      }
      importFile.value = ""; // reset
    };
    reader.readAsText(file);
  });

  // Utils
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  // Load state
  loadState();
});
