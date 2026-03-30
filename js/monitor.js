document.addEventListener('DOMContentLoaded', () => {
    const terminalOutput = document.getElementById('terminal-output');
    const clearBtn = document.getElementById('clear-logs-btn');
    const MAX_LOGS = 100;

    const logOverlay = document.getElementById('log-overlay');
    const logOverlayContent = document.getElementById('log-overlay-content');
    const closeOverlayBtn = document.getElementById('close-log-overlay');

    function shortenURL(url) {
        try {
            const urlObj = new URL(url);
            let path = urlObj.pathname;
            if (path.length > 20) {
                const parts = path.split('/');
                if (parts.length > 3) {
                    path = `/${parts[1]}/.../${parts[parts.length - 1]}`;
                }
            }
            return `${urlObj.hostname}${path}`;
        } catch (e) {
            return url.length > 40 ? url.substring(0, 37) + '...' : url;
        }
    }

    function createLogEntry(log) {
        const div = document.createElement('div');
        div.className = `log ${log.status === 'Error' ? 'warn' : ''}`;
        
        // Color status codes
        let statusClass = 'status-other';
        if (typeof log.status === 'number') {
            if (log.status >= 200 && log.status < 300) statusClass = 'status-2xx';
            else if (log.status >= 300 && log.status < 400) statusClass = 'status-3xx';
            else if (log.status >= 400) statusClass = 'status-4xx';
        }

        const fromClass = log.from === 'Straw' ? 'from-straw' : 'from-direct';
        const displayUrl = shortenURL(log.url);

        div.innerHTML = `
            <span class="time">${log.timestamp}</span>
            <span class="from ${fromClass}">[${log.from}]</span>
            <span class="method">${log.method}</span>
            <span class="url" title="${log.url}">${displayUrl}</span>
            <div class="log-details">
                <span class="latency">${log.latency}</span>
                <span class="ip">${log.ip}</span>
                <span class="status ${statusClass}">${log.status}</span>
                <span class="type">${log.type}</span>
                <span class="size">${log.size}</span>
            </div>
        `;

        div.addEventListener('click', () => showLogDetails(log));

        return div;
    }

    function showLogDetails(log) {
        logOverlayContent.innerHTML = `
<div class="detail-row"><span class="label">Timestamp:</span>${log.timestamp}</div>
<div class="detail-row"><span class="label">From:</span>${log.from}</div>
<div class="detail-row"><span class="label">Method:</span>${log.method}</div>
<div class="detail-row"><span class="label">URL:</span>${log.url}</div>
<div class="detail-row"><span class="label">Status:</span>${log.status}</div>
<div class="detail-row"><span class="label">Latency:</span>${log.latency}</div>
<div class="detail-row"><span class="label">IP:</span>${log.ip}</div>
<div class="detail-row"><span class="label">Type:</span>${log.type}</div>
<div class="detail-row"><span class="label">Size:</span>${log.size}</div>
${log.error ? `<div class="detail-row"><span class="label">Error:</span>${log.error}</div>` : ''}
`.trim();
        logOverlay.classList.add('active');
    }

    closeOverlayBtn?.addEventListener('click', () => {
        logOverlay.classList.remove('active');
    });

    // Close overlay on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && logOverlay.classList.contains('active')) {
            logOverlay.classList.remove('active');
        }
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'LOG_ENTRY') {
            const content = terminalOutput.querySelector('.terminal-content') || terminalOutput;
            
            // Remove "Waiting for traffic" if present
            const emptyHint = content.querySelector('.info');
            if (emptyHint && emptyHint.textContent.includes('Waiting')) {
                emptyHint.remove();
            }

            const entry = createLogEntry(message.log);
            content.appendChild(entry);

            // Keep log count under limit
            while (content.children.length > MAX_LOGS) {
                content.removeChild(content.firstChild);
            }

            // Auto-scroll if not at bottom (optional, but usually good)
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }
    });

    clearBtn?.addEventListener('click', () => {
        const content = terminalOutput.querySelector('.terminal-content') || terminalOutput;
        content.innerHTML = '<span class="log info">Logs cleared.</span>';
        logOverlay.classList.remove('active');
    });
});
