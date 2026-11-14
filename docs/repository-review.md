# Revisión del repositorio - 2026-11-14

## Alcance y evidencia
Inspección local y del commit remoto main b6ccba796a30845f00b69d4b6546d910e594d3b1. Local HEAD observado: 7d23cab. Se obtuvo origin/main con fetch. Se inspeccionaron README, AGENTS, CLAUDE, package.json, .env.example, .gitignore, listado de pruebas, rutas y documentos de Job Match. No se consultaron secretos ni datos de candidatos para redactar contexto.

## Hallazgos
1. Historial local y remoto no alineado; hay modificaciones locales en app/tracker.tsx y app/compact-cards.css relacionadas con el enlace de oferta ya publicado y diferencias de finales de línea. Conservarlas; no resetear ni forzar sincronización.
2. output/ y tmp/ estaban sin ignorar y contienen artefactos de trabajo. Se agregan exclusiones para evitar subir CV o renders por accidente. private-data/ y .env.local ya estaban excluidos.
3. README largo con material histórico contradictorio. Se incorpora un índice hacia documentos de estado actual sin borrar instrucciones técnicas anteriores.
4. Falta de contexto portable: se agregan contexto, arquitectura, estado, decisiones, roadmap y guía de sincronización. CLAUDE.md ya apunta a AGENTS.md.
5. Skill y automatización Job Match dependen del entorno y no son portables por clonar Git. La documentación de procesos debe evitar prometer disponibilidad constante.
6. UI presupone portal definido; incidente corregido en datos, hardening pendiente en roadmap. No se cambia comportamiento en esta tarea documental.

## Validación de esta entrega
Comprobar enlaces relativos, ausencia de secretos y diff. No ejecutar una compilación como prueba de documentos ni afirmar que hubo una auditoría exhaustiva de seguridad. No publicar output/, tmp/, mockups/ ni documentos preexistentes sin revisar.

## Siguiente paso operativo
Compartir estos documentos por una rama/PR sin mezclar cambios de UI. Reconciliar después el historial local y remoto conservando el trabajo. Configurar un clon limpio en Ubuntu y comprobar instalación y pruebas allí. No se ha configurado Codespaces ni instalado herramientas en otros equipos.

