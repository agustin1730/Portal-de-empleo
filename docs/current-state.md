# Estado actual · entrega 1.1

Actualización del 17/11/2026, Argentina. Portal privado en Vercel con Supabase. Se conserva el cliente OAuth y endpoint /mcp/companies configurados en 1.0.1; /mcp de empleos permanece separado.

La versión 1.1 incorpora Configuración → Acceso de la IA, por conexión y sección: empresas, contactos, postulaciones activas, perfil profesional, notas y lectura/escritura de investigaciones. Sin fila de permisos válida, todo permanece apagado. El usuario debe guardar explícitamente las casillas. Las tablas completas de perfil/CV/jobs siguen bloqueadas a OAuth; se usan proyecciones privadas y permisos consultados en cada llamada. No hay acceso a CV, fotos ni escritura de CRM/perfil. Ver connector-permissions.md.

Migración connector_section_permissions aplicada en producción y verificada con contexto OAuth: permisos iniciales falsos, cuatro secciones denegadas y tablas privadas inaccesibles. 103/103 tests del lote aislado y build aprobados. La copia local completa contiene cambios concurrentes CESSI excluidos de esta publicación; no publicar ni revertir indiscriminadamente todo el checkout. El deploy se ejecuta por Git/Vercel y debe verificarse READY antes de anunciar éxito. No se probó guardar permisos con una sesión propietaria real ni tools/list autenticado desde ChatGPT.

El usuario eligió solo controles por sección, sin selección de empresas específicas. Cambios aplican a consultas futuras, no borran lo recibido en chats ni redactan textos libres/informes históricos. OIDC de identidad y conectores administrativos externos no se gobiernan con estas casillas.


## 1.1.1 — Corrección visual de Empresas

17/11/2026, Argentina. El tablero de Empresas mantiene sus cinco etapas en una fila con desplazamiento horizontal y barra fina adaptada al tema. La regla específica evita que los estilos compartidos de Postulaciones envíen Cerrada debajo. Se elimina del menú lateral del CRM el bloque Tu próximo paso, más cerca / Cada postulación es una nueva posibilidad y su icono. Sin cambios de datos, filtros ni permisos.

Validación previa: TypeScript y cuatro pruebas focalizadas aprobados en el repositorio de trabajo. La comprobación visual local no se completó porque el navegador no pudo acceder a localhost. Publicación solicitada por el usuario; estado final de compilación y alias se verifica después del commit.

Lote aislado 1.1.1: build de producción y TypeScript aprobados; cuatro pruebas de CRM aprobadas antes de publicar. Sin migraciones ni cambios de credenciales.


## 1.2 — Informes

18/11/2026, Argentina. Sección independiente /?vista=informes en el menú lateral. Tabla con casillas, título, Tipo (Investigacion/Carta), Empresa y fecha. Tipo y relación de empresa se editan desde la fila; selector de empresas existentes con buscador y opción de quitar relación. Varios informes por empresa y documentos sin empresa. Editor Markdown con vista previa, importación .md como borrador revisable y descarga individual/selección combinada. Guardado explícito con versión por registro; conflictos mantienen el borrador. No genera ni envía cartas automáticamente.

Migración reports_markdown aplicada mediante Supabase. public.reports con RLS por propietario, validación de relación y RPC de guardado con control de versión. Permisos nuevos reports_read/reports_write apagados por defecto y separados de los permisos legados research_read/research_write. No se modifica ninguna concesión existente. MCP suma list_reports/get_report/save_report, con comprobación de permisos en cada llamada y base; asociar una empresa desde OAuth requiere Empresas. Las investigaciones estructuradas anteriores conservan sus tablas y herramientas. Ver docs/reports.md.

Validación: 109/109 pruebas aprobadas en lote aislado, build de producción y TypeScript aprobados. SQL de verificación en producción dentro de transacción revertida confirma guardado, cambio/quita de empresa, rechazo de versión desactualizada y OAuth sin acceso nuevo; cero informes de prueba persistidos. Tabla con RLS, anon sin SELECT y authenticated sin DELETE. Advisors sin avisos nuevos frente al estado previo. Vista previa Markdown probada contra HTML, enlaces ejecutables, credenciales en enlaces e imágenes remotas; enlaces permitidos solo HTTP(S). Revisión de componentes según react-best-practices. Servidor local devolvió 200 en la vista de prueba, pero la herramienta de navegador agotó el tiempo y no permitió inspección visual; fixture temporal eliminada y ausente del build. No se verificó UI autenticada con la sesión real del propietario.

Usuario autorizó implementar y desplegar. El estado final de Vercel se verifica después de publicar este commit. Sin nuevas credenciales ni APIs de pago.


## 1.3 — Editor visual en panel derecho

18/11/2026, Argentina. Los informes abren en un panel lateral derecho ampliable, con la tabla detrás y edición directa de texto con formato. Sin pestaña Vista previa ni Markdown visible. Incluye títulos, negrita, cursiva, listas, checklist, enlaces HTTP(S), tablas con gestión de filas/columnas, citas, código y deshacer/rehacer. Contenido guardado e intercambiado como Markdown mediante las APIs/MCP existentes; no se modifica el esquema ni permisos.

Guardado automático a los 700 ms de pausa, solicitudes serializadas, versión por documento, conservación de ediciones durante respuestas pendientes y cierre que espera el guardado. El fallo de red pausa los intentos automáticos y conserva el texto en la ventana; reintento consulta el estado remoto y resuelve respuestas ambiguas sin pisar cambios de otra ventana. Descargar copia disponible. Importación .md exige aceptar el borrador antes de activar guardado automático. Título vacío no crea registros. Abrir un documento no reescribe su Markdown. HTML, imágenes y notas al pie no representables activan lectura segura del cuerpo, edición de propiedades y descarga original, evitando conversiones silenciosas.

115/115 pruebas aprobadas, build de producción y TypeScript aprobados en lote aislado; TypeScript del repositorio principal aprobado. Incluye comandos reales del editor en DOM de pruebas: formato, historial, checkbox, tablas y saltos en celdas; pruebas Markdown de ida/vuelta y seguridad; simulación de edición durante guardado, conexión perdida tras confirmar el servidor, conflicto externo y aceptación de importación. npm audit sin vulnerabilidades. No se completó inspección visual del navegador: la herramienta agotó el tiempo incluso al seleccionar el navegador. Vista temporal retirada antes de compilar. No se declara prueba visual ni edición autenticada desde el navegador del propietario.

Dependencias de editor gratuitas fijadas a Tiptap 3.34.0; pruebas DOM con jsdom 26.1.0. Usuario autorizó implementación y despliegue. El despliegue y alias se verifican después de publicar este commit. Ver docs/reports.md.


## 1.4 — Recuperación e historial privado

18/11/2026, Argentina. Alcance aprobado mediante “Ejecuta el plan”. Informes conserva el editor visual lateral y Markdown para API/MCP. Añade borradores IndexedDB por cuenta, documento e instancia de editor, con revisión antes de guardar. Debounce de 200 ms y persistencia adicional al ocultar/cerrar el editor; solo se garantiza el último borrador confirmado por el navegador. Caducidad oportunista de siete días. Un informe modificado externamente o eliminado se recupera como copia nueva; una respuesta de guardado ambigua se reconcilia sin duplicar el estado ya guardado. Importaciones y recuperaciones exigen aceptación explícita. Fallos de almacenamiento se muestran sin afirmar que exista copia local.

Cerrar sesión borra las copias de esa cuenta, comunica el cierre a otras pestañas e invalida escrituras pendientes mediante una época persistida. Una sesión expirada conserva el borrador para la misma cuenta. No se guardan tokens ni contenido de informes en localStorage; este solo transporta el aviso de cierre.

Migración report_history aplicada y verificada en Supabase: public.report_versions, RLS nativa por propietario, trigger atómico de informes y RPC reports_restore. Hasta 30 puntos por documento; guardados Portal de la misma sesión se agrupan hasta 60 segundos, OAuth crea un punto por escritura y restaurar siempre crea un grupo nuevo. Escrituras sin cambios no alteran versión ni historial. Estado inicial único de informes existentes, sin inventar versiones antiguas. Historial y restauración bloqueados para OAuth/anon, sin ampliar permisos ni herramientas MCP. Restaurar comprueba versión actual y versión del punto elegido; conserva el estado previo y permite quitar explícitamente una empresa eliminada.

Validación: 128/128 pruebas, TypeScript del lote aislado y repositorio principal, build final y auditoría npm sin vulnerabilidades. Pruebas DOM cubren revisión y recuperación, confirmación de restauración, guardado posterior, cierre de sesión y limpieza antes del envío. SQL/RLS local cubre agrupamiento, aislamiento, caducidad de grupos, retención y permisos; verificación SQL real revertida confirmó restauración, conflicto, bloqueo OAuth, cero documentos de prueba persistidos y cero informes sin checkpoint. Advisors sin avisos nuevos respecto a los dos avisos previos. No se completó inspección visual autenticada en navegador; no se declara como verificada. Publicación autorizada; el resultado de Vercel se verifica después del commit.
