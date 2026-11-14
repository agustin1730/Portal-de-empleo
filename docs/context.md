# Contexto compartido

Leé primero AGENTS.md, este documento, current-state.md y roadmap.md. Después revisá git status y el código de la tarea. Esta documentación viaja con Git; las conversaciones y memorias de cada asistente no.

## Producto
Portal personal para organizar oportunidades, evaluar compatibilidad documentada y preparar postulaciones. Interfaz en español, compacta, con poco texto. Mantener el diseño existente; proponer un mockup antes de rediseños importantes. La información profesional vive en Mi perfil; cada oferta tiene requisitos específicos.

## Reglas del producto
- Empezar sin APIs de IA pagas. No activar servicios o cobros nuevos sin autorización.
- Afinidad no representa probabilidad de contratación. No inventar habilidades, títulos, antigüedad, salarios ni resultados.
- Preservar decisiones, notas, contactos y fechas del CRM al enriquecer avisos.
- Descartado pertenece a Basura; no restaurarlo por una importación.
- Borrador, revisión y aceptación antes de reemplazar información profesional.
- No enviar candidaturas, mensajes ni respuestas a reclutadores por iniciativa propia.
- Cambiar código y publicar son operaciones distintas: comprobar el alcance autorizado y verificar el resultado.

## Fuentes de verdad
Código y docs: este repositorio. Datos privados actuales: Supabase autenticado. Producción: despliegue activo de Vercel. Historial conversacional: contexto auxiliar, no evidencia de implementación. Revisar archivos y servicios antes de afirmar que una función funciona.

## Mantenimiento
Después de cambios de comportamiento, actualizar current-state.md y decisiones relevantes. Roadmap distingue propuestas de implementaciones. Registrar pruebas ejecutadas, resultados y límites. No escribir datos de candidatos ni contenido del correo en estos documentos.

