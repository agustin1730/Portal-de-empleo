# Arquitectura

## Stack verificado
Next.js 16.4.6, React 19.2.6, TypeScript, Supabase Auth/Postgres, PDF.js 6.5.438. npm y package-lock.json. Node >=22.13.0; respetar engines y versiones fijadas. El build usa webpack.

## Flujo
Navegador -> API autenticada de Next.js -> cliente Supabase del servidor -> tablas con RLS -> respuesta -> interfaz. proxy.ts renueva sesiones; lib/auth.ts exige usuario confirmado y correo propietario permitido. No reemplazar esto por autenticación simulada.

## Vistas
app/page.tsx selecciona Inicio por defecto; ?vista=perfil, oportunidades, crm y basura. panorama es un alias histórico a Mi perfil, no una sección independiente del menú.

## Archivos clave
- app/home.tsx y lib/dashboard-data.ts: Inicio, métricas semanales de Argentina, tareas y resumen de revisiones.
- app/tracker.tsx: tarjetas, filtros, importación/exportación y detalle de oportunidades.
- app/crm.tsx: tablero y tabla de postulaciones.
- app/profile.tsx y lib/profile-data.ts: perfil, preferencias, formación, herramientas y portfolio.
- lib/jobs.ts y lib/job-data.ts: persistencia y normalización de empleos.
- lib/fit.ts: afinidad rules-v2 basada en evidencia declarada.
- lib/work-conditions.ts: comparación separada de salario, modalidad, ubicación y jornada.
- lib/cv-parser.ts y lib/pdf-text.ts: extracción local del PDF y borrador sin modelo externo.
- app/api/: rutas privadas de jobs, profile y dashboard.
- app/mcp/route.ts: herramientas list_jobs, import_jobs, update_job y report_job_review; requieren sesión propietaria para datos.
- supabase/migrations/: cambios de esquema versionados; no se ejecutan por compilar.

## Datos
public.jobs conserva payload del aviso y columnas de estado, notas y fechas. public.candidate_profiles conserva el perfil JSON y metadatos administrativos dashboard_tasks/dashboard_review. Ver migraciones para contratos y adjuntos exactos. Filtrar owner_id y conservar RLS. Una exportación de código no copia la base de datos.

## Job Match
La automatización de correo se ejecuta fuera de Vercel y necesita conexiones autorizadas a Gmail, fuentes y Supabase. No está instalada en otra máquina por clonar Git. Ver job-review-reporting.md y job-match-process.md. La skill local y sus credenciales no forman parte del repositorio portable.

