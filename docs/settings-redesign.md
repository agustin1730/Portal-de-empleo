# Configuración compacta y pestaña Empresas

2026-11-17. Configuración adopta el mockup aprobado: Apariencia con tres miniaturas Claro/Oscuro/Sistema y marca de selección; debajo Cuenta e información de la app en dos columnas adaptables. Conserva la elección de tema y la información real de compilación/commit en horario argentino, sin fechas ficticias. Compatible con claro y oscuro.

Inicio deja de mostrar Para hoy, su contador de tareas, el formulario y controles de tareas. No se borran registros históricos ni se modifica el API administrativo o la revisión automática.

La pestaña Prospección pasa a llamarse Empresas; solo cambia la presentación, conservando datos, estados internos, importación/exportación y rutas. No agrega la sección concurrente /empresas a producción.

Verificación: 85 tests y build de producción aprobados en la copia aislada. Sin recorrido autenticado en navegador.
