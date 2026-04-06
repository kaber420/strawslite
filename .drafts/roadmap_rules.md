/home/kaber420/Documentos/proyectos/straws_c2/.drafts/roadmap-straws.md
# Straws Ecosystem: Professional Roadmap 🚀
Evolution from a proxy tool to a "Cyber-Laboratory" for developers and security researchers.

## 🟢 Phase 1: High-Fidelity Observability (Current)
*Focus: Data accuracy and professional presentation.*
- [x] **Accurate Waterfall Timing**: Precise latency and temporal mapping.
- [x] **Structured Inspector**: Key-Value tables for headers and payloads.
- [x] **Cyber-Aesthetics**: Responsive design, marquee scrolling, and sensitive data masking.
- [x] **Real-time Metrics**: KPI dashboard and traffic health bar.
- [x] **Physical Cert Management**: Domain-based listing and deletion from engine.
- [ ] **Low-Level Resource Tracking (PID-based / Hybrid)**: **Estrategia Zero-JS**. Monitoreo de RAM (RSS) y CPU por cada Leaf (Firefox/Chrome). El engine consulta directamente al Kernel (gopsutil) vía PID para evitar inyección de scripts y mantener integridad de seguridad (CORS/COOP).
- [ ] **Cross-Browser Server Mapping**: Extracción automatizada de Server IP, Port y Protocolo (H2/H3) via BiDi/CDP para análisis profundo de infraestructura. ✅ Compatible con Phase 1.

## 🟡 Phase 2: Active Manipulation (Next)
*Focus: Interactivity and workflow efficiency.*
- [x] **Request Diffing**: Side-by-side comparison of headers/payloads between any two traces.
- [ ] **Active Interception (Edit & Resend)**: Modify any intercepted request and manually re-emit it via the Go engine.
- [ ] **Global Search & Filter**: Search across headers, body content, and status codes simultaneously.
- [x] **HAR Export/Import**: Full compatibility with standard devtools formats (`.har`).

## 🟠 Phase 3: security & Health Audit
*Focus: Automated intelligence and protocol deep-dive.*
- [ ] **Security Scanners**: Automatic detection of missing security headers (`CSP`, `HSTS`, `XFO`).
- [ ] **Credential Guard**: Highlight exposed secrets (API Keys, Tokens) in URLs or unprotected payloads.
- [x] **SSL/TLS Handshake Inspector**: Detailed view of the TLS negotiation (Ciphers, SNI, Version). ✅ Implementado en Engine Go.
- [ ] **Fingerprinting (Request DNA)**: Visual icons per request to identify patterns without reading.

## 🔴 Phase 4: Distributed Command & Control (Straws-Pro) 🌐
*Focus: Scale, orchestration, and industrial security.*
- [ ] **mTLS Reverse Tunnel Core**: Secure, certificate-based persistent socket for all nodes.
- [ ] **Centralized "C2" Master**: Dashboard to manage multiple engines (nodes) from a single screen.
- [ ] **Kiosk Orchestrator (Hardened Node)**: Specific adapter for managed kiosks with Watchdog and OS-level hardening.
- [ ] **Sensor Node (Lightweight)**: Browser-only connection for standard users (no motor needed, just data tunneling).
- [ ] **Remote Policy Injection**: Update WAF rules (Coraza) and domain lists across the entire fleet in one click.

## 🟣 Phase 5: Environment Orchestration
*Focus: From observability to environment management.*
- [ ] **Debugging Worksets**: Save and restore entire tab groups associated with a specific task (e.g., "Payment Gateway Refactor"). One-click environment launch.
- [ ] **Automated Service Routines**: Run health-checks or "warm-up" scripts in the Go core upon launching a workset.
- [ ] **Session Re-injection**: Automatically re-inject authentication headers or session tokens into new tabs based on previous captures.
- [ ] **Lab Snapshotting**: Export a full state (Database entries, captures, and open URLs) to share with other team members for bug reproduction.
- [ ] **Endpoint-Specific Monitoring**: Configuración de URLs críticas para monitoreo continuo de salud y performance con alertas visuales en tiempo real.
- [ ] **Performance History Data Persistence**: Almacenamiento de tendencias de latencia y status en DB para visualización de gráficas históricas y reportes de degradación.
- [ ] **Throughput & Peak Load Analysis**: Métricas de peticiones por minuto (RPM), detección de picos de carga y mapas de calor por endpoint crítico.
---
> [!TIP]
> This roadmap is designed to be modular ("Lego" style). Each phase builds upon the existing core (`straws-core`) without requiring a complete rewrite.
