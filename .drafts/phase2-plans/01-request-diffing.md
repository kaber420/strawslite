# Plan Detallado: Request Diffing (Comparación Lado a Lado)

## Objetivo
Implementar una herramienta visual que permita elegir dos trazas de red interceptadas (solicitudes/respuestas) y compararlas lado a lado para identificar rápidamente cambios en encabezados, parámetros de la URL, y el payload (cuerpo JSON/x-www-form-urlencoded).

## 1. Diseño de UI / Componentes

- **Selector en la Tabla de Tráfico:**
  - Agregar checkboxes a la izquierda de cada fila en el dashboard de observabilidad.
  - El estado global de la aplicación (ej. Redux o un hook Context) debe mantener un array `selectedRequests` (max: 2).
  - Cuando `selectedRequests.length === 2`, el botón global flotante de "Compare" (Diff) se vuelve visible y clickeable.

- **Modal de Comparación (Side-by-Side):**
  - Una vista estructurada en dos paneles simétricos, verticalmente u horizontalmente (preferiblemente panel izquierdo para "Original/Older" y panel derecho para "New/Recent").
  - Cada panel estará dividido en secciones (acordeones):
    1.  **Información General:** URL, Method, HTTP Version, IP/Port.
    2.  **Encabezados (Headers):** Request Headers y Response Headers.
    3.  **Cuerpo (Payload):** Request Body y Response Body (idealmente con soporte para parseo de JSON).

## 2. Motor de Comparación (Lógica JavaScript)

Dado que usar librerías externas de diff en la extensión aumenta el peso y la superficie de seguridad, escribiremos un módulo utlitario interno `diffEngine.js`.

- **Comparación de Diccionarios (Headers / URL Params):**
  - Lógica para calcular la diferencia de dos objetos llave-valor.
  - Resultados esperados: llaves agregadas, llaves eliminadas, llaves modificadas.

- **Comparación de Payload JSON:**
  - Si el `Content-Type` contiene `application/json`, ambos payloads se intentan parsear (`JSON.parse`).
  - Se utiliza una recursión para profundizar en propiedades y buscar qué nodos han cambiado de estado, cuáles son nuevos o cuáles falatan.

## 3. Experiencia Visual y Estilización (CSS / "Cyber-Lab" Aesthetic)

- Se usarán los códigos de color estandarizados de las utilidades de consola o git (para consistencia mental del desarrollador):
  - **Fondo Verde Suave (`#e6ffed` u obscuro equivalente) / Texto Verde:** Para campos agregados (Additions).
  - **Fondo Rojo Suave (`#ffeef0`) / Texto Rojo:** Para campos eliminados (Deletions).
  - **Fondo Amarillo/Naranja:** Para valores modificados dentro de claves que existen en ambos.
- Renderizar estos colores en el DOM final de manera limpia para un entendimiento en milisegundos.
- *Nota:* Esta función es exclusivamente UI. **No afecta al proxy (`straws-core`)** en Go.
