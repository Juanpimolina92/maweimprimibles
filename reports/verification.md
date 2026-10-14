# Verificación independiente

Fecha: 13 de octubre de 2026 (Argentina).

Estado inicial: **NEEDS WORK**. No se certifica producción hasta contar con evidencia de las pruebas aplicables.

## Puertas de verificación

| Puerta | Evidencia requerida | Estado |
| --- | --- | --- |
| Compilación | HAML y Sass compilados; recursos JavaScript disponibles | Pendiente |
| Unitarias | Casos de catálogo, filtros, consulta WhatsApp y alias exacto | 7/7 aprobadas |
| Funcionales HTTP | Página, recursos, imágenes y ausencia de iniciación de cobros | 6/6 aprobadas |
| Navegador | Escritorio, tablet, móvil e interacciones antes/después | Pendiente |
| Seguridad local | Traversal, exposición de fuentes/secretos, métodos, límites y cabeceras | 9/9 aprobadas |
| Dependencias | Auditoría del registro npm contra el lockfile | 0 vulnerabilidades notificadas; 30 dependencias |
| API de Mercado Pago | El usuario cambió el alcance a mostrar sólo el alias | No aplica; no se ejecuta ningún cobro |
| Revisión independiente | Reproducción de cada hallazgo de Code Reviewer y reejecución tras correcciones | Pendiente |

## Condiciones de aceptación

- Catálogo sin precios visibles, estilo pastel con rosa predominante, HAML, Sass, JavaScript, Node, Bootstrap, carrusel y AOS.
- Encabezado de Marieta, consultas a WhatsApp 2646241204 y pie con Juan Pablo Molina y su GitHub.
- Mercado Pago muestra sólo el alias `marie.pezzutti.mp`, sin precios visibles ni API de cobro.
- Esta verificación no ejecuta cobros ni ataques contra servicios externos.

## Evidencia de revisión

Se completará con resultados reproducidos, archivos de prueba y capturas existentes. Los hallazgos corregidos quedarán registrados como resueltos; sólo los problemas todavía reproducibles se presentarán como pendientes.

### Hallazgo reproducido: atributos HAML incompatibles

**Severidad alta; resuelto en fuente y HTML compilado.** Al renderizar inicialmente `src/index.haml` con `hamljs` se obtuvieron **86 atributos con `aria_` o `data_` y ninguno con `aria-` o `data-`**. Este compilador conserva literalmente los guiones bajos. Por tanto, `data_category`, `data_bs_target`, `data_aos` y `data_open_payment` no satisfacían los selectores ni las interfaces esperadas por los filtros, Bootstrap, AOS y el diálogo de alias; las propiedades ARIA tampoco correspondían a los atributos estándar.

Reproducción independiente: cargar `src/index.haml`, llamar `haml.render(...)` y contar los nombres mediante `/(?:aria|data)_[a-z_]+=/g` frente a `/(?:aria|data)-[a-z-]+=/g`. Se informó a los responsables de plantilla y compilación. La prueba funcional exige los nombres con guiones y rechaza los nombres con guiones bajos.

Reejecución tras corregir la plantilla: **0 atributos con guiones bajos y 86 con guiones**. La prueba del documento compilado también aprobó. Las interacciones reales quedan sujetas a la evidencia de navegador.

### Hallazgo reproducido: recursos de Bootstrap rechazados

**Severidad alta; resuelto y revalidado.** La prueba funcional inicial contra `dist/` reprodujo `GET /assets/vendor/bootstrap.min.css → 404`. La lista de rutas permitidas en `src/server.mjs` admitía sólo un punto, antes de la extensión; los nombres reales de Bootstrap contienen varios puntos. El código mostraba la misma incompatibilidad para `bootstrap.bundle.min.js`.

Reproducción: `node --test tests/functional.test.mjs` con acceso local autorizado. Resultado inicial: **5 aprobadas, 1 fallida**, por recurso de Bootstrap ausente en HTTP.

Reejecución después de corregir la ruta: todos los recursos declarados por la página respondieron `200` con MIME y contenido correctos. La regresión de seguridad comprobó que permitir puntos internos no habilitó archivos ocultos ni traversal. La suite completa independiente aprobó **22/22**, sin omisiones.

### Hallazgo reproducido: fotos demasiado altas en móvil y tablet

**Severidad alta; fuente corregida, revalidación visual pendiente.** Reality Checker abrió independientemente [la captura móvil anterior](screenshots/before-mobile-image-height.jpg) y [la captura tablet anterior](screenshots/before-tablet-image-height.jpg). La primera muestra las fotos del catálogo largas y recortadas; la segunda muestra fotos del hero que se extienden hasta el límite inferior de la sección y desarman la composición. La raíz midió antes de corregir 216 px de ancho y 640 px de alto en una foto del hero de tablet, y 319,4 px de ancho con 600 px de alto en una tarjeta.

La revisión del Sass confirmó que los atributos HTML `height` de 600/640/700 conservaban su altura aunque CSS reducía el ancho. Se añadió `height: auto` a las imágenes generales y al diálogo móvil. Se requiere comparar las capturas posteriores y las dimensiones efectivas de navegador para cerrar este hallazgo.

## Comandos de comprobación

- Inventario de implementación: `rg --files -g '!node_modules' -g '!dist'` y equivalente PowerShell a `ls -la resources/views/ || ls -la *.html`. La implementación elegida es HAML/Sass y servidor Node; el HTML se genera en `dist/`.
- Comprobación de afirmaciones visuales: `rg -n -i 'luxury|premium|glass|morphism' -g '*.html' -g '*.css' -g '*.blade.php' .`. No se toma ninguna descripción comercial como acreditación de calidad.
- `qa-playwright-capture.sh` no existe en el proyecto al inicio. La raíz aporta las capturas con el navegador disponible; debe adjuntar datos reales de interacciones y tiempos antes de cerrar esta puerta.
- `node --test tests/catalog.test.mjs`: **7 aprobadas, 0 fallidas** (122,653 ms de duración total observada; esto mide la prueba y no la carga de la página).
- `node --test tests/*.test.mjs`, reejecución independiente final de código HTTP: **22 aprobadas, 0 fallidas, 0 omitidas**; duración total **637,7568 ms**. Desglose: 7 unitarias, 6 funcionales y 9 de seguridad local.
- `npm.cmd audit --json`, reejecución independiente: salida `0`, `vulnerabilities: {}`, contadores de información/baja/moderada/alta/crítica en `0`; 30 dependencias (6 de producción y 24 de desarrollo). Una auditoría sin alertas no prueba ausencia universal de vulnerabilidades.
- Las pruebas HTTP necesitaron acceso a `127.0.0.1` fuera del sandbox tras `EACCES`; la consulta a npm necesitó red tras `ENOTFOUND`. Son limitaciones del entorno de prueba, no fallos del sitio. El primer error de cuerpos HTTP en la suite de seguridad se corrigió añadiendo `Content-Length` al cliente de prueba, y se volvió a ejecutar la suite.
