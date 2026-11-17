# Contactos en el CRM

2026-11-17. Tercera pestaña Contactos junto a Empresas y Postulaciones. Tabla de nombre/cargo, empresa vinculada, correo y accesos a LinkedIn/teléfono, búsqueda por datos y filtro por empresa. No se envían mensajes automáticamente. Elegir la empresa abre su ficha.

Los contactos siguen siendo los mismos objetos de crm_prospects[].contacts: no hay tabla paralela, migración ni duplicación. Los contactos previos aparecen directamente. Crear/editar/mover/eliminar usa /api/companies con propietario y versión, guardando una única actualización del perfil. El movimiento quita de origen y agrega a destino atómicamente; un error o conflicto no confirma guardado. Se preservan notas, seguimiento y otros campos de empresa/perfil. Requiere empresa existente y algún dato del contacto; no exige nombre, correo ni teléfono específicos. Se conserva el límite existente de 10 contactos por empresa. Los campos y validaciones existentes de contactos siguen vigentes.

Las referencias son empresa+índice de contacto bajo la versión leída: el control de versión bloquea operaciones sobre una colección cambiada por otra pestaña. No se cambia la representación de los registros anteriores. Eliminar pide confirmación y afecta ese contacto de ambas vistas. La ficha de empresa y CSV siguen reflejando los mismos contactos. Los borradores con cambios se confirman al cerrar; un conflicto permite descartar y recargar.

89 tests y build final de producción aprobados; typecheck del checkout aprobado. Tests cubren contactos parciales, edición compartida, movimiento sin duplicados, borrado selectivo, límite de destino, conservación del perfil y conflictos. Sin recorrido autenticado en navegador ni modificaciones de datos reales durante la implementación.
