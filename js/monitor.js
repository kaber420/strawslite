document.addEventListener('DOMContentLoaded', () => {
    const terminalOutput = document.getElementById('terminal-output');
    const clearBtn = document.getElementById('clear-logs-btn');
    const MAX_LOGS = 100;

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

        div.innerHTML = `
            <span class="time">${log.timestamp}</span>
            <span class="from ${fromClass}">[${log.from}]</span>
            <span class="method">${log.method}</span>
            <span class="url">${log.url}</span>
            <div class="log-details">
                <span class="latency">${log.latency}</span>
                <span class="ip">${log.ip}</span>
                <span class="status ${statusClass}">${log.status}</span>
                <span class="type">${log.type}</span>
                <span class="size">${log.size}</span>
            </div>
        `;
        return div;
    }

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

            // Auto-scroll
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }
    });

    clearBtn?.addEventListener('click', () => {
        const content = terminalOutput.querySelector('.terminal-content') || terminalOutput;
        content.innerHTML = '<span class="log info">Logs cleared.</span>';
    });
});
