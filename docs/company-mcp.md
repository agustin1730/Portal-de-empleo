# Actualización 1.0: conector de empresas

Estado actual: código publicado, migraciones de seguridad aplicadas, OAuth Server y hook habilitados, cliente manual PKCE registrado y permitido. Falta autorizar la conexión desde ChatGPT y verificar herramientas y renovación reales. No requiere Oracle, Docker, n8n ni API de IA paga.

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
4. URL: `https://portal-de-empleo.vercel.app/mcp/companies`.
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


### 2026-11-17 — Actualización 1.0 publicada; activación OAuth bloqueada

Producción Vercel READY dpl_CfVMnVEBVLQ1stPj3ojuNSdczKnQ, commit 2e1d0501914a420b11a53829de5692570e0871ee, árbol 86b18e98f3cc0ea0cfb535256d0b6166a8a37e24. Alias portal-de-empleo.vercel.app confirmado. Lote aislado de 28 archivos sobre producción anterior: 98/98 tests y build aprobados; no incluye cambios CESSI ni otros cambios concurrentes. HTTP público: metadata del recurso 200 con URLs correctas, MCP GET 405 por transporte stateless, POST sin token 401 con challenge.

NO está instalada la conexión en ChatGPT. OAuth de Supabase sigue devolviendo feature_disabled. La revisión automática rechazó apply_migration company_mcp_research por modificar en producción una frontera de acceso (RLS, funciones y permisos) sin autorización suficientemente específica; no se intentó eludir el rechazo. Lectura posterior confirmó que company_research y crm_company_data aún no existen. Se requiere autorización explícita del usuario para aplicar esa migración y habilitar/configurar OAuth, hook y cliente. Acceso visual al panel se detuvo por imposibilidad de verificar la URL del navegador; no se cambió configuración por UI. Mantener los accesos fail-closed hasta completar seguridad y probar OAuth real.


### 2026-11-17 — Migración 1.0 autorizada y aplicada; login del panel pendiente

El usuario autorizó explícitamente la migración de producción y habilitar OAuth. Supabase apply_migration company_mcp_research devolvió success:true. Verificación remota confirmó public.company_research, crm_company_data y company_connector_access_token, más las políticas restrictivas profile_no_oauth, files_no_oauth y jobs_no_oauth. Prueba SQL con contexto OAuth transaccional: cero filas accesibles en perfil, archivos y empleos, y cliente sin registrar rechazado por el RPC; resultado oauth_privacy_checks_passed:true. No se modificaron registros profesionales ni CRM.

La autorización anterior resuelve el rechazo automático: no pedirla de nuevo para el mismo alcance. Código sigue publicado en 2e1d0501914a420b11a53829de5692570e0871ee. OAuth sigue pendiente de activar, registrar cliente/callback, habilitar hook y variable Vercel. No se creó un token ni se instaló la conexión ChatGPT. Panel Supabase abierto en IAB, pestaña 7, muestra sign-in; se solicitó al usuario iniciar sesión allí y responder Ya ingresé. Pestaña marcada para handoff. No confundir la conexión técnica del plugin Supabase con una sesión del dashboard ni extraer credenciales.


### 2026-11-17 — OAuth habilitado y hook activo; callback de ChatGPT pendiente

Con confirmación explícita al momento de la acción, se activó OAuth Server en el panel Supabase, Authorization Path /oauth/consent; registro dinámico permanece apagado. Se guardó el Site URL del portal de producción (antes localhost). Discovery de Supabase responde 200 con authorization_code, refresh_token y PKCE S256. Hook company_connector_access_token habilitado en el panel. Se aplicó además company_oauth_claim_binding para aceptar client_id dentro de claims (formato documentado del hook) y conservar compatibilidad con evento superior. No se emitieron credenciales ni se creó aún un cliente OAuth: falta el callback exacto que ChatGPT muestre para esa conexión. El usuario pidió instrucciones para encontrarlo. No cambiar por una URL supuesta. Faltan cliente en Supabase, registro privado, variable MCP_COMPANY_CLIENT_IDS y prueba real de consentimiento/renovación.


### 2026-11-17 — Cliente dedicado configurado

OAuth Server activo, Site URL de producción comprobado tras navegación y hook company_connector_access_token ENABLED. Se creó desde el panel un cliente público manual con PKCE, usando exclusivamente el callback específico aportado por el usuario. Registro dinámico continúa desactivado. Cliente habilitado en company_connector_private.oauth_clients y variable Vercel MCP_COMPANY_CLIENT_IDS de producción; no se creó ni se compartió un client secret. Compatibilidad del hook con client_id anidado en claims cubierta por migración company_oauth_claim_binding aplicada y prueba SQL/PGlite aprobada. Falta autorización e inicio de sesión del propietario desde ChatGPT y verificación real de herramientas/renovación. No declarar instalado hasta observar ese resultado.
