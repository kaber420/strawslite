Implementation Plan - Straws Scenarios Architecture
This plan introduces a new Scenario entity that groups rules, containers, and multiple tabs into a single logical audit. This allows you to test "Variant A" vs "Variant B" of a site side-by-side with isolated persistence and specific header overrides.

User Review Required
IMPORTANT

Data Migration: Introducing Scenarios will change how rules are applied. Rules within a scenario will take precedence over global rules for the tabs associated with that scenario. Launch Behavior: Launching a scenario will trigger multiple Firefox Container Tab creations simultaneously.

Proposed Changes
1. Unified State & Storage
[MODIFY] 

state.js
Add scenarios array to the global state.
Add activeScenarioId to track current focus.
Define a Scenario object structure:
id, name, description.
globalRules: Rules applied to every tab in the scenario.
variants: Array of tab configurations (Name, Container Color, URL, specific Header Overrides).
2. Background Orchestration
[MODIFY] 

background.js
State Enrichment: Add bgState.tabToScenarioMap to track which tab belongs to which scenario/variant.
Enhanced setupLeafTagging:
Update to check if a tabId is part of an active scenario.
If so, inject an additional X-Straws-Scenario header.
Apply scenario-specific modifyHeaders rules via browser.declarativeNetRequest.
launchScenario Logic:
Implement a handler that iterates through scenario variants.
Creates a Unique Container for each variant.
Opens a Tab for each variant.
Maps the resulting tabId to the scenario variant.
3. Dashboard UI (The "Command Center")
[NEW] 

scenarios.js
Build the UI logic to:
List existing scenarios.
Create new scenarios with defined variants.
"Launch" button to trigger the background opening process.
[MODIFY] 

dashboard.html
Add a new "Scenarios" navigation item and view container.
[MODIFY] 

dom.js
Register scenario-specific UI elements.
4. Logic & Rendering
[MODIFY] 

render.js
Update renderLogRow and updateMetrics to display the Scenario name if a request belongs to one.
Open Questions
NOTE

Persistence: Should we allow "cloning" scenarios to quickly iterate on variations of the same audit? Rule Collision: If a global rule blocks google.com but a scenario bypasses it, we need to ensure the Scenario rule has higher priority in DNR. I plan to use a priority offset for Scenario rules.

Verification Plan
Automated Tests
Background Integrity: Verify that tabToScenarioMap correctly survives tab reloads.
DNR Verification: Verify that a scenario tab receives the X-Straws-Scenario header while a normal tab does not.
Manual Verification
Create a scenario "A/B Auth Test" with two variants: "Admin" (Blue) and "Guest" (Red).
Launch the scenario.
Verify that two container tabs open at the same time.
Verify that requests in the Dashboard are correctly grouped under the "A/B Auth Test" label.
¿Te parece bien este enfoque para comenzar con la arquitectura de Escenarios? Si apruebas, empezaré definiendo el nuevo estado en state.js y scenarios.js.

