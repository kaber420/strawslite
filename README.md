# 🥤 StrawsLite: Diagnóstico de Red Local de Alto Rendimiento (v1.0)

**StrawsLite** es una extensión de navegador profesional diseñada para la **redirección, intercepción y observabilidad** de tráfico web. Está optimizada para el flujo de trabajo individual del desarrollador, permitiendo un control total del tráfico local sin tocar la configuración de red del sistema.

## 🚀 Innovación: Motor Local vía Native Messaging

StrawsLite utiliza un **Motor Go** local que se comunica con el navegador mediante **Native Messaging**, ofreciendo una latencia casi nula y una potencia de procesamiento inalcanzable para extensiones convencionales:

- **Sin Interferencia de Red**: No toca `etc/hosts`, Pi-hole o Proxies del sistema. Las reglas se aplican quirúrgicamente dentro de TU navegador.
- **Privacidad Total**: Todo el procesamiento ocurre en tu máquina. El tráfico nunca sale de tu entorno local hacia servicios de terceros.
- **Despacho Inteligente**: Combina **DNR (Declarative Net Request)** y **PAC (Proxy Auto-Configuration)** dinámico para una gestión de tráfico transparente y ultra-rápida.

## Características Principales

*   **Redirección de Grado Profesional:** Intercepta y redirige peticiones de forma eficiente y silenciosa.
*   **Live Dashboard:** Interfaz integrada para visualizar qué está pasando con tus peticiones en tiempo real.
*   **Sirenas Visuales (Experimental):** Posibilidad de marcar pestañas con errores o latencia mediante bordes visuales.
*   **Arquitectura de Motor Propio**: Escala tus capacidades de diagnóstico conectando la extensión a un binario externo para análisis avanzado.

## El Ecosistema Straws (Lite vs Pro)

Straws está diseñado de forma modular para crecer con tus necesidades.

- **StrawsLite**: La versión gratuita y de código abierto para desarrolladores. Foco 100% en el **entorno local y diagnóstico personal**.
- **StrawsPro**: La solución de grado empresarial para **equipos de desarrollo**. Permite la colaboración en reglas de red, observabilidad compartida y escalamiento de configuraciones en toda la organización bajo licencia **AGPL v3**.

## Instalación (Modo Desarrollador)

Para instalar **StrawsLite** en Chrome/Firefox durante su desarrollo:

1.  Abre el navegador y ve a la página de extensiones (`chrome://extensions/` o `about:debugging`).
2.  Activa el **Modo de desarrollador**.
3.  Haz clic en **Cargar descomprimida** (o "Load Temporary Add-on")(proximamente en la store de firefox).
4.  Selecciona la carpeta raíz del proyecto.

## Permisos Requeridos

*   `nativeMessaging`: Para la comunicación de alta velocidad con el motor local.
*   `declarativeNetRequest`: Para redirección de alto rendimiento.
*   `proxy`: Para el despacho inteligente vía PAC.
*   `storage`: Para persistencia local de reglas.

---
**Potencia de red profesional en tu entorno local.** 🚨🚀
