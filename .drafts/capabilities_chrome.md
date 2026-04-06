# Leaf Capabilities Sheet: Google Chrome

This sheet tracks the native APIs available in Chrome to power the "Performance Profile" of Straws Leaves. Use this to update the data harvesting logic in `background.js`.

## 1. Hardware & System (`chrome.system.*`)
Provides global machine state, essential for detecting hardware-linked bottlenecks.

| API | Data Points | Significance |
| :--- | :--- | :--- |
| `system.memory` | `availableCapacity`, `capacity` | Detects Low-Memory conditions globally. |
| `system.cpu` | `modelName`, `numOfProcessors`, `processors` | Real-time load per core (User, Idle, Kernel). |
| `system.storage` | `capacity`, `type`, `id` | Disk info (useful for optimizing large HAR exports). |

## 2. Process Monitoring (`chrome.processes`)
The most "optimal" way to read RAM per tab without CDP/RDP banners.

| Feature | Description |
| :--- | :--- |
| `getProcessInfo` | Returns CPU and Private Memory usage for specific PIDs. |
| `onUpdated` | Event-driven updates when tab memory changes significantly. |
| **Limitation** | Usually requires `processes` permission (Dev/Enterprise context). |

## 3. Storage & Background Performance
| API | Usage |
| :--- | :--- |
| `storage.local` | High quota (unlimitedStorage) for session-specific traces. |
| `offscreen` | (MV3) Can be used to run heavy parsing scripts (HAR generation) without blocking the UI. |

## 4. Deep Inspection (CDP Light)
| API | Usage |
| :--- | :--- |
| `chrome.debugger` | Attaches to a specific leaf to get `Performance.getMetrics` (JS Heap, DOM Count). Shows the "Debugging" banner. |

## Research & TODO
- [ ] Investigate `chrome.system.display` for multi-window coordination.
- [ ] Verify if `chrome.processes` is available on standard Linux builds without flags.
