# Estado actual

Revisión documental: 2026-11-14, Argentina. Base remota inspeccionada: b6ccba796a30845f00b69d4b6546d910e594d3b1. Confirmar siempre el estado de producción antes de desplegar.

## Implementado en el código
- Inicio con métricas de postulaciones de esta semana, cuatro semanas de actividad, tareas y revisión real del correo.
- Mi perfil editable, experiencia por registro, educación/formación, conocimientos, idiomas, portfolio y preferencias laborales.
- Importación de CV PDF con texto a borrador revisable, sin IA paga. Fotos y adjuntos limitados a 3 MB; eliminar CV no elimina el resumen importado.
- Oportunidades con resumen compacto, afinidad por requisitos, condiciones separadas, filtros y enlaces Ver oferta/Ver detalle.
- CRM con estados, notas, contactos, fechas y eliminación de registros; Basura para descartados.
- Auth de propietario, RLS, API y endpoint MCP autenticado.

## Límites y riesgos observados
- La afinidad usa reglas y sinónimos limitados; no es evaluación semántica completa. Fechas sin mes no acreditan duración exacta.
- Los portales pueden bloquear o retirar descripciones. Las alertas no equivalen a avisos completos.
- Una importación directa anterior dejó portal ausente y rompió las tarjetas. El dato se corrigió, pero Portal en tracker.tsx sigue suponiendo un string. Pendiente: validación uniforme y fallback de render, con prueba de regresión.
- La automatización depende de permisos y herramientas disponibles en su entorno. No prometer ejecución universal ni migración automática entre cuentas.
- El README histórico contiene descripciones de Panorama y neto/bruto que ya no corresponden a la UI actual; usar esta documentación y verificar código.
- La carpeta local tiene historial distinto al remoto y cambios de finales de línea en tracker/compact-cards. No hacer reset, force push ni publicar esos cambios sin reconciliación explícita.

## Próxima función propuesta, todavía no implementada
Preparar postulación por oferta: preguntas pendientes, carta personalizada revisable y evidencias recomendadas. CV enfocado y preparación de entrevista en fases posteriores. El CV PDF preparado fuera del portal no implica que exista generación automática de CV en la web.

## Verificación
La auditoría actual inspeccionó Git, documentación, scripts y puntos de entrada. No constituye una nueva prueba integral de producción ni de autenticación. Revisar repository-review.md para evidencias y pendientes.

