# Plan Detallado: Global Search & Filter

## Objetivo
Implementar un sistema de filtrado avanzado y búsqueda de alta velocidad sin bloqueo de memoria ("Debounced, No-blocking search"). Debe actuar sobre campos profundos (Deep-Search) de cada solicitud almacenada en la sesión del cliente (Frontend). 

## 1. Diseño de UI / Frontend (La Barra Omnipotente)

- **Input Principal ("Omnibox" Search):**
  - Barra superior destacada en el Cyber-Dashboard del Inspector.
  - Un diseño intuitivo de barra unificada (al estilo Slack / Github) donde los strings puros buscan globalmente, pero admite comandos de texto específicos (Syntax sugerido más abajo).
- **Panel Lateral de Filtros (Faceted Search):**
  - Opciones como casillas de chequeo (checkboxs), sliders, y drop-downs.
  - Filtrado común: 
    - Métodos (GET, POST...)
    - Rangos de Tipos de Archivos / Respuestas: `XHR`, `Images`, `Media`, `CSS`, `JS`, `Document`.
    - Status Code (`1xx`, `2xx`, `3xx`, `4xx`, `5xx`).

## 2. El Motor de Deep-Search en JavaScript

Dado el potencial peligro de bloqueo de CPU en la tab al hacer búsquedas en grandes payloads o en miles de trazas almacenadas en la variable estado, es crítico el nivel de eficiencia.

- **Patrón Debounce y Memoización:**
  - Implementar una función `debounce` que espere a que el usuario deje de tipear ~350 milisegundos para no redibujar el state a medias.
- **Sintaxis de Búsqueda de Control:**
  - **Búsqueda Global (Fallback default):** Si solo se pone "usuario123", hace búsqueda *sub-string* en URL y JSON Stringify de Request + Response body.
  - **Búsqueda Parametrizada (Opcional, Nivel Pro):** 
    - `req.headers: Authorization` (Buscar donde exista "authorization" en Request Header Keys).
    - `res.status: 404`
    - `req.method: POST`
    - `url: /auth`
- **Tácticas de Rendimiento (Web API & Workers):**
  - Las colecciones menores a 1000 requests pueden tratarse en un hook `useMemo` o función nativa de JavaScript síncrona en el hilo principal del DOM.
  - *Ruta a la expansión:* Si la traza guarda Megabytes de data (Response bodies de gigantestos JSON), la búsqueda global necesitará moverse a un `WebWorker` dedicado o generar fragmentos de búsqueda indexados para que la pestaña no se crashee o produzca un Frame Drop.

## 3. Estado de la Aplicación
- Todo se queda manejado enteramente dentro del Front-End en memoria (La extensión de Google Chrome/Firefox).
- Se requiere abstraer un `filteredRequests` que es el resultante de pasar el array gigante `allRequests` contra los selectores visuales o la cadena actual en la barra omnisciente. 
- *Impacto del GO Engine (`straws-core`):* **Nulo.** No se necesitan modificaciones aquí.
