# Plan Detallado: Active Interception (Edit & Resend)

## Objetivo
Convertir a Straws de solo observabilidad pasiva a una herramienta activa. Permitir seleccionar cualquier trazado previamente capturado y enviarlo a un editor, en donde sus componentes pueden ser modificados y enviados desde la extensión, hacia el motor de Go, para ser re-emitidos a la web real y la respuesta será interceptada en la extensión.

## 1. Diseño de UI / Componentes (Frontend de la Extensión)

- **El Botón "Edit & Resend":**
  - Una acción primaria (botón/icono de lápiz y Play) colocada en la pestaña detalla de cualquier request clickeada en la tabla principal.
- **El Modal "Request Constructor" (Editor):**
  - Un formulario complejo pero intuitivo pre-poblado con los metadatos y cuerpo originales del request.
  - Campos a editar:
    - **Método HTTP:** Un Dropdown (GET, POST, PUT, DELETE, PATCH, OPTIONS, etc).
    - **URL Completo:** Un campo de texto grande, para que se puedan editar paths o query parameters a mano.
    - **Request Headers:** Un componente de tabla de llaves y valores, con botones para "Add Header" o "Delete".
    - **Request Payload (Body):** Un textArea (idealmente con sintaxis resaltada basica de tipo monospaced) para el raw JSON o text.

- **Integración con la UI Principal:**
  - Al completar la modificación y presionar el botón "Resend", el modal se cierra o indica que está ejecutando.
  - La tabla principal en el panel debajo agrega automáticamente el nuevo rastro capturado cuando este termine y lo marca visualmente con un ícono de "♻ Replayed" para indicar que no fue del tráfico pasivo.

## 2. Comunicación Native Messaging

- El componente de UI disparará un mensaje a nuestro script de background.
- El background empacará un nuevo comando para `straws-core`.
- **Estructura del Payload hacia Go:**
```json
{
  "command": "REPLAY_REQUEST",
  "data": {
    "method": "POST",
    "url": "https://api.example.com/v1/update",
    "headers": {
      "Content-Type": ["application/json"],
      "Authorization": ["Bearer myfaketoken"]
    },
    "body": "{\"modified\": true}"
  }
}
```

## 3. Implementación en el Go Engine (`straws-core`)

- **Procesador de Comandos Externos:**
  - El bucle `reader` que procesa stdin JSON de la extensión (`ProcessNativeMessage`) requerirá un nuevo `switch case` para `REPLAY_REQUEST`.
- **Constructor de http.Request (Go):**
  - Go recibirá el JSON y tratará de crear un nuevo `http.NewRequestWithContext(ctx, req.Method, req.URL, bytes.NewBuffer(req.Body))`.
  - Iterando sobre `req.Headers` para asignarlos de lleno llamando `httpReq.Header.Set()`.
- **Ejecución HTTP Clandestina:**
  - El engine NO utilizará la abstracción normal del MITM Proxy, usará en cambio un `http.Client` explícito (configurable con o sin Transport para proxies) para enviar el raw request.
  - Esto captura su propio timestamp (start y end).
- **Traducción de Vuelta:**
  - Un handler de Go lee la respuesta que le lanzó la red (el objeto `http.Response`), lee todo el cuerpo de esa respuesta localmente.
  - Empaqueta todo en un objeto JSON compatible con el esquema de Traza general de la UI.
  - Envía la respuesta formateada devuelta mediante `stdout` (Native Messaging Send) al Plugin indicando con una bandera: `isReplay: true`.
