# Leaf Capabilities Sheet: Mozilla Firefox

This sheet tracks the native APIs available in Firefox to power the "Behavioral Profile" of Straws Leaves. Use this to maximize "Manual Transmission" observation.

## 1. Tab State & Lifecycle (`browser.tabs`)
Firefox provides granular events for tab health and media status that are highly reliable.

| Property | Event / Usage | Significance |
| :--- | :--- | :--- |
| `audible` | `onUpdated` | Real-time detection of noise-producing leaves/tabs. |
| `mutedInfo` | `onUpdated` | Detects if the leaf is forcibly silenced by the user. |
| `discarded` | `onUpdated` | Detects if Firefox RAM-management has suspended the leaf. |
| `attention` | `onUpdated` | Detects if the tab is demanding visual user attention (flashing). |
| `pinned` | `onUpdated` | Monitoring priority status of the leaf. |

## 2. Runtime & Engine Info
| API | Data Points |
| :--- | :--- |
| `browser.runtime.getBrowserInfo` | `name`, `version`, `buildID` (Essential for telemetry versioning). |
| `browser.sessions` | `setTabValue` (Store persistent straw-id even if the tab is refreshed or restored). |

## 3. Proxy & DNS Level Logic
| Feature | Description |
| :--- | :--- |
| `proxy.onRequest` | Granular filter-based proxying (More flexible than Chrome's static PAC). |

## 4. Privacy & Tracking
| API | Usage |
| :--- | :--- |
| `browser.contentScripts` | Register/Unregister "probes" dynamically based on domain activity. |

## Research & TODO
- [ ] Test `browser.tabs.onUpdated` latency for `audible` events.
- [ ] Map "Container Tabs" (User Context IDs) to separate leaf identities.
- [ ] Prototipar perfil de Firefox efímero via `--profile` CLI para aislar sesiones Leaf sin conflicto de cookies.
- [ ] Investigar `browser.userScripts` API (MV3 Firefox) para inyectar payloads sin `content_scripts` estáticos.

---

## 5. Perfiles Aislados de Firefox (Profile Isolation)
> **Idea principal:** En vez de compartir un único perfil del usuario, lanzar cada instancia de Leaf con su propio perfil de Firefox efímero o persistente. Esto elimina contaminación de cookies, caché, historial y sessions entre diferentes sesiones de intercepción.

| Técnica | Mecánica | Beneficio |
| :--- | :--- | :--- |
| `--profile /tmp/straws-leaf-{id}` | Flag CLI al lanzar Firefox. Straws Go Engine lo genera al crear la Leaf. | Sesiones 100% aisladas. Cookies de Facebook-A no tocan Facebook-B. |
| `--no-remote` | Flag CLI. Impide que Firefox reutilice una ventana existente. | Múltiples instancias reales de Firefox corriendo simultáneamente. |
| Perfil efímero (`mktemp -d`) | El motor borra el directorio al cerrar la Leaf. | Zero footprint. No queda rastro en disco. |
| Perfil persistente nombrado (`straws-profiles/{leafId}/`) | El motor guarda el directorio entre sesiones. | Reutilizar cookies/login de una Leaf de larga duración. `→ ref. roadmap_rules.md §Fase 1: Perfiles` |
| `user.js` pre-configurado | Archivo puesto en el perfil antes de lanzar Firefox. Ajusta prefs: DoH, proxy, telemetría off. | Control total sobre el navegador sin tocar extensiones del usuario. |

**Flujo propuesto (Go Engine):**
```
1. straws engine recibe cmd: "open_leaf --id=leaf-42 --persistent=false"
2. Crea directorio: /tmp/straws-leaf-42/
3. Copia user.js base (proxy=5783, DoH=on, telemetry=off)
4. Ejecuta: firefox --profile /tmp/straws-leaf-42 --no-remote --url "about:blank"
5. Extension detecta nueva pestaña → registra leaf-42 vía Native Messaging
6. Al cerrar: borra /tmp/straws-leaf-42/ si efímero, o archiva si persistente
```

---

## 6. DNS de Firefox: Explotación Profunda (`browser.dns`)
> **Firefox-exclusivo.** Chrome no expone esta API a extensiones. Es una ventaja estructural única de Firefox.
> `→ ref. §3 Proxy & DNS Level Logic` — esta sección extiende el punto `browser.dns` ya listado.

| Capacidad | API / Método | Aplicación en Straws |
| :--- | :--- | :--- |
| Resolución manual | `browser.dns.resolve(hostname, flags)` | Pre-resolver dominios antes de que el proxy los intercepte. Detectar si un dominio resuelve a IP privada (intranet). |
| Flag `"disable_trr"` | `resolve(host, ["disable_trr"])` | Forzar DNS clásico (sin DoH) para un dominio específico en una regla Leaf, útil para intranets. |
| Flag `"offline"` | `resolve(host, ["offline"])` | Consultar solo la caché DNS local. Detector de dominios ya visitados sin hacer nueva petición. |
| Flag `"fresh"` | `resolve(host, ["fresh"])` | Bypassear caché y obtener el TTL real. Detección de DNS hijacking o CDN changes. |
| Detección de DoH activo | Comparar IPs de `disable_trr` vs sin flag | Si difieren, el ISP intercepta DNS → alertar al usuario o cambiar comportamiento de la regla. |
| Correlación IP ↔ Regla | Resolver destinos de reglas activas | Saber a qué datacenter/CDN apunta cada dominio interceptado. Útil para fingerprinting de infraestructura. |

---

## 7. Container Tabs (Contextual Identities) — Integración Completa
> **Firefox-exclusivo.** Separación de identidades a nivel de motor de red sin necesidad de perfiles separados. Más ligero que §5 pero menos aislado a nivel de proceso.
> `→ ref. §5 Perfiles Aislados` — Containers son la alternativa liviana. Usar §5 cuando se necesite aislamiento de proceso completo, Containers cuando solo se necesite aislamiento de cookies/storage.
> `→ ref. Research & TODO` — "Map Container Tabs to separate leaf identities" ya marcado como pendiente.

| API | Método | Uso en Straws |
| :--- | :--- | :--- |
| `browser.contextualIdentities` | `create({name, color, icon})` | Crear un "Container" por cada Leaf o grupo de Leaves. Cookies y storage aislados automáticamente. |
| | `query({})` | Listar containers activos para mostrar en el dashboard de Straws. |
| | `remove(cookieStoreId)` | Destruir container al cerrar una sesión Leaf → limpieza automática. |
| `browser.tabs` + `cookieStoreId` | `create({cookieStoreId})` | Abrir una tab dentro de un Container específico. La regla sabe qué container usa. |
| Mapeo Leaf ↔ Container | `tab.cookieStoreId` en `onUpdated` | Identificar a qué Leaf pertenece cada petición de red. |

**Caso de uso: Múltiples cuentas simultáneas**
```
Container "Straws-leaf-A" → Facebook cuenta 1 (cookies aisladas)
Container "Straws-leaf-B" → Facebook cuenta 2 (cookies aisladas)
Ambos en la misma ventana de Firefox, sin --no-remote, sin perfiles separados.
```

---

## 8. Storage Partitioning & Total Cookie Protection
> Firefox implementa **Total Cookie Protection** (TCP). Straws puede aprovechar o trabajar alrededor de esto.

| Concepto | Detalle | Aplicación Straws |
| :--- | :--- | :--- |
| Total Cookie Protection | Cada sitio tiene su propio "jar" de cookies aislado por first-party domain. | Las reglas que reescriben `Origin`/`Referer` deben considerar en qué partición caerán las cookies resultantes. |
| `browser.cookies` + `partitionKey` | API para leer cookies dentro de una partición específica. | Straws puede exportar/importar cookies de una Leaf a otra usando `partitionKey` explícito. |
| `firstPartyDomain` param | `browser.cookies.getAll({firstPartyDomain: "fb.com"})` | Obtener solo las cookies de una sesión sin mezclar con otras. Útil para "State Snapshot" de una Leaf. |
| Evasión de tracking via iframe | Con TCP, iframes de terceros no comparten cookies con el parent. | Si Straws inyecta iframes para telemetría, deben estar en el mismo dominio o dentro de un Container (`→ ref. §7`). |

---

## 9. Service Workers como Sondas Silenciosas
> Los Service Workers interceptan peticiones de red **antes** de que salgan del navegador, incluso antes de que el proxy de Straws las vea.
> `→ ref. §4 Privacy & Tracking` — requiere permiso `contentScripts` para el dominio objetivo.

| Capacidad | Descripción | Aplicación Straws |
| :--- | :--- | :--- |
| `FetchEvent` intercept | El SW captura toda petición del origen registrado. | Inyectar un SW en dominios de interés para loggear URLs, payloads, headers desde adentro del browser — antes del proxy. |
| Offline cache control | El SW puede servir respuestas desde caché aunque no haya red. | Simular respuestas de API para testing sin tráfico real. |
| Push Notifications interception | `PushEvent` en el SW. | Detectar si un sitio envía push notifications silenciosas (tracking). |
| Background Sync | `SyncEvent` | Detectar intentos de sitios de sincronizar datos cuando el usuario vuelve a estar online (exfiltración diferida). |
| Reporte al background.js | `runtime.sendMessage` desde el SW | El SW registrado por Straws reporta eventos de red al background.js de la extensión en tiempo real. |

---

## 10. `browser.userScripts` API (Firefox MV3)
> Equivalente a Tampermonkey pero controlado programáticamente por Straws. **Firefox-exclusivo en MV3.**
> `→ ref. §4 Privacy & Tracking` — `browser.contentScripts` ya listado; `userScripts` es la evolución MV3 con más poder.
> `→ ref. roadmap_rules.md §Fase 1` — los scripts inyectados pueden ser parte de un "Escenario" (perfil de reglas).

| Capacidad | Método | Uso en Straws |
| :--- | :--- | :--- |
| Registro dinámico de scripts | `browser.userScripts.register({matches, js, runAt})` | Inyectar script de observación en cualquier dominio sin declararlo estáticamente en `manifest.json`. Activar/desactivar según la Leaf Rule activa. |
| `runAt: "document_start"` | Antes de que el DOM se construya. | Hookear `XMLHttpRequest.prototype.open` y `fetch` para capturar requests antes de que salgan. |
| `runAt: "document_idle"` | Después de que el DOM esté listo. | Extraer datos de la página (precios, inventarios, contenido) como payload de la Leaf. |
| World: `MAIN` | El script corre en el contexto JS de la página. | Acceder a variables globales de la app (tokens, user objects) no visibles desde el contexto de extensión. |
| Desregistro por regla | `userScripts.getScripts()` + `script.unregister()` | Al desactivar una Leaf Rule, limpiar todos los scripts asociados automáticamente. |

---

## 11. Automatización Firefox via Marionette / CDP / WebDriver BiDi
> Firefox expone protocolos de automatización que el Go Engine puede explotar directamente, sin depender de la extensión.
> `→ ref. §5 Perfiles Aislados` — el flag `--profile` se combina con `--marionette` para control total del perfil efímero.

| Protocolo | Activación | Uso en Straws Go Engine |
| :--- | :--- | :--- |
| **Marionette** (nativo Firefox) | `firefox --marionette` | El motor Go se conecta al puerto Marionette (2828) y controla Firefox: abrir tabs, navegar, extraer DOM, inyectar JS. |
| **CDP** (Chrome DevTools Protocol) | `firefox --remote-debugging-port=9229` | Firefox soporta CDP desde v86+. El motor Go obtiene Network events, Console logs, Performance metrics de cada Leaf sin extensión. |
| **WebDriver BiDi** | Nuevo protocolo W3C, ya en Firefox stable | Bidireccional: el motor Go se suscribe a eventos de red en tiempo real (vs polling). Reemplazará a CDP. |
| Launch control total | `exec: firefox --marionette --profile /tmp/leaf-42 --no-remote` | Go Engine controla el ciclo de vida completo: abrir, navegar, capturar, cerrar. Sin depender de que el usuario tenga la extensión instalada. |

---

## 12. `proxy.onRequest` Avanzado: Decisiones Dinámicas en Runtime
> Extiende e implementa en detalle el punto ya listado en §3.
> `→ ref. §3 Proxy & DNS Level Logic` — esta sección es la implementación avanzada de `proxy.onRequest`.

| Feature | Código Conceptual | Beneficio |
| :--- | :--- | :--- |
| Proxy per-request dinámico | `return {type:"http", host: getProxyForLeaf(req.url)}` | Cada Leaf puede tener su propio proxy upstream diferente, decidido en runtime sin recargar reglas. |
| Bypass selectivo | `return {type:"direct"}` para CDN assets | Evitar proxear imágenes/fonts → mejora de performance, evita saturar el engine. |
| Auth proxy upstream | `return {type:"http", host, port, proxyAuthorizationHeader: "Basic ..."}` | Soporte de proxies upstream autenticados para rotación de IPs. |
| Failover automático | Try proxy A → si timeout → `return {type:"direct"}` | Resiliencia sin intervención del usuario. |
| Logging de decisiones | Enviar via Native Messaging cada decisión al motor Go | El Go Engine tiene visibilidad completa de qué tráfico se proxea, qué se bypassea y por qué. |

---

## 13. WebDriver BiDi — Catálogo Completo para Straws Go Engine
> **Protocolo W3C estándar.** Firefox es el browser con implementación más avanzada y es su apuesta principal (vs CDP que es secundario en Firefox).
> `→ ref. §11 Automatización Firefox` — BiDi es la evolución natural de CDP para Firefox.
> **Activación:** `firefox --remote-debugging-port=9229` (activa BiDi + CDP simultáneamente).
> **Conexión Go:** `ws://localhost:9229/session` con handshake WebSocket BiDi estándar.

---

### 13.1 Network Module — Observabilidad e Interceptación Total

> El módulo más relevante para Straws. Opera a nivel de browser, por tab, con filtros por URL y por contexto (Leaf).

#### Eventos de Observación (Solo Lectura)

| Evento | Payload clave | Aplicación en Straws |
| :--- | :--- | :--- |
| `network.beforeRequestSent` | URL, method, headers, body, `context` (= browsingContext de la tab), `initiator` (script/user/prefetch/parser), timestamp, `redirectCount` | Captura de requests por tab — complementa o reemplaza el proxy. El campo `context` correlaciona directamente con Leaf ID. Detectar quién inició el request (usuario vs script). |
| `network.responseStarted` | Status code, headers de respuesta, `context`, timing TTFB, `fromCache` | Detectar headers de seguridad ausentes (`CSP`, `HSTS`, `XFO`, `X-Frame-Options`) → **Security Scanners del roadmap**. |
| `network.responseCompleted` | Status, headers completos, **`serverIPAddress`** (IP real del servidor), **`protocol`** (`http/1.1`/`h2`/`h3`), `bodySize`, timing completo, `fromCache` | **Cross-Browser Server Mapping del roadmap** — IP + protocolo exactos. Latencia real por request. |
| `network.fetchError` | `errorText`, URL, `context`, timestamp | Detectar requests fallidos silenciosos que el usuario no ve. Monitoreo de salud. |
| `network.authRequired` | Auth challenge type (`Basic`/`Digest`/`NTLM`), URL, `context` | Detectar flows de autenticación. Base para credential injection automática. |

#### Comandos de Interceptación Activa (Lectura + Escritura)

| Comando | Parámetros | Aplicación en Straws |
| :--- | :--- | :--- |
| `network.addIntercept` | `phases` (`beforeRequestSent`/`responseStarted`/`authRequired`), `urlPatterns`, `contexts` (lista de browsingContextIds) | Activar interceptación por dominio y por Leaf. **Filtros per-Leaf**: solo intercepta tráfico de una tab específica. |
| `network.removeIntercept` | `interceptId` | Desactivar interceptación de una regla sin reiniciar Firefox. |
| `network.continueRequest` | `request`, `url?`, `method?`, `headers?`, `body?`, `cookies?` | Reenviar request modificando cualquier campo. **Edit & Resend del roadmap** — reescribir headers, body, URL, cookies. |
| `network.continueResponse` | `request`, `statusCode?`, `reasonPhrase?`, `headers?`, `body?`, `cookies?` | Modificar la **respuesta** antes de que llegue al browser. Parchear body, inyectar headers CSP, strip de trackers. |
| `network.provideResponse` | `request`, `statusCode`, `reasonPhrase`, `headers`, `body` | Responder completamente desde el engine sin tocar el servidor real. **Mock de APIs**. Simular respuestas offline. |
| `network.failRequest` | `request`, `errorCode` (`net::ERR_BLOCKED_BY_CLIENT`, etc.) | Bloquear request con error específico. **WAF rules** y bloqueo de dominios. |
| `network.continueWithAuth` | `request`, `action` (`provideCredentials`/`cancel`), `credentials?` | Responder auto a challenges de auth. Proxy auth injection transparente. |

#### Filtros granulares en `addIntercept`

```json
{
  "urlPatterns": [
    {"type": "string", "pattern": "https://api.ejemplo.com/*"},
    {"type": "pattern", "protocol": "https", "hostname": "*.stripe.com", "pathname": "/v1/*"}
  ],
  "contexts": ["<browsingContextId-de-leaf-A>"],
  "phases": ["beforeRequestSent", "responseStarted"]
}
```
> Filtrar por `contexts` permite interceptar **solo el tráfico de una Leaf específica**, ignorando el resto de Firefox.

---

### 13.2 BrowsingContext Module — Control Completo de Ventanas y Tabs

> Equivalente a `chrome.tabs` + `chrome.windows` + `chrome.webNavigation` pero desde Go Engine directamente, sin extensión.

#### Comandos

| Comando | Parámetros | Aplicación en Straws |
| :--- | :--- | :--- |
| `browsingContext.getTree` | `root?` (context específico o todos), `maxDepth?` | Árbol completo: UserContext (container) → ventana → tabs → iframes. **Base del grouping jerárquico de Leaves**. |
| `browsingContext.create` | `type: "tab"\|"window"`, `userContext?` (container ID), `referenceContext?` | Abrir nuevas Leaves desde el engine. Asigna container al crearla. **Debugging Worksets**. |
| `browsingContext.close` | `context`, `promptUnload?` | Cerrar una Leaf programáticamente. |
| `browsingContext.navigate` | `context`, `url`, `wait: "none"\|"interactive"\|"complete"` | Navegar a URL con await de carga completa. Base de **Automated Service Routines**. |
| `browsingContext.reload` | `context`, `ignoreCache?` | Hard reload de una Leaf sin cache. |
| `browsingContext.activate` | `context` | Enfocar/traer al frente una tab específica. |
| `browsingContext.captureScreenshot` | `context`, `format?` (`png`/`jpeg`), `quality?`, `clip?` (región exacta en px) | Screenshot por tab. **Lab Snapshotting** visual. |
| `browsingContext.print` | `context`, opciones PDF (margins, scale, orientation) | Exportar Leaf como PDF. |
| `browsingContext.setViewport` | `context`, `width`, `height`, `devicePixelRatio?` | Simular resoluciones distintas por Leaf (mobile/tablet/desktop). |
| `browsingContext.traverseHistory` | `context`, `delta` (+1/-1/N) | Navegar historial de la tab: atrás, adelante, N pasos. |
| `browsingContext.handleUserPrompt` | `context`, `accept: bool`, `userText?` | Responder automáticamente a alerts, confirms y prompts del browser. |

#### Eventos

| Evento | Datos | Aplicación en Straws |
| :--- | :--- | :--- |
| `browsingContext.contextCreated` | ID, URL, título, `parent` context, `userContext` (container) | Detectar apertura de nuevas tabs/iframes en tiempo real. Registrar nueva Leaf. |
| `browsingContext.contextDestroyed` | ID, `userContext` | Detectar cierre de Leaf → limpiar recursos, cerrar container si efímero. |
| `browsingContext.navigationStarted` | URL destino, `context`, timestamp | Inicio de navegación → waterfall timing start. |
| `browsingContext.fragmentNavigated` | URL nueva (solo fragment), `context` | SPA navigation detection (cambios de `#hash` sin reload). |
| `browsingContext.domContentLoaded` | `context`, timestamp, `url` actual | DOM listo → marker de performance intermedio. |
| `browsingContext.load` | `context`, timestamp, `url` | Página completamente cargada → **latencia total real por Leaf**. |
| `browsingContext.downloadWillBegin` | URL, sugerencia de nombre de archivo | Detectar descargas iniciadas desde una Leaf. |
| `browsingContext.userPromptOpened` | `type` (`alert`/`confirm`/`prompt`/`beforeunload`), `message`, `context` | Detectar/capturar popups del browser sin intervención del usuario. |
| `browsingContext.userPromptClosed` | `context`, `accepted`, `userText?` | Saber cómo fue respondido el popup. |

---

### 13.3 Script Module — Ejecución e Instrumentación JS por Tab

> Ejecutar e inyectar JS dentro del contexto de cualquier tab directamente desde el Go Engine. Sin extensión necesaria.

| Comando / Evento | Aplicación en Straws |
| :--- | :--- |
| `script.evaluate` en `context` específico | Obtener `performance.memory.usedJSHeapSize` (RAM JS por tab). Extraer tokens, IDs de sesión, estado interno de la app. |
| `script.callFunction` | Llamar funciones JS del sitio con argumentos controlados desde Go. |
| `script.addPreloadScript` | Inyectar script **antes de que la página cargue** — hookear `fetch`, `XMLHttpRequest`, `WebSocket` para captura pre-proxy. Monitoring invisible para el sitio. |
| `script.removePreloadScript` | Desactivar monitor al cerrar Leaf Rule. Cleanup limpio. |
| `script.getRealms` | Listar todos los iframes, workers y contextos JS dentro de una tab. Detectar iframes de tracking ocultos. |
| `script.message` event | Canal bidireccional: script inyectado → Go Engine en tiempo real vía `channel.send(...)`. Sin polling. |
| `script.realmCreated` event | Detectar cuando un nuevo iframe/worker nuevo aparece en la tab (lazy loading de trackers). |
| `script.realmDestroyed` event | Detectar destrucción de contextos JS. Cleanup de hooks. |

#### Métricas JS obtenibles vía `script.evaluate`

```js
// RAM del heap JS — por tab
performance.memory.usedJSHeapSize       // bytes en uso actual
performance.memory.totalJSHeapSize      // bytes asignados al heap
performance.memory.jsHeapSizeLimit      // límite máximo del proceso

// Tiempo total de carga
performance.timing.loadEventEnd - performance.timing.navigationStart

// Recursos cargados (scripts, CSS, imágenes, XHR, fetch)
performance.getEntriesByType('resource').map(r => ({
  name: r.name,
  duration: r.duration,
  transferSize: r.transferSize,
  initiatorType: r.initiatorType
}))

// Métricas de navegación (TTFB, DOMContentLoaded, etc.)
performance.getEntriesByType('navigation')[0]

// Long Tasks — janks de UI > 50ms (freezes del browser)
performance.getEntriesByType('longtask')

// Web Vitals (LCP, FID, CLS) — si el sitio los reporta
new PerformanceObserver(list => list.getEntries()).observe({type: 'largest-contentful-paint'})
```

---

### 13.4 Log Module — Consola Completa por Tab

| Evento | Datos | Aplicación en Straws |
| :--- | :--- | :--- |
| `log.entryAdded` | `level` (`debug`/`info`/`warn`/`error`), `text`, `context` (tab), `stackTrace` completo, `source` (`javascript`/`network`/`console-api`), timestamp | Capturar errores JS de una Leaf. Detectar logs que exponen tokens, IDs o datos internos → **Credential Guard**. Debugging de aplicaciones sin DevTools abierto. |

> Combinado con `script.addPreloadScript` que hookea `console.*`, obtienes captura total incluso de logs que el sitio borra (`console.clear()`).

---

### 13.5 Storage Module — Estado Completo por Tab/Container

| Comando | Parámetros clave | Aplicación en Straws |
| :--- | :--- | :--- |
| `storage.getCookies` | `filter: {domain?, name?, path?, value?, sameSite?, secure?}`, `partition: {userContext?, sourceOrigin?}` | Exportar cookies de una Leaf para **Session Re-injection** (Roadmap Phase 5). Snapshot de sesión antes de cerrar. |
| `storage.setCookie` | `cookie: {name, value, domain, path, expires, httpOnly, secure, sameSite}`, `partition` | Inyectar cookies de sesión en una nueva Leaf. Restaurar login automáticamente al abrir un Workset. |
| `storage.deleteCookies` | `filter`, `partition` | Limpiar sesión al cerrar una Leaf. Zero-footprint mode (`→ ref. §5`). |

> El campo `partition.userContext` corresponde al **Container ID** de Firefox (`→ ref. §7`). Acceso granular por container sin mezclar sesiones.

---

### 13.6 Input Module — Automatización de Interacciones Humanas

| Comando | Aplicación en Straws |
| :--- | :--- |
| `input.performActions` | Simular clicks, typing, scroll, drag-and-drop, teclas de teclado en una Leaf específica. **Automated Service Routines** (Roadmap Phase 5): warm-up scripts, health-checks de login, fill de formularios. |
| `input.releaseActions` | Liberar todos los inputs activos (botones, teclas presionadas). Cleanup tras automatización. |

---

### 13.7 Permissions Module — Control de Permisos por Tab

| Comando | Aplicación en Straws |
| :--- | :--- |
| `permissions.setPermission` por `context` y `origin` | Conceder o denegar permisos (cámara, micrófono, notificaciones, geolocalización, clipboard) a una Leaf específica programáticamente, sin popups de usuario. Ideal para Leaves de testing que necesitan permisos sin interacción. |

---

### 13.8 UserContext Module — Containers como Primera Clase (Firefox-exclusivo en BiDi)

> **Firefox-exclusivo.** Los `UserContexts` de BiDi corresponden exactamente a Container Tabs (`→ ref. §7`). BiDi los expone como ciudadanos de primera clase del protocolo.

| Comando | Datos | Aplicación en Straws |
| :--- | :--- | :--- |
| `browser.createUserContext` | Retorna `userContextId` único | Crear Container desde el engine sin extensión. No requiere `browser.contextualIdentities`. |
| `browser.removeUserContext` | `userContextId` | Destruir container y **todas sus tabs automáticamente** al cerrar Leaf session. Cleanup completo. |
| `browser.getUserContexts` | Lista de todos los contexts activos con IDs | Listado completo de containers para el dashboard de Straws. |
| `browsingContext.create` + `userContext` | Combinar con §13.2 | Abrir nueva tab dentro de un container específico desde Go Engine. Pipeline completo sin extensión. |

---

### 13.9 Mapa BiDi → Roadmap Straws

| Ítem del Roadmap | Fase | Módulo BiDi | Factibilidad |
| :--- | :--- | :--- | :--- |
| **Cross-Browser Server Mapping** | Phase 1 | `network.responseCompleted` → `serverIPAddress` + `protocol` | ✅ Directo, un evento |
| **Low-Level Resource Tracking** | Phase 1 | `script.evaluate` → `performance.memory` por context | ✅ JS heap por tab |
| **Active Interception (Edit & Resend)** | Phase 2 | `network.addIntercept` + `network.continueRequest/Response` | ✅ Completo |
| **Global Search & Filter** | Phase 2 | `network.beforeRequestSent` buffering + `script.evaluate` | ✅ Datos ya disponibles |
| **Security Scanners (CSP/HSTS/XFO)** | Phase 3 | `network.responseStarted` → analizar headers automáticamente | ✅ Directo |
| **Credential Guard** | Phase 3 | `network.beforeRequestSent` (headers/URLs) + `log.entryAdded` | ✅ Doble cobertura |
| **SSL/TLS Handshake Inspector** | Phase 3 | `network.responseCompleted` → `protocol` + headers TLS | ⚠️ Parcial (BiDi no expone ciphers directamente) |
| **Fingerprinting (Request DNA)** | Phase 3 | `network.beforeRequestSent` → firma de headers por tab | ✅ Directo |
| **Debugging Worksets** | Phase 5 | `browsingContext.getTree` + `browsingContext.navigate` + `storage.getCookies` | ✅ Snapshot + restore completo |
| **Automated Service Routines** | Phase 5 | `input.performActions` + `script.evaluate` + `browsingContext.navigate` | ✅ Scriptable |
| **Session Re-injection** | Phase 5 | `storage.setCookie` con `partition.userContext` | ✅ Por container |
| **Lab Snapshotting** | Phase 5 | `storage.getCookies` + `browsingContext.getTree` + `browsingContext.captureScreenshot` | ✅ Exportable |
| **Endpoint-Specific Monitoring** | Phase 5 | `network.addIntercept` con `urlPatterns` específicos + `network.responseCompleted` | ✅ Por URL exacta |
| **Jerarquía de Leaves** | Nueva | `browser.getUserContexts` + `browsingContext.getTree` | ✅ Estructura nativa disponible |

---

## 14. Estrategia de Métricas de Sistema (Zero-JS)
> **Decisión de Arquitectura:** Se descarta el uso de scripts de BiDi (`performance.memory`) para obtener RAM del heap.
> **Razón:** Mantener la integridad de seguridad (CORS/COOP/CSP) del sitio observado y evitar el "downgrading" de cabeceras.

**Flujo de Trabajo Unificado:**
1.  **Chrome**: La extensión obtiene el PID real de la pestaña vía `chrome.processes.getProcessIdForTab(tabId)`.
2.  **Firefox**: El motor Go obtiene el PID del proceso hijo (content process) mapeando el `browsingContext` de BiDi al árbol de procesos del OS.
3.  **Captura**: El motor Go usa `gopsutil(PID)` para leer RAM RSS (física), CPU e I/O directamente del Kernel.

**Ventajas:**
- **Invisibilidad**: El sitio no puede detectar que está siendo medido.
- **Seguridad**: No se inyecta JS ni se modifican políticas de seguridad.
- **Precisión**: Datos reales del sistema operativo, no solo del motor JS.
