# Visión: Straws-Kiosk (Lockdown & Orchestration)

**Straws-Kiosk** es una variante especializada del ecosistema Straws diseñada para transformar cualquier hardware estándar en un terminal de acceso restringido (Kiosko) ultra-seguro. A diferencia de las versiones orientadas a desarrollo, **Straws-Kiosk** prioriza la **inmutabilidad del entorno** y el **aislamiento total** del usuario final.

## 1. El Motor Go como Núcleo Agnóstico
En esta arquitectura, el **Motor Go** central de Straws se mantiene "limpio" y agnóstico al propósito final. La potencia de **Straws-Kiosk** reside en una capa de **Complementos (Plugins) o Adaptadores Externos** que extienden las capacidades del motor sin mezclar lógicas de negocio o de sistema:

- **Arquitectura de Complementos:** El motor expone una interfaz (gRPC, Unix Sockets o Channels internos) a la que se conectan estos adaptadores.
- **Micro-Lógica Separada:** La lógica de "abrir ventanas", "detectar el OS" y "configurar firejail" vive exclusivamente en el adaptador. El motor solo recibe la orden de actuar como proxy una vez que el entorno está listo.

### 2. Adaptadores de Orquestación y División de Roles
La gestión de la interfaz se divide según el nivel de control necesario para mantener la seguridad:

- **El Adaptador/Motor (Gestión de Ventanas y Procesos):**
    - Es el responsable de **lanzar el proceso del navegador** con los flags de seguridad (`--kiosk`, `--private`).
    - Controla la **ventana principal** a nivel de sistema operativo (maximizar, asegurar que siempre esté al frente, manejar múltiples pantallas).
    - Si el proceso muere, el adaptador lo detecta y lo relanza.
- **La Extensión (Gestión de Pestañas y Navegación):**
    - Una vez que el navegador está abierto, la extensión toma el control de las **pestañas (tabs)**.
    - Puede abrir nuevas pestañas programáticamente, cerrarlas o redirigirlas según las reglas de negocio.
    - Controla el contenido interno de la ventana lanzada por el motor.

## 2. Setup Wizard (Script de Preparación)
Para facilitar el despliegue en flotas de terminales, se incluye un **Kiosk Setup Wizard** que realiza las tareas de bajo nivel:
- **Instalación de Dependencias:** Verifica y descarga `firejail` (Linux) o `sandboxie` (Windows) si no están presentes.
- **Generación de Perfiles Inmutables:** Crea perfiles de navegador optimizados, desactivando atajos de teclado peligrosos (F12, Ctrl+Shift+I, etc.) y menús de configuración.
- **Registro de Autoservicio:** Configura el motor para que arranque con el sistema (Daemon/Servicio) y vigile la salud del navegador ("Watchdog mode").

## 3. Endurecimiento del Navegador (Browser Hardening)
Para asegurar que el usuario no pueda "escapar" del kiosko, Straws-Kiosk aplica una estrategia de **Hardening por Políticas**, ya que las extensiones tienen límites técnicos (no pueden deshabilitar las DevTools o la barra de URL por sí solas):

- **Políticas Empresariales (Managed Policies):** El **Setup Wizard** del motor Go escribe automáticamente los archivos de política (`policies.json` en Firefox o Llaves de Registro en Chrome/Edge) antes del lanzamiento. Esto permite:
    - Deshabilitar las **Herramientas de Desarrollador (F12)** de forma absoluta.
    - Ocultar la barra de direcciones y botones de navegación nativos.
    - Bloquear la instalación de otras extensiones y el acceso a `about:config` o `chrome://settings`.
- **Efecto de Doble Capa:** Mientras las Políticas bloquean el **esqueleto** del navegador, la **Extensión de Straws** bloquea la **interacción** dentro de la web (menús contextuales, atajos de teclado específicos y filtrado de contenido).

## 4. El "Doble Muro" de Seguridad (WAF Integration)
Para una protección de grado militar, Straws-Kiosk implementa una estrategia de **Doble Bloqueo** que combina la velocidad del navegador con la inteligencia del motor Go:

- **Muro 1: El Navegador (Filtro Rápido):** La extensión actúa como la primera línea de defensa, realizando redirecciones y bloqueos de dominios conocidos instantáneamente.
- **Muro 2: El Motor + Coraza WAF (Inspección Profunda):** El motor Go intercepta la petición y aplica reglas de **OWASP CRS** mediante **Coraza**, detectando ataques complejos (SQLi, XSS) en tiempo real.

## 5. Comando y Control (C2) vía mTLS Reverse Tunnel
Para la gestión de flotas de kioskos, el motor inicia un **túnel inverso persistente** hacia el servidor central:
- **Seguridad mTLS (Mutual TLS):** Tanto el cliente (Kiosko) como el servidor deben presentar certificados válidos para establecer la conexión. Esto elimina la necesidad de contraseñas y protege contra ataques de suplantación.
- **Canal Unificado:** Por este túnel viajan las órdenes de administración (reinicio, actualización de reglas), los "Heartbeats" de salud y el flujo de logs de red de forma ultra-segura.

## 6. Filosofía: Mismo Motor, Diferente Propósito
Straws-Kiosk no es una reescritura, sino una **configuración restrictiva certificada**:
- **Núcleo Compartido:** Aprovecha las capacidades de proxy, interceptación y redirección de `straws-core`.
- **Modo "Hardened":** Al compilar como `straws-kiosk`, el motor activa por defecto el WAF, el túnel mTLS y las políticas de bloqueo estricto ("Deny All by Default").

---

> [!TIP]
> La combinación de **Coraza** + **Straws-Kiosk** convierte a cualquier terminal en un dispositivo con seguridad perimetral integrada, ideal para entornos de alta confianza como bancos, terminales de pago o infraestructuras críticas.
