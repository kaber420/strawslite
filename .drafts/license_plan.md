# Plan de Aplicación de Licencia GNU GPL v3

Este plan detalla los pasos para aplicar correctamente la licencia GNU General Public License v3.0 al proyecto StrawsLite, asegurando la atribución a **Fco. Ivan Romero Guzman** y el cumplimiento con los requisitos de la GPL.

## Cambios Propuestos

### 1. Archivos de Licencia Base
---
#### [NUEVO] [LICENSE](file:///home/kaber420/Documentos/proyectos/strawslite-firefox/LICENSE)
Crear el archivo con el texto completo de la licencia GNU GPL v3.0.

#### [MODIFICAR] [package.json](file:///home/kaber420/Documentos/proyectos/strawslite-firefox/package.json)
- Cambiar `"license"` de `"ISC"` a `"GPL-3.0-only"`.
- Cambiar `"author"` a `"Fco. Ivan Romero Guzman"`.

#### [MODIFICAR] [README.md](file:///home/kaber420/Documentos/proyectos/strawslite-firefox/README.md)
Añadir una sección de "Licencia" al final mencionando la GPL v3 y al autor.

### 2. Encabezados de Archivos Fuente
---
Añadir el encabezado estándar de GPL v3 a los siguientes archivos:

#### [MODIFICAR] [vite.config.mjs](file:///home/kaber420/Documentos/proyectos/strawslite-firefox/vite.config.mjs)
#### [MODIFICAR] [test_extension.js](file:///home/kaber420/Documentos/proyectos/strawslite-firefox/test_extension.js)
#### [MODIFICAR] [background.js](file:///home/kaber420/Documentos/proyectos/strawslite-firefox/src/background.js)
#### [MODIFICAR] [sidepanel.html](file:///home/kaber420/Documentos/proyectos/strawslite-firefox/src/sidepanel.html)
#### [MODIFICAR] [app.js](file:///home/kaber420/Documentos/proyectos/strawslite-firefox/src/js/app.js)
#### [MODIFICAR] [monitor.js](file:///home/kaber420/Documentos/proyectos/strawslite-firefox/src/js/monitor.js)
#### [MODIFICAR] [styles.css](file:///home/kaber420/Documentos/proyectos/strawslite-firefox/src/css/styles.css)

## Plan de Verificación

### Verificación Manual
1. **Revisar Contenido**: Inspeccionar cada archivo modificado para asegurar que el encabezado esté presente y bien formateado.
2. **Prueba de Build**: Ejecutar `npm run build:chrome` y `npm run build:firefox` para asegurar que los comentarios no rompan el proceso de construcción.
3. **Validación de JSON**: Verificar que `package.json` siga siendo un JSON válido.
