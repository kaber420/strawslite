# Straws Light

**Straws Light** es una extensión de navegador ultraligera y segura diseñada para la redirección de tráfico web. A diferencia de otras soluciones que dependen de aplicaciones nativas o scripts externos (como Python), Straws Light funciona íntegramente dentro del navegador, ofreciendo una experiencia nativa, segura y fácil de usar.

## Características Principales

*   **Redirección Nativa:** Utiliza la API `declarativeNetRequest` de Chrome para interceptar y redirigir peticiones de red de forma eficiente y silenciosa.
*   **Sin Dependencias Externas:** No requiere la instalación de aplicaciones *host* nativas, procesos en segundo plano del sistema operativo ni intérpretes de Python. Todo el trabajo se realiza dentro del entorno aislado (*sandbox*) de la extensión.
*   **Gestión Integrada (Side Panel):** Cuenta con una interfaz de usuario integrada directamente en el panel lateral (Side Panel) del navegador, permitiendo una administración rápida y accesible de las reglas de redirección.
*   **Almacenamiento Local:** Las configuraciones y reglas se guardan de forma segura utilizando `chrome.storage.local`, garantizando que el usuario tenga control total sobre sus datos de enrutamiento.
*   **Interruptor Maestro (Master Switch):** Permite activar o desactivar rápidamente todas las redirecciones con un solo clic.

## Arquitectura

El proyecto está construido puramente con tecnologías web estándar (HTML, CSS y JavaScript) y las APIs nativas de extensiones de Chrome (Service Workers, Declarative Net Request, Storage, y Side Panel). 

*   `manifest.json`: Archivo de configuración que define los permisos necesarios (como `declarativeNetRequest`, `storage`, y `sidePanel`).
*   `background.js` (Service Worker): Se encarga de manejar la lógica de redirección, escuchar los cambios en el estado de las reglas y gestionar el ciclo de vida de la extensión.
*   `sidepanel.html` / `js/`: Interfaz de usuario donde se visualizan, añaden y eliminan las reglas de enrutamiento web (por ejemplo, mapear dominios hacia `127.0.0.1:8100`).

## Instalación (Modo Desarrollador)

Para instalar **Straws Light** en Chrome durante su desarrollo:

1.  Abre el navegador Chrome y ve a `chrome://extensions/`.
2.  Activa el **Modo de desarrollador** (Developer mode) en la esquina superior derecha.
3.  Haz clic en el botón **Cargar descomprimida** (Load unpacked).
4.  Selecciona la carpeta raíz del proyecto `strawslite`.
5.  Una vez cargada, puedes abrir el panel lateral de Straws Light haciendo clic en el icono de la extensión en la barra de herramientas.

## Permisos Requeridos

*   `declarativeNetRequest` / `declarativeNetRequestFeedback`: Para leer, bloquear o modificar de forma declarativa las peticiones de red.
*   `storage`: Para guardar las reglas de redirección en el almacenamiento local del navegador.
*   `sidePanel`: Para mostrar y gestionar la interfaz de usuario en el panel lateral del navegador.
*   `webRequest`: Para interceptación adicional y compatibilidad (según sea necesario).
*   `<all_urls>`: Permite a la extensión operar en cualquier página web para que las redirecciones funcionen correctamente en distintos orígenes.
