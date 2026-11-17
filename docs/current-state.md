# Estado actual · entrega 1.1

Actualización del 17/11/2026, Argentina. Portal privado en Vercel con Supabase. Se conserva el cliente OAuth y endpoint /mcp/companies configurados en 1.0.1; /mcp de empleos permanece separado.

La versión 1.1 incorpora Configuración → Acceso de la IA, por conexión y sección: empresas, contactos, postulaciones activas, perfil profesional, notas y lectura/escritura de investigaciones. Sin fila de permisos válida, todo permanece apagado. El usuario debe guardar explícitamente las casillas. Las tablas completas de perfil/CV/jobs siguen bloqueadas a OAuth; se usan proyecciones privadas y permisos consultados en cada llamada. No hay acceso a CV, fotos ni escritura de CRM/perfil. Ver connector-permissions.md.

Migración connector_section_permissions aplicada en producción y verificada con contexto OAuth: permisos iniciales falsos, cuatro secciones denegadas y tablas privadas inaccesibles. 103/103 tests del lote aislado y build aprobados. La copia local completa contiene cambios concurrentes CESSI excluidos de esta publicación; no publicar ni revertir indiscriminadamente todo el checkout. El deploy se ejecuta por Git/Vercel y debe verificarse READY antes de anunciar éxito. No se probó guardar permisos con una sesión propietaria real ni tools/list autenticado desde ChatGPT.

El usuario eligió solo controles por sección, sin selección de empresas específicas. Cambios aplican a consultas futuras, no borran lo recibido en chats ni redactan textos libres/informes históricos. OIDC de identidad y conectores administrativos externos no se gobiernan con estas casillas.


## 1.1.1 — Corrección visual de Empresas

17/11/2026, Argentina. El tablero de Empresas mantiene sus cinco etapas en una fila con desplazamiento horizontal y barra fina adaptada al tema. La regla específica evita que los estilos compartidos de Postulaciones envíen Cerrada debajo. Se elimina del menú lateral del CRM el bloque Tu próximo paso, más cerca / Cada postulación es una nueva posibilidad y su icono. Sin cambios de datos, filtros ni permisos.

Validación previa: TypeScript y cuatro pruebas focalizadas aprobados en el repositorio de trabajo. La comprobación visual local no se completó porque el navegador no pudo acceder a localhost. Publicación solicitada por el usuario; estado final de compilación y alias se verifica después del commit.

Lote aislado 1.1.1: build de producción y TypeScript aprobados; cuatro pruebas de CRM aprobadas antes de publicar. Sin migraciones ni cambios de credenciales.
