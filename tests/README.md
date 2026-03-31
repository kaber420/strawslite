# 🧪 Guía de Pruebas de StrawsLite

Esta carpeta contiene los scripts y la documentación necesaria para verificar el funcionamiento de la extensión y el motor de Go, con un enfoque principal en **Firefox**.

## 🚀 Cómo Probar en Firefox (Recomendado)

### 1. Iniciar los Servidores de Soporte
Para que la extensión pueda interceptar y procesar tráfico, primero debes iniciar el motor y el servidor de prueba:

- **Motor Go (Proxy):** `go run go-engine/cmd/proxy/main.go -port 5782`
- **Servidor de Prueba (HTTPS):** `go run go-engine/test-server.go` (Escucha en port 8100 con certificado autofirmado).

### 2. Ejecutar con `web-ext`
Utiliza siempre `web-ext` para cargar la extensión en una instancia temporal de Firefox. Esto evita problemas de firmas:

```bash
# Carga la extensión desde la carpeta dist (asegúrate de haber ejecutado npm run build:firefox antes)
npx web-ext run --source-dir dist/firefox
```

### 3. Verificar el Certificado Autofirmado
Dentro de la ventana de Firefox lanzada por `web-ext`:
1. Asegúrate de que el "Master Switch" está activo.
2. Añade una regla manual:
   - **Source:** `127.0.0.1`
   - **Destination:** `127.0.0.1:8100`
   - **Type:** `engine` (Esto enviará el tráfico al puerto 5782 del motor).
3. Visita `https://127.0.0.1:8100`. Deberías ver el mensaje: *"Hello from careldpos! You are connected via HTTPS."*

## 🔄 Flujo de Uso y Certificados

No necesitas "elegir" manualmente qué certificado usar en cada regla de la extensión. El motor de Go lo hace **automáticamente** mediante **SNI (Server Name Indication)**:

1.  **En la Extensión:** Creas una regla con `Source: mysite.test` y `Type: engine`. Esto le dice a la extensión: *"Toda petición a `mysite.test` mándala al motor de Go (puerto 5782)"*.
2.  **En el Motor (Go):** Cuando te llega la conexión HTTPS para `mysite.test`:
    -   El navegador envía el nombre `mysite.test` en el saludo TLS (SNI).
    -   El motor busca en la carpeta `go-engine/certs/` un archivo llamado `mysite.test.crt` (y su `.key`).
    -   Si existe, lo entrega al navegador.
3.  **Resultado:** El navegador recibe el certificado correcto para el dominio que pidió sin que tengas que configurar nada extra en la regla de la extensión.

> [!TIP]
> Si quieres usar un dominio nuevo, solo genera el certificado con ese nombre en la carpeta `certs/` y añade la regla en la extensión. El motor se encarga del resto.

## 📜 Scripts de Automatización

Contamos con scripts de **E2E (End-to-End)** basados en Puppeteer, pero recuerda que **siempre** deben apuntar a Firefox para este proyecto:

- `tests/firefox-e2e.test.cjs`: Prueba automatizada para Firefox. Configura la regla y verifica la navegación.
- `tests/chrome-e2e.test.js`: Prueba heredada para Chrome (usar solo como referencia secundaria).

> [!WARNING]
> **No uses herramientas basadas en Chromium (como el browser_subagent) para probar lógica de red de esta extensión**, ya que las APIs de `browser.proxy` difieren entre Firefox y Chrome y los resultados no serán válidos para el desarrollo de Firefox.
