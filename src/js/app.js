// js/app.js
import browser from "webextension-polyfill";

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
  const ruleCertSelect = document.getElementById('rule-cert');
  const engineOptions = document.getElementById('engine-options');
  
  const terminalContent = document.querySelector('.terminal-content');

  let state = {
    rules: [],
    masterSwitch: true
  };

  // --- Init & Load ---
  
  async function loadState() {
    const data = await browser.storage.local.get(['rules', 'masterSwitch']);
    state.rules = data.rules || {};
    state.masterSwitch = (data.masterSwitch !== false); // Default to true
    
    // Migration: Ensure all rules have a type
    let migrated = false;
    Object.keys(state.rules).forEach(id => {
      if (!state.rules[id].type) {
        state.rules[id].type = 'redirect';
        migrated = true;
      }
    });
    if (migrated) await saveState();

    masterSwitch.checked = state.masterSwitch;
    renderRules();
  }

  async function saveState() {
    await browser.storage.local.set({
      rules: state.rules,
      masterSwitch: state.masterSwitch
    });
  }

  // --- Rendering ---
  
  function renderRules() {
    const ruleIds = Object.keys(state.rules);
    if (ruleIds.length === 0) {
      rulesList.innerHTML = '';
      rulesList.classList.add('empty');
      return;
    }
    
    rulesList.classList.remove('empty');
    rulesList.innerHTML = '';
    
    ruleIds.forEach(id => {
      const rule = state.rules[id];
      const el = document.createElement('div');
      el.className = `rule-card ${rule.active && state.masterSwitch ? '' : 'inactive'}`;
      
      el.innerHTML = `
        <div class="rule-info">
          <div class="rule-source" title="${escapeHtml(rule.source)}">
            ${escapeHtml(rule.source)}
            <span class="rule-type-badge badge-${rule.type === 'engine' ? 'engine' : (rule.type === 'proxy' ? 'proxy' : 'redirect')}">
              ${rule.type === 'engine' ? 'Straws Engine' : (rule.type === 'proxy' ? 'Standard Proxy' : 'DNR Redirect')}
            </span>
          </div>
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
    const rule = state.rules[id];
    if (rule) {
      rule.active = active;
      saveState().then(renderRules);
    }
  }

  function deleteRule(id) {
    delete state.rules[id];
    saveState().then(renderRules);
  }

  // --- Modal ---
  
  addBtn.addEventListener('click', () => openModal());
  cancelRuleBtn.addEventListener('click', closeModal);

  function openModal(id = null) {
    ruleForm.reset();
    if (id) {
      modalTitle.textContent = 'Edit Straw';
      const rule = state.rules[id];
      if (rule) {
        ruleIdInput.value = rule.id;
        ruleSourceInput.value = rule.source;
        ruleDestInput.value = rule.destination;
        const type = rule.type || 'redirect';
        const radio = ruleForm.querySelector(`input[name="rule-type"][value="${type}"]`);
        if (radio) radio.checked = true;
      }
      modalTitle.textContent = 'Add Straw';
      ruleIdInput.value = '';
      const redirectRadio = ruleForm.querySelector('input[name="rule-type"][value="redirect"]');
      if (redirectRadio) redirectRadio.checked = true;
    }

    const type = ruleForm.querySelector('input[name="rule-type"]:checked').value;
    if (type === 'engine') {
      engineOptions.classList.remove('hidden');
      fetchAvailableCerts();
    } else {
      engineOptions.classList.add('hidden');
    }
    
    modal.classList.remove('hidden');
    ruleSourceInput.focus();
  }

  // Handle mode selection change
  ruleForm.querySelectorAll('input[name="rule-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'engine') {
        engineOptions.classList.remove('hidden');
        fetchAvailableCerts();
      } else {
        engineOptions.classList.add('hidden');
      }
    });
  });

  async function fetchAvailableCerts() {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_CERTS' });
      if (response && response.certs) {
        // Keep the first default option
        const currentVal = ruleCertSelect.value;
        ruleCertSelect.innerHTML = '<option value="">Auto-select (by hostname)</option>';
        response.certs.forEach(cert => {
          const opt = document.createElement('option');
          opt.value = cert;
          opt.textContent = cert;
          ruleCertSelect.appendChild(opt);
        });
        ruleCertSelect.value = currentVal;
      }
    } catch (e) {
      console.error("Error fetching certs:", e);
    }
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
    dest = dest.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

    if (!source || !dest) return;

    // Validate that source looks like a valid hostname
    const isValidDomain = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/.test(source);
    if (!isValidDomain) {
      addLog('Invalid source domain. Use a format like: myapi.dev or api.local', 'warn');
      return;
    }

    // Check for duplicate source
    const existingId = id ? parseInt(id) : null;
    const ruleIds = Object.keys(state.rules);
    const duplicate = ruleIds.find(rid => state.rules[rid].source === source && state.rules[rid].id !== existingId);
    if (duplicate) {
      addLog(`Duplicate source: "${source}" already exists.`, 'warn');
      return;
    }

    const type = ruleForm.querySelector('input[name="rule-type"]:checked').value;

    if (id) {
      // Edit
      const rid = parseInt(id);
      if (state.rules[rid]) {
        state.rules[rid].source = source;
        state.rules[rid].destination = dest;
        state.rules[rid].type = type;
        state.rules[rid].cert = type === 'engine' ? ruleCertSelect.value : '';
      }
    } else {
      // Add new
      const nextId = Object.keys(state.rules).reduce((max, ridd) => Math.max(max, parseInt(ridd)), 0) + 1;
      state.rules[nextId] = {
        id: nextId,
        source: source,
        destination: dest,
        type: type,
        cert: type === 'engine' ? ruleCertSelect.value : '',
        active: true
      };
    }

    await saveState();
    renderRules();
    closeModal();
  });

  // --- Logs Handling moved to monitor.js ---
  
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
          state.rules = {};
          imported.forEach((r, i) => {
            if (r.source && r.destination) {
              const id = i + 1;
              state.rules[id] = {
                id: id,
                source: r.source,
                destination: r.destination,
                type: r.type || 'redirect',
                active: r.active !== false
              };
            }
          });
          
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
