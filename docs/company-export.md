# Exportación CSV de empresas

2026-11-17. En Prospección, Seleccionar habilita casillas en Kanban y Tabla. Seleccionar visibles usa los filtros activos; las selecciones se conservan entre filtros y vistas. Exportar CSV descarga solo las elegidas. Cancelar selección limpia la selección. El arrastre se desactiva durante la selección.

La ficha tiene Exportar CSV para una empresa. Incluye los valores actuales del borrador, sin guardarlos automáticamente.

Una fila por empresa: ID, nombre, rubro, país, sitio, fuente, puestos, etapa, contacto principal con LinkedIn, acción y fecha, notas, mensaje guardado y columnas JSON con todos los contactos y toda la actividad disponible. UTF-8 con BOM, coma, CRLF y comillas escapadas. Las celdas con posibles fórmulas se fuerzan a texto. Los nombres de archivo se sanitizan y usan fecha argentina.

Se genera localmente en el navegador; no envía datos a IA ni cambia datos persistidos. No es respaldo/restauración del portal: el importador CSV existente no restaura las columnas JSON de contactos múltiples e historial.

Verificación: 78 pruebas, build aislado y typecheck del checkout aprobados. Sin prueba de descarga con sesión propietaria en navegador.
