# Trabajar desde Windows, Ubuntu y otros editores

## Primera instalación en cada entorno
1. Autorizar tu cuenta de GitHub en ese entorno mediante su flujo normal. No copiar tokens entre chats.
2. Instalar Git y una versión de Node compatible con package.json. Usar npm y el lockfile del repositorio.
3. Clonar: `git clone https://github.com/agustin1730/Portal-de-empleo.git` y entrar en la carpeta.
4. Ejecutar `npm ci`.
5. Copiar .env.example a .env.local: Ubuntu `cp .env.example .env.local`; PowerShell `Copy-Item .env.example .env.local`.
6. Completar valores autorizados en privado. El repositorio solo contiene nombres de variables, nunca secretos.
7. Ejecutar `npm run typecheck`, `npm test`, `npm run build` y luego `npm run dev`.

No ejecutar migraciones contra producción para preparar otra computadora. El mismo proyecto Supabase comparte los mismos datos; una base separada requiere configuración y migraciones propias. Usar entorno de prueba para cambios de datos.

## Cada sesión
- Leer AGENTS.md, docs/context.md, current-state.md y roadmap.md.
- Revisar `git status --short`, `git branch --show-current` y `git remote -v`.
- Con cambios locales: revisar y guardar en su rama antes de actualizar. No ejecutar pull/reset a ciegas.
- Con árbol limpio: `git fetch origin`; en main, `git pull --ff-only`. Si falla por divergencia, inspeccionar historial; no forzar.
- Crear rama `git switch -c codex/descripcion-corta` para una tarea.
- Hacer cambios acotados y ejecutar validaciones correspondientes.
- Actualizar docs cuando cambie el comportamiento. Revisar `git diff --check` y el diff completo.
- Añadir archivos explícitos con `git add ruta1 ruta2`; evitar git add . con archivos privados o generados.
- Crear commit, `git push -u origin nombre-de-rama` y abrir PR. Integrar conforme al alcance autorizado.

Antes de cambiar de máquina, subir la rama. En la otra: fetch y switch a esa misma rama. No editar la misma rama simultáneamente en varios equipos. Si hay conflictos, resolverlos leyendo ambos cambios.

## Contexto entre herramientas
Codex debe leer AGENTS.md; CLAUDE.md remite allí. En Cursor y Antigravity indicar explícitamente que lean los mismos archivos, sin asumir que cada producto los carga automáticamente. Conservar una sola fuente de instrucciones; no copiar documentos que después diverjan.

Mensaje para un chat nuevo:

> Leé AGENTS.md, docs/context.md, docs/current-state.md y docs/roadmap.md. Revisá la rama, cambios pendientes y el código relevante. La tarea es: [describir]. No supongas que tenés los permisos o conexiones de otro chat. Al terminar, informá validación, pendientes y actualizá contexto si cambió el comportamiento.

## Codespaces opcional
Abrir un Codespace del mismo repositorio no copia sesiones, .env.local ni conexiones de agentes. Verificar costo/cuota y configurar secretos en el entorno autorizado. No es necesario para sincronizar: Git también funciona con clones locales.

## Qué no se sincroniza
node_modules, .next, .env.local, CV, exports, correos, credenciales, chats ni configuración privada de automatizaciones. No sincronizar toda la carpeta de trabajo por una nube genérica. En Windows y Ubuntu respetar mayúsculas/minúsculas en rutas e imports.

