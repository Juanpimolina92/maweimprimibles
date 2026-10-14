# Verificación independiente

14 de octubre de 2026 — Argentina.

**Verificación local aprobada.** Reality Checker reprodujo las pruebas y abrió las capturas actuales. No sobreviven problemas confirmados del código ni del artefacto local. La nueva versión de Vercel queda pendiente del push autorizado y de su comprobación posterior; este informe no certifica producción.

## Puertas y evidencia

| Puerta | Resultado | Evidencia |
| --- | --- | --- |
| Compilación | Aprobada | HAML/Sass compilados; HTML, estilos, módulos, Bootstrap, AOS y fotos servidos correctamente |
| Unitarias | 8/8 aprobadas | Catálogo, filtros, WhatsApp, alias exacto y fotos en rutas relativas |
| Funcionales HTTP | 6/6 aprobadas | Página real, todos sus recursos, fotos, atributos accesibles y ausencia de precios/API de cobro |
| Seguridad local | 9/9 aprobadas | Traversal raw, archivos privados, métodos, CSP, MIME, XSS de query/origen y límite por IP |
| Artefacto estático | 4/4 aprobadas | Export de raíz idéntico a dist/; recursos, imports y fotos en / y /maweimprimibles/ |
| Navegador local | 19 comprobaciones aprobadas | [Registro de navegador](browser-verification.json) y capturas actuales |
| Dependencias | 0 alertas notificadas | [Auditoría npm del 13 de octubre](dependency-audit.json); las dependencias no cambiaron en esta corrección |
| Vercel publicado | Pendiente después del push | La configuración publica exclusivamente dist/; falta verificar la versión activa |

La reejecución independiente de node --test tests/*.test.mjs aprobó **27/27**, con **0 fallos y 0 omisiones**; duración observada **760,6299 ms**. El [registro de la ejecución de raíz](tests.tap) coincide en 27 aprobadas, con duración propia de 823,5157 ms. Code Reviewer también reprodujo las 4 pruebas de despliegue.

El JSON de navegador conserva 20 intentos: 19 aprobados y un primer clic de filtro que coincidió con el desplazamiento automático. La reejecución con el control visible e input nativo comprobó 2 productos y aria-pressed="true"; el intento inicial tiene una resolución explícita, no se ocultó como aprobado.

## Evidencia visual y recorridos

Las capturas actuales se revisaron directamente: escritorio de 1440 px, tablet de 768 px y móvil de 375 px. Muestran rosa predominante, detalles amarillos/celestes/verdes, presentación de Marieta y catálogo de diseños sin precios.

- [Detalle de Frozen](screenshots/fixed-product.jpg): diálogo real con foto, descripción y consulta por WhatsApp. El registro acredita cierre con Escape y retorno del foco al botón original.
- [Carrusel](screenshots/fixed-carousel.jpg): segundo diseño e indicador visibles. El registro comprobó siguiente 2 de 3, anterior 1 de 3 e indicador 3 de 3.
- [Alias](screenshots/fixed-alias.jpg): marie.pezzutti.mp, confirmación de copia y consulta por WhatsApp. El registro verificó el contenido exacto del portapapeles mediante input nativo.
- [Tablet](screenshots/fixed-tablet.jpg): composición del hero corregida y enlace Instagram en el menú.
- [Inicio móvil](screenshots/fixed-mobile-home.jpg), [menú móvil](screenshots/fixed-mobile-menu.jpg) y [catálogo móvil](screenshots/fixed-mobile-catalog.jpg): navegación visible, Instagram y fotos cuadradas. El registro comprobó apertura y cierre al navegar.

Los filtros devolvieron 2 kits, 3 imprimibles, 5 personalizados y 10 en “Ver todo”. AOS estaba inicializado. La FAQ abrió su contenido y no se capturaron errores de consola durante el recorrido. Se comprobó ausencia de desbordamiento horizontal en los tres anchos: 1425 ≤ 1440, 753 ≤ 768 y 360 ≤ 375 px.

## Hallazgos revisados y resueltos

1. **Alta — atributos HAML con guiones bajos.** La renderización inicial produjo 86 atributos aria_/data_ incompatibles. Se corrigieron a claves explícitas con guiones y se verificó el HTML compilado; las interacciones actuales también aprobaron.
2. **Alta — Bootstrap rechazado por el servidor.** bootstrap.min.css y bootstrap.bundle.min.js no coincidían con la lista de rutas permitidas. Los recursos actuales responden 200. La regresión de seguridad permite puntos internos y sigue rechazando archivos ocultos y traversal.
3. **Alta — fotos con altura fija en móvil/tablet.** Las [capturas anteriores de móvil](screenshots/before-mobile-image-height.jpg) y [tablet](screenshots/before-tablet-image-height.jpg) mostraban fotos demasiado altas. height: auto corrigió la composición. El catálogo móvil actual y su registro muestran las 10 fotos cargadas a **136 × 136 px**; las tarjetas de escritorio mantienen proporción 1 y el carrusel aproximadamente 1,08. El hallazgo quedó cerrado con evidencia posterior.

**Problemas confirmados que sobreviven al escrutinio local: ninguno.** Esto describe el alcance comprobado; una auditoría sin alertas y estos casos de seguridad no prueban ausencia universal de vulnerabilidades.

## Alcance del despliegue

vercel.json selecciona dist/, y la prueba revisó su inventario: documento y recursos públicos, sin fuentes HAML/Sass, tests, informes, archivos privados ni enlaces simbólicos. index.html y cada archivo de assets/ de la raíz coinciden byte por byte con dist/. El fixture bajo /maweimprimibles/ rechaza recursos que se escapen a la raíz del dominio; todos los recursos e imports actuales se resolvieron dentro del montaje.

La [captura anterior de Vercel](screenshots/vercel-before.jpg) conserva el error de la versión publicada antes de la corrección. Una compilación local no acredita el despliegue activo. Los tests de cabeceras y límite por IP corresponden al servidor Node local; el proveedor estático requiere su propia verificación. El registro de navegador local no aporta métricas de carga ni pruebas en varios navegadores, por lo que no se certifican rendimiento general ni producción.

Mercado Pago sólo muestra el alias solicitado; la API de cobro quedó fuera del alcance por instrucción del usuario. No se ejecutaron cobros ni ataques a servicios externos.

## Comandos y reproducción

- Inventario: rg --files -g '!node_modules' -g '!dist', más el equivalente PowerShell del inventario de vistas/HTML. El proyecto usa HAML/Sass y exportación HTML estática.
- Comprobación de afirmaciones de diseño: rg -n -i 'luxury|premium|glass|morphism' -g '*.html' -g '*.css' -g '*.blade.php' . No se usaron etiquetas comerciales como evidencia de calidad.
- Pruebas: node --test tests/*.test.mjs y node --test tests/deployment.test.mjs.
- Auditoría independiente original: npm.cmd audit --json, salida 0, todas las severidades en 0, 30 dependencias.
- qa-playwright-capture.sh no existe en el proyecto. Se utilizó el navegador disponible, sus capturas JPEG y el registro JSON de interacciones; no se presentan como capturas de otro navegador o de otra herramienta.

Las conexiones locales y la consulta a npm necesitaron acceso fuera del sandbox tras EACCES y ENOTFOUND. Esas restricciones fueron del entorno. El cliente de prueba de métodos añadió Content-Length para enviar cuerpos HTTP válidos antes de repetir la suite.
