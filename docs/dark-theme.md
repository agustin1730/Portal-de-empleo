# Tema oscuro y eliminación de leads

2026-11-17. Configuración suma Claro/Oscuro/Sistema. Preferencia guardada en localStorage de este navegador, inicialización previa a pintar, seguimiento del sistema y sincronización del tema entre pestañas. Si el almacenamiento está bloqueado, se aplica el tema sin prometer persistencia.

Paleta oscura: fondo #151c1b, sidebar #101615, columnas #1a2420, tarjetas #23302a, acento #73bd97. Las hojas CSS usan variables de tema con sus valores claros anteriores como fallback; app/theme.css define las variantes oscuras. Inter e iconos conservados. Aplicado a vistas, formularios y modales existentes.

La ficha de empresa permite Eliminar empresa con confirmación explícita. POST /api/companies recibe action delete, id y versión actual. El servidor filtra únicamente ese ID y conserva otras empresas y claves del perfil mediante el guardado existente, limitado al propietario y versión. Un conflicto o fallo se informa sin quitar la ficha del cliente. No se eliminó ningún dato real durante las pruebas.

Tarjetas con accesos por icono; se refuerza la ocultación del selector de URL escrita legado. Los enlaces completos siguen disponibles en ficha y CSV.

Verificación: 85 tests aprobados, build aislado de producción y typecheck del checkout aprobados. Pruebas de preferencia inicial/sistema/almacenamiento bloqueado, eliminación y versión obsoleta. Smoke visual de estilos reales en navegador con datos ficticios en Claro y Oscuro; no equivale a recorrido autenticado de todas las vistas ni eliminación real. Sin migraciones, APIs pagas ni dependencias nuevas.
