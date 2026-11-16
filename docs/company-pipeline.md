# CRM: prospección de empresas

Implementado 2026-11-16. En `/?vista=crm`, las pestañas Prospección y Postulaciones separan empresas objetivo de candidaturas reales. Las postulaciones existentes conservan tablero y tabla; la prospección usa Kanban de cinco etapas: Por investigar, Por contactar, Contactada, En conversación y Cerrada.

Cada empresa permite nombre, rubro, país/ubicación, sitio, fuente, puestos de interés, hasta diez contactos, notas, borrador de mensaje y una próxima acción con fecha. El tablero permite arrastrar tarjetas y ofrece un selector de etapa accesible. Para hoy incluye acciones vencidas y excluye empresas cerradas. Completar una acción la registra en el historial y limpia el pendiente. Cerrar una empresa la conserva en la última columna.

## Persistencia y privacidad

`GET/POST /api/companies` requiere el mismo propietario confirmado que el resto del portal. `lib/company-pipeline-store.ts` guarda solo la nueva colección administrativa `candidate_profiles.data.crm_prospects`, mezclada con las claves anteriores y protegida por la RLS existente. El servidor exige la versión `updated_at` leída y realiza una actualización condicional por propietario y versión. Conflictos o fallos no se anuncian como guardados. Los datos iniciales están vacíos: no se importan catálogos ni ejemplos.

Hasta 200 empresas y 50 eventos por empresa en este MVP. Los eventos los genera el servidor, no el cliente. No hay migración de esquema, nuevas credenciales ni API paga. Los datos empresariales privados no se incluyen en Git ni en datos públicos.

El mensaje es una plantilla editable, no generación semántica con IA. Se puede copiar; nunca se envía desde la web ni afirma experiencia no documentada. No se crean postulaciones automáticamente ni se alteran las métricas de candidaturas.

CSV, sincronización de correo, recordatorios externos, vinculación empresa-vacante y cartas basadas en evidencia quedan para fases posteriores. La fecha de próxima acción se consulta dentro de Prospección; no crea notificaciones del sistema ni tareas de Inicio.

## Verificación

Tests de validación y transiciones en `tests/company-pipeline.test.ts`; tests del adaptador de persistencia con cliente simulado en `tests/company-pipeline-store.test.ts` verifican aislamiento por propietario, preservación del perfil y conflictos. La RLS existente tiene cobertura separada en storage/profile tests. Una prueba de adaptador no equivale a iniciar sesión en producción: comprobar en una sesión propietaria al crear, recargar y mover una empresa real.

