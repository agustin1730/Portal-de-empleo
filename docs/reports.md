# Informes 1.3


## Informes 1.2

Sección independiente /?vista=informes. Tabla, propiedades Tipo y Empresa editables, relación opcional y múltiples informes por empresa. Contenido Markdown, edición/vista previa, importación .md como borrador revisable y descarga individual o selección combinada. Guardado explícito con control de versión y conservación del borrador en conflictos. No genera contenido ni envía cartas automáticamente.

public.reports con RLS por propietario y permisos reports_read/reports_write, apagados por defecto e independientes de research_read/research_write legados. MCP suma list_reports/get_report/save_report; vincular empresa desde OAuth requiere Empresas. HTML e imágenes remotas no se renderizan. Se preservan datos, tablas y herramientas de investigaciones anteriores. Ver docs/reports.md.

Límites: título 200 caracteres; texto 40.000 caracteres / 50 KB UTF-8; un .md por importación. Tabla carga 100 registros por página; búsqueda/tipo filtran registros cargados. Descarga múltiple combina Markdown con títulos/separadores. Empresa eliminada no borra informes: se puede quitar/cambiar la relación. No incluye eliminación de informes ni relación con una oferta concreta. Los permisos de Informes comparten su contenido completo, que puede contener información copiada. Los permisos legados de investigación no se amplían.


## 1.3 — Editor visual lateral

Informes abre documentos en panel derecho con edición visual de texto, títulos, negrita, cursiva, listas, checklist, enlaces HTTP(S), tablas, citas, código y deshacer/rehacer. Sin pestañas Markdown/Vista previa. El contenido continúa guardándose como Markdown para API/MCP y descargas. Guardado automático a los 700 ms, escrituras serializadas, versión por informe, preservación de ediciones durante guardado y cierre que espera lo pendiente. Fallos detienen reintentos automáticos; reintento consulta el servidor para resolver respuestas ambiguas sin sobrescribir cambios externos. Importar .md conserva revisión explícita antes de activar guardado automático. Documentos con HTML, imágenes o notas al pie se muestran de forma segura sin modificar su contenido: edición de propiedades y descarga original disponibles. Sin migración ni cambios de permisos.
