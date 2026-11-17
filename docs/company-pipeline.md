# CRM: prospección de empresas

Implementado 2026-11-16. En `/?vista=crm`, las pestañas Prospección y Postulaciones separan empresas objetivo de candidaturas reales. Las postulaciones existentes conservan tablero y tabla; la prospección usa Kanban de cinco etapas: Por investigar, Por contactar, Contactada, En conversación y Cerrada.

Cada empresa permite nombre, rubro, país/ubicación, sitio, fuente, puestos de interés, hasta diez contactos, notas, borrador de mensaje y una próxima acción con fecha. El tablero permite arrastrar tarjetas y ofrece un selector de etapa accesible. Para hoy incluye acciones vencidas y excluye empresas cerradas. Completar una acción la registra en el historial y limpia el pendiente. Cerrar una empresa la conserva en la última columna.

## Vista de tabla

Prospección permite alternar Tablero / Tabla. Kanban sigue como vista inicial. La tabla muestra empresa (rubro y país), contacto principal, etapa editable y próxima acción con fecha. Comparte búsqueda, filtro de rubro, Para hoy y el mismo editor de empresa; alternar vistas no cambia ni duplica registros. No agrega CSV ni modifica Postulaciones.

## Persistencia y privacidad

`GET/POST /api/companies` requiere el mismo propietario confirmado que el resto del portal. `lib/company-pipeline-store.ts` guarda solo la nueva colección administrativa `candidate_profiles.data.crm_prospects`, mezclada con las claves anteriores y protegida por la RLS existente. El servidor exige la versión `updated_at` leída y realiza una actualización condicional por propietario y versión. Conflictos o fallos no se anuncian como guardados. Los datos iniciales están vacíos: no se importan catálogos ni ejemplos.

Hasta 200 empresas y 50 eventos por empresa en este MVP. Los eventos los genera el servidor, no el cliente. No hay migración de esquema, nuevas credenciales ni API paga. Los datos empresariales privados no se incluyen en Git ni en datos públicos.

El mensaje es una plantilla editable, no generación semántica con IA. Se puede copiar; nunca se envía desde la web ni afirma experiencia no documentada. No se crean postulaciones automáticamente ni se alteran las métricas de candidaturas.

CSV, sincronización de correo, recordatorios externos, vinculación empresa-vacante y cartas basadas en evidencia quedan para fases posteriores. La fecha de próxima acción se consulta dentro de Prospección; no crea notificaciones del sistema ni tareas de Inicio.

## Verificación

Tests de validación y transiciones en `tests/company-pipeline.test.ts`; tests del adaptador de persistencia con cliente simulado en `tests/company-pipeline-store.test.ts` verifican aislamiento por propietario, preservación del perfil y conflictos. La RLS existente tiene cobertura separada en storage/profile tests. Una prueba de adaptador no equivale a iniciar sesión en producción: comprobar en una sesión propietaria al crear, recargar y mover una empresa real.

## Carga flexible de empresas

Solo el nombre de empresa es obligatorio; la etapa inicial es Por investigar. Sitio web, datos adicionales, contactos, seguimiento y notas son opcionales. Datos adicionales, contactos y notas se agrupan en secciones desplegables. Los contactos pueden tener solo teléfono, cargo o correo; los vacíos se omiten. Los dominios sin protocolo se guardan con HTTPS.

Acción y fecha son independientes. Sin fecha / Hoy / Mañana / Elegir fecha permiten programar el seguimiento en horario argentino. Una fecha sin acción se muestra como Seguimiento y también se puede marcar realizada. El cambio conserva tablero, tabla y persistencia privada.

## Importación CSV

Prospección suma Importar CSV con vista previa y asociación editable de columnas; solo Empresa es obligatoria. Archivos UTF-8 de hasta 1 MB, hasta 200 filas, separados por coma, punto y coma o tabulación. Admite comillas escapadas y celdas multilínea; rechaza estructuras inválidas. Fechas ISO AAAA-MM-DD, etapas existentes y contactos validados igual que la edición manual.

El usuario confirma las filas nuevas después de revisar el resumen. Las filas inválidas bloquean la importación hasta corregir el archivo. Se omiten duplicados por nombre normalizado o dominio web, tanto del archivo como del CRM; nunca actualiza ni reabre empresas existentes. Se conserva el límite de 200 empresas del CRM. El servidor vuelve a validar todo el lote y lo guarda en una única actualización condicionada por propietario y versión; ningún error de validación produce una importación parcial. La misma ruta privada acepta lotes hasta 1,5 MB. El archivo se lee en el navegador; se envían los registros confirmados, sin servicios externos ni IA.

Pruebas CSV y persistencia cubren delimitadores, comillas, estructura inválida, límites, selección de columnas, datos parciales, duplicados, preservación del perfil, conflictos y lotes inválidos sin escritura. No incluye exportación CSV ni cambios en /empresas.


## Simplificación visual de Prospección

Barra compacta con búsqueda, selector de rubro, botón Para hoy con estado activo, limpieza de filtros y selector Tablero/Tabla. Se elimina el contador global de empresas y su fila independiente. Las tarjetas Kanban muestran solo nombre y enlace web directo seguro; el resto de información permanece en el editor y en Tabla. Se elimina el selector de etapa de la tarjeta, conservando cambio por arrastre o editor/tabla. Datos privados y API sin cambios.


## Propiedades de selección

El editor de empresa usa País con 195 opciones en español: 193 miembros ONU y dos observadores, etiquetas CLDR mediante Intl.DisplayNames. Fuente ofrece CESSI, Apollo, LinkedIn y Manual. Ambos permiten selección vacía y conservan explícitamente el valor actual si no está en el catálogo (incluidas ubicaciones históricas e importaciones CSV); no hay migración de datos. Rubro permite sugerencias de 18 sectores más rubros ya registrados, conservando escritura libre. Catálogos en lib/company-options.ts, sin dependencias ni servicios nuevos. CSV y validación del API siguen aceptando valores libres compatibles con registros existentes.

## Etiquetas y tipografía

Tarjetas con rubro y país como etiquetas de color suave, sitio web y próxima acción/fecha solo cuando existe. Etiquetas editables desde la tarjeta mediante menú con búsqueda; el mismo componente se usa para rubro, país y fuente en el editor. Escape y clic fuera cierran el menú, opciones accesibles por Tab y botones nativos. Rubro admite valores nuevos de hasta 200 caracteres. En tarjeta, elegir escribe con la versión actual mediante el guardado existente; el editor conserva el flujo guardar/cancelar. Los errores siguen el aviso del CRM. No hay escritura al abrir ni buscar en un menú.

Inter sustituye DM Sans/Manrope como tipografía de texto de la app, con carga Google Fonts y fallback Arial; no se asegura identidad exacta con una fuente de imagen generada. Iconos Lucide existentes, consistentes con etiquetas y enlaces. No se agregan dependencias, APIs ni migraciones. El estilo global cubre encabezados y componentes con definiciones tipográficas anteriores sin alterar su distribución.


## Contactos LinkedIn y campos opcionales (2026-11-17)

Cada contacto suma LinkedIn opcional, con normalización HTTPS cuando falta protocolo y enlace directo desde el editor. Un contacto con solo LinkedIn se conserva; los contactos anteriores sin esta propiedad siguen funcionando. El CSV reconoce LinkedIn / LinkedIn del contacto / contact linkedin.

Ningún campo visible es obligatorio para guardar una ficha, incluido nombre de empresa. Nombre vacío se conserva como tal y la interfaz muestra Sin nombre sin inventar un nombre persistido. Etapa conserva su valor inicial por defecto. CSV permite no mapear Empresa, aunque exige seleccionar alguna columna para evitar una importación sin datos asociados. Se mantienen validaciones de formato cuando hay datos: enlaces HTTP/HTTPS de LinkedIn sin credenciales, correo válido y fechas reales. No cambian el límite de registros, privacidad ni control de versión.


## Movimiento fluido del Kanban (2026-11-17)

Arrastre HTML nativo con vista previa de tarjeta, origen atenuado, resaltado de columna y marcador de destino. Auto-scroll horizontal por requestAnimationFrame cerca de los bordes. Al soltar se actualiza la etapa visualmente de inmediato, se guarda por la API existente y se revierte al estado previo si falla; el servidor sigue confirmando el guardado real. No altera el orden persistido dentro de una columna.

Animaciones FLIP con Web Animations sobre transform, duración 260 ms, para cambio de columna y desplazamiento de otras tarjetas. Coordenadas relativas al tablero para soportar scroll horizontal. Respeta prefers-reduced-motion, sin animación de movimiento en ese modo. Edición por formulario/tabla se conserva como alternativa al arrastre. No se agregan bibliotecas ni cambios de datos/API. La prueba company-pipeline-drag.test.ts verifica actualización inmediata, conservación de notas/contactos y reversión cuando falla el guardado; no sustituye una prueba visual en navegador.

