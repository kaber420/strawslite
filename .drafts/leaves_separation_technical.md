# Straws Architecture: Leaf Separation Analysis

This document defines the strategy for separating "Leaves" (probes/tabs) by their host browser. The goal is to maximize the extraction of telemetry and state without relying on external debuggers (CDP/RDP), leveraging the native strengths of each engine.

## Unified Leaf Object Structure

All leaves, regardless of browser, report a base structure to the central Manager:

\`\`\`json
{
  "id": "winId-tabId",
  "browser": "Chrome | Firefox | Edge",
  "version": "123.x",
  "os": "Windows | Linux | macOS",
  "lastSeen": timestamp,
  "capabilities": ["performance_metrics", "media_status", "lifecycle_events"],
  "metrics": {
    "system": { "ram": null, "cpu": null },
    "leaf": { "ram": null, "cpu": null }
  },
  "state": {
    "audible": false,
    "discarded": false,
    "active": true
  }
}
\`\`\`

## Data Packets by Profile

### [Chrome Leaf (Performance Profile)]
Focuses on resource consumption and hardware impact.
- **Hardware Telemetry**: Direct mapping to \`chrome.system\` for global RAM/CPU.
- **Process Context**: Using PIDs (Process IDs) via \`chrome.processes\` to calculate exact RAM per tab.
- **Network**: Passive observation via \`webRequest\` and tagging for traffic isolation.

### [Firefox Leaf (Behavioral Profile)]
Focuses on tab status, visibility, and media activity.
- **Audio State**: \`audible\` and \`mutedInfo\` triggers for monitoring background media (Manual Transmission Mode).
- **Lifecycle Events**: \`discarded\` state monitoring (Firefox's native memory-saving mode).
- **Session Context**: Leveraging \`browser.sessions\` for persistent tab identification across browser restarts.

## Navigation System Logic
The Dashboard's "Manager" will dynamically render UI components based on the \`capabilities\` provided by the browser:

- **Component: Resource Meter** (Chrome Priority): Shows real-time RAM/CPU bars for the specific process.
- **Component: Media Monitor** (Firefox Priority): Shows audio indicators and mute controls.
- **Component: Lifecycle Badge**: Shows "Active", "Sleeping" (Discarded), or "Slow Load" status.

## Technical References
Detailed API sheets for ongoing research:
1. [Capabilities - Chrome](file:///home/kaber420/Documentos/proyectos/straws_c2/.drafts/capabilities_chrome.md)
2. [Capabilities - Firefox](file:///home/kaber420/Documentos/proyectos/straws_c2/.drafts/capabilities_firefox.md)
