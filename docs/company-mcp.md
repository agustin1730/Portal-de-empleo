# Actualización 1.0: conector de empresas

Estado de esta entrega: código preparado para publicación. La migración remota fue rechazada por revisión automática y requiere aprobación explícita del propietario por cambiar RLS y permisos. No se habilitó OAuth ni se realizó una autorización real desde ChatGPT. Publicar el código no activa el acceso. No requiere Docker, Oracle, n8n ni una API de IA paga para consultar el CRM desde un chat.

## Alcance

Endpoint nuevo: `/mcp/companies`, separado de `/mcp` y sus herramientas de empleos. Herramientas: `list_companies`, `get_company`, `get_company_research`, `save_company_research`. HTTP Streamable stateless con respuesta JSON; GET devuelve 405 porque no se ofrece un stream SSE permanente. Inicialización y descubrimiento también requieren autenticación. Los informes se guardan por propietario/empresa en `public.company_research`; el panel Investigación de la ficha los muestra sin modificar la empresa o el perfil.

REST para futuros flujos HTTP: GET `/api/company-connector` (opcional `?id=...`), GET `/api/company-research?id=...` y POST `/api/company-research` con `{id, report, expected_version}`. No se creó un token estático ni se entrega una clave administrativa a n8n. n8n deberá usar OAuth2 con renovación, un cliente dedicado y el mismo recurso firmado.

El servidor no busca en internet ni hace análisis por sí solo: el asistente necesita herramientas de búsqueda para reunir evidencia y redactar el informe. No hay ejecuciones programadas, envío de mensajes ni postulaciones automáticas. Las fuentes son atribuciones suministradas por el asistente, no una verificación automática de su veracidad. No inferir organigramas, tamaños, contactos o vacantes cuando no hay evidencia.

## Seguridad

- Supabase OAuth Server emite tokens; el portal verifica usuario confirmado, correo propietario, claims y cliente permitido. `MCP_COMPANY_CLIENT_IDS` vacío rechaza todos los clientes.
- El hook `public.company_connector_access_token` conserva claims nativos y agrega `resource` firmado solo a clientes de `company_connector_private.oauth_clients`. El servidor exige que coincida exactamente con `SITE_URL + /mcp/companies`. No se usan metadatos editables del usuario para autorizar.
- Las políticas restrictivas impiden a todos los tokens con `client_id` leer o modificar `candidate_profiles`, `candidate_files` y `jobs` por la Data API. Los RPC públicos existentes de perfil/empleos siguen siendo invoker y quedan sujetos a esas políticas.
- Los RPC nuevos exponen solo empresas del propietario e informes. Las funciones definer están en un esquema privado, con search_path vacío, sin owner_id configurable y sin privilegios para anon/PUBLIC. Los wrappers públicos son invoker. El rol authenticated no puede escribir directamente la tabla de informes.
- Los RPC y la política de lectura de informes comprueban cliente registrado, resource firmado y sesión OAuth aún existente para ese usuario. Revocar el grant elimina sus sesiones mediante Supabase; el conector deja de acceder incluso con el JWT anterior. Quitar la fila del cliente privado también corta el acceso. Las sesiones normales del portal y Job Match sin client_id conservan sus permisos.
- Escritura del informe con control de versión, bloqueo del perfil para serializar eliminación/primer informe, límites de tamaño y validación de fuentes. No se sobrescriben notas, contactos ni CV. Si la empresa se elimina, sus informes anteriores no se muestran por el RPC; su limpieza física queda pendiente, no se borraron datos históricos.
- Origin exacto (opcional `MCP_ALLOWED_ORIGINS` para clientes web), POST de consentimiento/revocación con origen propio, respuestas privadas no-store, IDs de autorización validados. Login conserva solo el authorization_id; no admite destinos arbitrarios.
- Configuración muestra clientes autorizados y permite revocarlos. No poner tokens, secretos o informes reales en Git.

## Activación: orden para quien administra el proyecto

1. Revisar este lote y la migración `supabase/migrations/20261117171812_company_mcp_research.sql`. Aplicarla al entorno objetivo antes de habilitar OAuth. Se probó en Postgres embebido con usuarios y sesiones ficticios; todavía no se aplicó a Supabase remoto.
2. Publicar el código en Vercel conservando el alcance de este lote: el checkout tiene muchos cambios concurrentes. Configurar `SITE_URL` al origen HTTPS exacto (sin ruta), junto con las variables existentes de Supabase. No publicar indiscriminadamente todo el árbol local.
3. En Supabase: Authentication → URL Configuration, comprobar el Site URL del portal. En Authentication → OAuth Server, habilitar el servidor y poner Authorization Path `/oauth/consent`. Mantener deshabilitado el registro dinámico para esta primera versión.
4. Crear un cliente OAuth dedicado a ChatGPT desde Authentication → OAuth Apps. Usar authorization_code + refresh_token y PKCE. Copiar el callback exacto que muestre la pantalla de conexión de ChatGPT; puede ser específico de esa conexión, no adivinarlo desde un tutorial. Elegir cliente predefinido/manual en ChatGPT. Guardar su secreto, si lo requiere, únicamente en la configuración de autenticación de ChatGPT. No usar la clave anon o service_role como client secret.
5. Registrar el client_id en la tabla privada mediante el editor SQL autorizado (reemplazar el UUID de ejemplo y el origen si corresponde):

```sql
insert into company_connector_private.oauth_clients(client_id, resource)
values ('00000000-0000-4000-8000-000000000000',
        'https://portal-de-empleo.vercel.app/mcp/companies')
on conflict(client_id) do update set resource=excluded.resource;
```

6. En Vercel agregar `MCP_COMPANY_CLIENT_IDS=<client_id>`; si hay más clientes dedicados, separar sus UUID con comas y registrar cada uno en la tabla privada. Volver a desplegar al cambiar variables.
7. En Supabase Authentication → Hooks, habilitar como Custom Access Token Hook la función `public.company_connector_access_token`. Si ya hay un hook activo, integrar esta lógica en él antes de cambiarlo; no sustituir una configuración existente sin revisión. El hook no cambia el audience nativo ni los tokens de sesiones normales.
8. Revisar el documento de discovery de Supabase y el metadata del recurso. Probar una autorización real con PKCE y renovación. No rotar claves JWT ni alterar otros proveedores para esta implementación. El cliente y los tokens deben seguir funcionando tras renovar; si el proveedor no entrega refresh_token, revisar grant types y scopes realmente soportados, no agregar scopes desconocidos a ciegas.

## Instalación en ChatGPT (cuando lo anterior esté publicado)

1. Abrir ChatGPT web en una cuenta/espacio que permita crear MCP personalizados.
2. En Plugins, pulsar `+` → Add custom MCP server. En interfaces anteriores: Configuración → Apps → Crear app, habilitando modo desarrollador si esa interfaz lo requiere.
3. Nombre: `Mi búsqueda · Empresas`.
4. URL: `https://portal-de-empleo.vercel.app/mcp/companies` (esta ruta todavía no se publicó).
5. Autenticación: OAuth, con el cliente predefinido que se registró en Supabase. No seleccionar sin autenticación. Si la interfaz no ofrece el mecanismo manual requerido, detener la configuración y revisar compatibilidad; no hacer públicos los datos para sortearlo.
6. Completar el inicio de sesión del portal y aprobar el acceso a empresas e investigaciones. Escanear las cuatro herramientas y crear/instalar la conexión.
7. En un chat nuevo seleccionar el conector y pedir: `Buscá Xubio en mi CRM y mostrame sus datos, sin modificar nada.`
8. Luego, con búsqueda web disponible: `Investigá esta empresa. Separá datos con fuentes, hipótesis e información faltante. Mostrame el informe antes de guardarlo.` Después de revisarlo, pedir guardarlo. El cliente debe llamar get_company_research antes de save_company_research y enviar su updated_at o null.
9. Abrir la empresa en el CRM → Investigación → Actualizar informe. Probar también Configuración → Conexiones de empresas → Revocar y comprobar que el token anterior ya no permite consultar datos.

La disponibilidad depende del plan y permisos del espacio de ChatGPT; el código no los habilita. La instalación real y el flujo completo de OAuth siguen pendientes de esas acciones externas.

## Contrato del informe

```json
{
  "summary": "Resumen breve basado en las fuentes consultadas",
  "facts": [{"text": "Dato con respaldo", "source": 0}],
  "hypotheses": ["Interpretación, no un hecho confirmado"],
  "unknowns": ["Información que no se pudo encontrar"],
  "nextSteps": ["Paso concreto para preparar el contacto"],
  "sources": [{"title": "Fuente", "url": "https://example.com", "consultedAt": "2026-01-01"}]
}
```

Los índices source empiezan en cero y deben referenciar una fuente del mismo informe. ConsultedAt es la fecha real de consulta, no una fecha inventada. El guardado exige expected_version null para el primero o el updated_at exacto del informe anterior; un conflicto requiere volver a leer, nunca reintentar a ciegas. No se mantiene historial de versiones en esta primera entrega.

## Referencias oficiales

- https://supabase.com/docs/guides/auth/oauth-server/getting-started
- https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- https://supabase.com/docs/guides/auth/oauth-server/token-security
- https://developers.openai.com/plugins/build/auth
- https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt

Revisadas el 17/11/2026. Las pantallas y disponibilidad pueden cambiar.


## Verificación local del 17/11/2026

- TypeScript sin emisión ni caché: aprobado. Build de producción Next.js: aprobado, incluidas las rutas nuevas.
- Nueve pruebas nuevas de herramientas, transporte, autenticación y SQL/RLS: aprobadas. SQL ejecutado en PGlite con usuarios, clientes y sesiones ficticios; prueba preservación del audience nativo en el hook, resource firmado, aislamiento entre propietarios, bloqueo de perfil/CV/jobs, conflicto de versiones, permisos del hook y revocación de sesión.
- Suite completa: 104 pruebas, 103 aprobadas; falla ajena al lote en tests/prospecting.test.ts porque falta public/data/empresas-cessi.csv en el checkout. No se alteró esa sección ni se generó un reemplazo para ocultar el faltante.
- Smoke HTTP del build local con configuración ficticia aislada: POST MCP sin token 401 con challenge, GET MCP 405, metadata 200, tres APIs privadas 401 y consentimiento sin sesión 307 al login conservando authorization_id. El servidor de prueba se apagó al terminar. No se probaron tokens reales ni un acceso autenticado a Supabase.
- Revisión React: hooks con cancelación de lecturas al cerrar/cambiar empresa, carga de informe bajo demanda, botones de acción type=button dentro del formulario, texto escapado por React y estilos mediante variables del tema existente. Sin rediseño general.
- Sin despliegue, migración remota, clientes OAuth reales, hook activo o instalación efectiva en ChatGPT. Esas verificaciones siguen pendientes y no se infieren del build.
