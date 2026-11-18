# Plan 1.4 — Recuperación de borradores e historial de Informes

Fecha: 18/11/2026, Argentina. Estado: propuesta para aprobar. No implementada ni desplegada. Este documento no autoriza por sí mismo una migración o publicación.

## Resultado buscado

Recuperar cambios que todavía no llegaron al servidor y poder volver a un estado anterior del informe. Mantener el editor visual lateral de 1.3, el Markdown de intercambio y los permisos actuales. No incluir las mejoras de pegado, buscar/reemplazar ni exportación PDF de la futura 1.5.

## Lo comprobado en el código

- `ReportAutosave` conserva el borrador solo en memoria. Ya espera 700 ms, serializa solicitudes, conserva ediciones durante respuestas pendientes y consulta el servidor al reintentar una respuesta ambigua.
- `reports_save` comprueba `updated_at` y bloquea la fila antes de modificarla. La protección contra escrituras desactualizadas se conserva.
- `public.reports` almacena únicamente el documento actual; todavía no hay historial.
- El editor permite descargar una copia cuando falla el guardado. Las importaciones necesitan aceptación antes de comenzar a guardarse automáticamente.
- El cierre de sesión actual es una ruta de servidor; por sí sola no puede limpiar almacenamiento del navegador. La limpieza local requiere integración del lado del cliente.
- Existen cambios locales ajenos a esta tarea. La implementación y la publicación deben conservarlos y aislar el lote, sin reset, pull ni staging general.

La revisión fue de código y documentación locales; no se inspeccionaron documentos privados ni se modificó la base.

## 1. Recuperación de borradores

### Almacenamiento local

Usar IndexedDB para guardar una copia durante la edición, separada por propietario autenticado, informe e instancia de pestaña. IndexedDB permite operaciones asíncronas y transacciones; no implica una copia sincronizada ni una garantía de conservación del navegador. Referencia: [IndexedDB, MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).

El registro contiene título, tipo, empresa, Markdown, versión de servidor de partida, estado de aceptación de importación, fecha local y contador de edición. No contiene tokens, claves, CV ni el resto del perfil. La identidad del propietario se obtiene de la sesión del servidor, no del nombre mostrado ni de un parámetro libre.

- Guardar tras una pausa corta de edición, aproximadamente 200 ms, independientemente de que funcione la red.
- No confiar en un guardado durante el cierre de la pestaña: intentar una última escritura al ocultarse, pero conservar la advertencia de salida cuando haya cambios pendientes.
- Tras confirmación del servidor, eliminar únicamente el borrador de esa pestaña y de esa revisión local. Una respuesta antigua nunca puede borrar una edición más reciente.
- Si la solicitud pudo haberse confirmado antes de perder la conexión, comparar la copia con el servidor antes de ofrecer recuperación. No duplicar un documento que ya quedó guardado.
- No mezclar ni sobrescribir borradores de otras pestañas. Ofrecer sus fechas si hay más de uno.
- Limpiar borradores resueltos y, al consultar el almacén, los de más de siete días. Este plazo es limpieza oportunista, no borrado garantizado en segundo plano.

### Recuperación al volver

En el mismo navegador y con la misma cuenta, mostrar un aviso compacto dentro del panel cuando exista un borrador distinto del documento actual. Mostrar título y fecha, con acciones para revisar, recuperar o descartar. Ninguna detección reanuda el guardado ni sobrescribe el servidor automáticamente.

- Si el documento remoto conserva la versión de partida, recuperar tras aceptación y continuar con su versión actual.
- Si el servidor cambió, ofrecer guardar el borrador como un informe nuevo. No fusionar ni reemplazar automáticamente la versión de otra ventana o de un agente.
- Si era un informe nuevo sin registro remoto, recuperar como borrador nuevo, conservando su identidad para reconciliar respuestas ambiguas antes de crearlo.
- Si era una importación pendiente, conservar la revisión explícita: recuperarla no equivale a aceptar la importación.
- Descargar la copia local siempre que sea posible, incluso si no puede guardarse en la nube.

### Privacidad y límites

Los borradores quedan almacenados en ese dispositivo. No prometer cifrado propio ni recuperación si el usuario borra los datos del navegador, usa navegación privada o el navegador elimina el almacenamiento.

Integrar una limpieza de borradores al cerrar sesión desde la app y notificar el cierre a las demás pestañas, para que no vuelvan a escribir copias de la cuenta anterior. La expiración involuntaria de sesión conserva el borrador para permitir recuperar al volver a autenticarse con la misma cuenta; otra cuenta no lo muestra. La limpieza no debe impedir cerrar sesión si el almacenamiento falla: se informa el fallo y se mantiene el aislamiento de cuenta.

Si IndexedDB no está disponible o se alcanza la cuota, mostrar el problema sin afirmar que hay una copia local recuperable. El guardado del servidor debe continuar funcionando.

## 2. Historial de versiones

### Guardado central

Crear una tabla de versiones vinculada por `(owner_id, report_id)` al informe. Cada punto de recuperación incluye título, tipo, relación de empresa, Markdown, versión del documento, fecha del servidor y origen verificable.

Registrar los cambios en una transacción con la escritura de `reports`, mediante un trigger de base de datos. Así el historial cubre el editor, la edición de propiedades de la tabla, MCP y escrituras directas admitidas por las políticas; no depende de que cada cliente recuerde registrar una versión. Referencia: [triggers en Supabase](https://supabase.com/docs/guides/database/postgres/triggers).

No usar etiquetas de origen enviadas por el navegador o por el agente. Derivar el origen del JWT verificado:

- **Portal:** sesión sin cliente OAuth. No afirmar que esto prueba que escribió una persona: una sesión nativa también puede utilizarse programáticamente.
- **Conector IA:** cliente OAuth registrado. No atribuir un modelo o producto específico sin una identificación fiable del cliente.
- **Restauración:** operación de restauración controlada por el servidor.
- **Estado inicial:** documento existente al activar la función; autor anterior desconocido.

### Granularidad y retención

Conservar hasta **30 puntos de recuperación por informe**, además del documento actual.

No crear una entrada visible cada 700 ms. Para autosaves consecutivos de la misma sesión/origen, agrupar los cambios en ventanas de hasta 60 segundos: solo el punto más reciente de ese grupo puede actualizarse internamente. Al abrir un grupo nuevo, el anterior queda congelado. Las versiones archivadas no son editables por el cliente.

Un cambio de cliente/origen o una restauración siempre abre un grupo nuevo. Las escrituras OAuth no se agrupan entre sí: cada guardado de agente crea su propio punto. No crear entradas por escrituras sin cambios de contenido o propiedades.

El agrupamiento es una política de recuperación, no una auditoría de cada pulsación. La interfaz muestra la fecha de la última actualización del grupo. La limpieza del excedente ocurre en la misma transacción; no requiere un servicio programado nuevo.

Al activar 1.4, tomar una única copia del estado actual de los informes existentes. No inventar versiones pasadas. La migración bloquea brevemente las escrituras necesarias para que la copia inicial y la activación del trigger no dejen un intervalo sin registrar.

### Acceso

Solo la sesión nativa del propietario puede consultar y restaurar el historial en 1.4. Los permisos existentes de los agentes siguen autorizando únicamente las herramientas y el documento actual que ya podían consultar. No añadir herramientas MCP de historial ni ampliar permisos automáticamente.

Habilitar RLS por propietario en la nueva tabla; rechazar lectura OAuth y anónima. El cliente no obtiene INSERT, UPDATE o DELETE sobre las versiones. El registro y la limpieza se realizan desde funciones internas acotadas, con identidad validada y sin rutas administrativas públicas. Referencia: [RLS en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 3. Consulta y restauración

Añadir un botón discreto **Historial** en la cabecera del panel actual. No crear otra sección de menú ni un dashboard.

- Antes de abrirlo, resolver el guardado pendiente; si falla, mantener el borrador y las acciones de recuperación.
- Mostrar una lista con fecha, origen y marca de estado actual. La consulta de una versión anterior es de solo lectura y no cambia el editor ni sus datos.
- Mostrar los metadatos y el contenido de la versión seleccionada. Permitir descargarla.
- Restaurar solo tras mostrar la versión concreta y pedir confirmación.

La restauración crea un nuevo estado actual y un nuevo punto de recuperación. No elimina la versión que se estaba usando.

La operación debe comprobar propietario, informe, ID y versión del punto seleccionado, además de la versión esperada del informe actual. Esto evita restaurar un punto que cambió por agrupamiento mientras se revisaba, o pisar una edición posterior de otra ventana.

Si la empresa histórica ya no existe, ofrecer restaurar sin relación, indicándolo antes de confirmar. Si hay un conflicto, conservar el texto y pedir recargar el historial; no aplicar automáticamente una restauración diferente.

Estados visibles: **Guardando**, **Guardado**, **Borrador en este dispositivo**, **Error al guardar**. Mostrar solo el estado que corresponda; explicar los fallos y ofrecer acciones cuando ocurran, sin añadir texto permanente.

## 4. Orden de implementación

1. Preparar migración, trigger de versiones y restauración atómica; probar permisos y conflictos localmente antes de tocar producción.
2. Añadir almacén IndexedDB y recuperación al controlador de autosave, con aislamiento de pestañas y limpieza al cerrar sesión.
3. Integrar los avisos de recuperación y el botón Historial en el panel existente. Mantener el editor y el contrato Markdown.
4. Verificar el recorrido completo y actualizar la documentación.
5. Tras aprobación del alcance, aplicar la migración probada y publicar la versión 1.4 en Vercel; comprobar commit, alias y resultado real.

Archivos principales: `lib/report-autosave.ts`, nuevos módulos de borradores/versiones, `app/report-drawer.tsx`, `app/reports.tsx`, APIs privadas de historial/restauración, integración cliente de cierre de sesión, migración SQL y pruebas. La implementación debe leer las guías locales de Next.js correspondientes antes de escribir código.

## 5. Criterios de aceptación

- Cerrar y reabrir la pestaña después de editar sin red permite recuperar el último borrador local confirmado por IndexedDB, sin envío automático.
- Guardar una edición anterior no elimina una copia local más nueva.
- Pestañas y cuentas diferentes no se sobrescriben ni muestran borradores ajenos.
- Cerrar sesión limpia los borradores de la cuenta y detiene su escritura en las otras pestañas.
- Expirar la sesión, fallar IndexedDB o alcanzar la cuota no produce un falso estado de Guardado.
- Recuperar una importación sigue exigiendo su aceptación; recuperar un documento con cambios externos ofrece una copia nueva.
- Guardados desde la interfaz, propiedades de tabla y MCP registran origen y versión en la misma transacción.
- El historial no contiene duplicados por escrituras sin cambios ni más de 30 puntos por informe; agrupamiento y limpieza no afectan a otros informes.
- Un agente autorizado para el documento actual no puede leer ni restaurar versiones históricas.
- Restaurar conserva el estado previo y rechaza conflictos, versiones de otra cuenta y versiones históricas que cambiaron o dejaron de existir.
- Empresa histórica eliminada se resuelve explícitamente sin modificar datos de empresas ni perder el informe.
- Markdown, tablas, checklist e intercambio MCP siguen funcionando.
- Pasan pruebas de almacenamiento, carreras de autosave, SQL/RLS y restauración, TypeScript y build. Se verifica la UI de recuperación y restauración; si el navegador vuelve a fallar, se documenta y no se declara esa validación completada.

## Ejecución aprobada

El usuario aprobó la ejecución de este alcance. Implementación y validación 1.4 completadas; migración aplicada en Supabase. Ver docs/current-state.md para estado de publicación y límites de verificación.
