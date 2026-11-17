# Actualización 1.1: permisos por sección

Estado de esta entrega: migración aplicada y comprobada en producción; lote aislado con 103/103 pruebas y build aprobados. Publicación autorizada por el usuario. No hay permisos concedidos automáticamente: configurar las casillas tras el despliegue.

El usuario eligió controles por sección, sin seleccionar empresas individuales, y añadió el perfil profesional. Se conserva el MCP existente y su autenticación OAuth; no se crean clientes, claves o conexiones nuevos.

## Controles de Configuración → Acceso de la IA

| Permiso | Datos que entrega |
| --- | --- |
| Empresas | Ficha y enlaces. Contactos, notas y seguimiento privado requieren sus propios permisos. |
| Contactos | Nombre, cargo, correo, teléfono y LinkedIn del CRM. El nombre de empresa se incluye solo si Empresas está habilitado; el identificador de relación se conserva. |
| Postulaciones | Registros en postulado/contactado/entrevista/oferta. Excluye Basura y oportunidades sin postular. Notas y datos de contacto requieren sus permisos respectivos. |
| Mi perfil profesional | Titular, resumen, experiencia, educación/cursos, habilidades/evidencias, idiomas y portfolio. Excluye identidad, correo/teléfono personales, preferencias salariales, carta, CV y foto. Las propiedades anidadas tienen una lista explícita de campos. |
| Notas privadas | Notas y seguimiento solo dentro de secciones habilitadas. No habilita secciones por sí mismo. |
| Leer investigaciones | Contenido completo de informes guardados. |
| Guardar investigaciones | Crear/reemplazar el informe de una empresa; exige Leer investigaciones. No edita el CRM ni el perfil. |

Sin una fila de permisos válida para propietario + cliente, todos los permisos están desactivados. No se migra el acceso amplio anterior como un permiso implícito: después de activar 1.1 el propietario debe elegir y guardar las casillas. Esto también se aplica a conexiones existentes. Las sesiones web normales siguen funcionando con sus permisos de propietario.

## Aplicación de permisos

- Tabla `public.connector_permissions`, privada por RLS para la sesión directa del propietario. Un token OAuth no puede leer ni modificar las filas de configuración.
- `connector_save_permissions` aplica control de versión y rechaza actualizaciones concurrentes, permisos desconocidos, valores no booleanos y escritura de informes sin lectura. La API además exige sesión propietaria, cliente configurado y origen propio.
- Los permisos se consultan desde la base al listar herramientas y al invocarlas. Los RPC comprueban nuevamente el permiso de sección y la sesión activa; no dependen de copiar permisos en un JWT ni de renovarlo. La siguiente consulta tras guardar usa la nueva política; una consulta ya en curso puede finalizar.
- `tools/list` oculta herramientas sin autorización. `get_access_permissions` siempre puede explicar las opciones disponibles. Una herramienta previamente almacenada en caché por ChatGPT tampoco puede omitir la comprobación al invocarla.
- Se agregan `list_contacts`, `list_applications` y `get_professional_profile`, todas de solo lectura. Se mantienen las cuatro herramientas existentes, ahora sujetas a permisos. Total: ocho herramientas incluyendo la consulta de acceso.
- Se mantiene el bloqueo directo de OAuth sobre las tablas completas de perfil, archivos y empleos. Las proyecciones limitadas se ejecutan mediante funciones privadas con `search_path` vacío, verificando `auth.uid()`, cliente, recurso y sesión.
- El helper antiguo que proyectaba empresas sin filtrar deja de ser ejecutable por `authenticated`. Las lecturas de empresas omiten contactos o notas según la configuración. Los RPC y la política restrictiva de lectura de informes respetan sus permisos separados.
- Consentimiento OAuth muestra los permisos guardados y un enlace a Configuración. Las conexiones pueden configurarse antes de su primer consentimiento y revocarse después.

## Límites claros

Los permisos gobiernan esta conexión OAuth del portal. No restringen las credenciales administrativas de Supabase ni otras conexiones externas que el usuario haya instalado por separado. Los scopes OIDC de identidad solicitados durante OAuth son distintos del contenido profesional/CRM.

Desactivar acceso no borra información que ya se entregó a un chat. Un informe o texto libre puede contener información copiada de otra sección; estos controles no hacen una redacción semántica de textos históricos. Si eso preocupa, mantener apagada la lectura de esos informes/notas. Los archivos del CV y fotos permanecen fuera del conector, incluso al habilitar el perfil.

Para que ChatGPT muestre herramientas recientemente habilitadas puede ser necesario actualizar la lista de herramientas de la conexión. Esto no afecta el bloqueo de llamadas a herramientas deshabilitadas, que se comprueba en el servidor.

## Archivos y activación

Migración: `supabase/migrations/20261117185536_connector_section_permissions.sql`. Aplicar antes del código 1.1. Crea la tabla de permisos, limita los RPC existentes y agrega proyecciones de contactos, postulaciones y perfil. No modifica datos profesionales o registros CRM. No cambia las claves de Supabase ni el cliente/callback OAuth ya registrado.

Código: `lib/connector-permissions*.ts`, cambios en `lib/company-mcp*.ts`, ruta MCP, API de gestión y componente de Configuración, consentimiento OAuth y versión visible 1.1. `/mcp` de empleos y sus sesiones nativas siguen separados.

Las pruebas nuevas ejecutan SQL real en PGlite con dos propietarios y clientes ficticios, comprueban cada sección, denegación por defecto, bloqueo de escalada por el propio token, límites anidados del perfil, notas/contactos separados, versiones obsoletas y cambios con el mismo token. Las pruebas HTTP verifican filtrado de herramientas y la API de gestión con CSRF/sesión nativa. No equivalen a un guardado de permisos real en producción o una lectura autenticada desde ChatGPT.


Verificación local 1.1: build de producción final y TypeScript aprobados. Cinco pruebas nuevas de permisos (contrato, llamadas cacheadas, catálogo dinámico, API de gestión y SQL/RLS) aprobadas. Doce pruebas focalizadas de MCP/auth/permisos aprobadas antes de la prueba adicional de API. Suite completa final: 109 pruebas, 108 aprobadas y una falla por public/data/empresas-cessi.csv ausente en tests/prospecting.test.ts, preexistente y ajena al lote. git diff --check de archivos afectados aprobado con finales de línea Windows. No hubo cambios en Supabase remoto ni despliegue de 1.1, y no se verificó una sesión real de Configuración o ChatGPT con estos permisos. Se siguieron las guías update-plugin y Supabase conservando endpoint, cliente, datos y hosting existentes.
