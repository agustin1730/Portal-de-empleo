# Informes 1.3


## Informes

Sección independiente /?vista=informes. Tabla, propiedades Tipo y Empresa editables, relación opcional y múltiples informes por empresa. Contenido Markdown, edición/vista previa, importación .md como borrador revisable y descarga individual o selección combinada. Guardado explícito con control de versión y conservación del borrador en conflictos. No genera contenido ni envía cartas automáticamente.

public.reports con RLS por propietario y permisos reports_read/reports_write, apagados por defecto e independientes de research_read/research_write legados. MCP suma list_reports/get_report/save_report; vincular empresa desde OAuth requiere Empresas. HTML e imágenes remotas no se renderizan. Se preservan datos, tablas y herramientas de investigaciones anteriores. Ver docs/reports.md.

Límites: título 200 caracteres; texto 40.000 caracteres / 50 KB UTF-8; un .md por importación. Tabla carga 100 registros por página; búsqueda/tipo filtran registros cargados. Descarga múltiple combina Markdown con títulos/separadores. Empresa eliminada no borra informes: se puede quitar/cambiar la relación. No incluye eliminación de informes ni relación con una oferta concreta. Los permisos de Informes comparten su contenido completo, que puede contener información copiada. Los permisos legados de investigación no se amplían.


## 1.3 — Editor visual lateral

Informes abre documentos en panel derecho con edición visual de texto, títulos, negrita, cursiva, listas, checklist, enlaces HTTP(S), tablas, citas, código y deshacer/rehacer. Sin pestañas Markdown/Vista previa. El contenido continúa guardándose como Markdown para API/MCP y descargas. Guardado automático a los 700 ms, escrituras serializadas, versión por informe, preservación de ediciones durante guardado y cierre que espera lo pendiente. Fallos detienen reintentos automáticos; reintento consulta el servidor para resolver respuestas ambiguas sin sobrescribir cambios externos. Importar .md conserva revisión explícita antes de activar guardado automático. Documentos con HTML, imágenes o notas al pie se muestran de forma segura sin modificar su contenido: edición de propiedades y descarga original disponibles. Sin migración ni cambios de permisos.


## 1.4 — Recuperación e historial privado

18/11/2026, Argentina. Alcance aprobado mediante “Ejecuta el plan”. Informes conserva el editor visual lateral y Markdown para API/MCP. Añade borradores IndexedDB por cuenta, documento e instancia de editor, con revisión antes de guardar. Debounce de 200 ms y persistencia adicional al ocultar/cerrar el editor; solo se garantiza el último borrador confirmado por el navegador. Caducidad oportunista de siete días. Un informe modificado externamente o eliminado se recupera como copia nueva; una respuesta de guardado ambigua se reconcilia sin duplicar el estado ya guardado. Importaciones y recuperaciones exigen aceptación explícita. Fallos de almacenamiento se muestran sin afirmar que exista copia local.

Cerrar sesión borra las copias de esa cuenta, comunica el cierre a otras pestañas e invalida escrituras pendientes mediante una época persistida. Una sesión expirada conserva el borrador para la misma cuenta. No se guardan tokens ni contenido de informes en localStorage; este solo transporta el aviso de cierre.

Migración report_history aplicada y verificada en Supabase: public.report_versions, RLS nativa por propietario, trigger atómico de informes y RPC reports_restore. Hasta 30 puntos por documento; guardados Portal de la misma sesión se agrupan hasta 60 segundos, OAuth crea un punto por escritura y restaurar siempre crea un grupo nuevo. Escrituras sin cambios no alteran versión ni historial. Estado inicial único de informes existentes, sin inventar versiones antiguas. Historial y restauración bloqueados para OAuth/anon, sin ampliar permisos ni herramientas MCP. Restaurar comprueba versión actual y versión del punto elegido; conserva el estado previo y permite quitar explícitamente una empresa eliminada.

Validación: 128/128 pruebas, TypeScript del lote aislado y repositorio principal, build final y auditoría npm sin vulnerabilidades. Pruebas DOM cubren revisión y recuperación, confirmación de restauración, guardado posterior, cierre de sesión y limpieza antes del envío. SQL/RLS local cubre agrupamiento, aislamiento, caducidad de grupos, retención y permisos; verificación SQL real revertida confirmó restauración, conflicto, bloqueo OAuth, cero documentos de prueba persistidos y cero informes sin checkpoint. Advisors sin avisos nuevos respecto a los dos avisos previos. No se completó inspección visual autenticada en navegador; no se declara como verificada. Publicación autorizada; el resultado de Vercel se verifica después del commit.
