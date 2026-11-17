# Selección permanente en CRM

2026-11-17. Empresas, Contactos y Postulaciones muestran casillas por defecto en tarjetas y/o tablas. Se elimina el botón de activar/cancelar selección de Empresas. El selector de empresas visibles permanece junto al buscador; exportación CSV y limpieza aparecen solo al seleccionar empresas. El arrastre continúa disponible. No se agregan acciones masivas nuevas.

Contactos borra la selección al cargar o guardar para no conservar índices que cambiaron. Postulaciones usa selección por ID, tanto en tablero como tabla. Los selectores de visibles afectan solo los resultados del filtro actual. Seleccionar no abre la ficha ni modifica datos persistidos.

El usuario aclaró que configuraciones se refería a Postulaciones dentro del CRM. Configuración no cambia.

Verificación: 89 tests existentes, build aislado de producción y typecheck del checkout aprobados. Sin recorrido autenticado en navegador. Sin cambios de API ni migraciones.
