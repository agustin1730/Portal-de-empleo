export const permissionOptions = [
  {key:"companies",label:"Empresas",detail:"Datos y enlaces de las empresas."},
  {key:"contacts",label:"Contactos",detail:"Nombre, cargo, correo, teléfono y LinkedIn."},
  {key:"applications",label:"Postulaciones",detail:"Puesto, empresa, etapa, fecha y oferta original."},
  {key:"profile",label:"Mi perfil profesional",detail:"Resumen, experiencia, formación, habilidades, idiomas y portfolio."},
  {key:"notes",label:"Notas privadas",detail:"Solo de las secciones que habilites."},
  {key:"research_read",label:"Leer investigaciones",detail:"Contenido completo de los informes guardados."},
  {key:"research_write",label:"Guardar investigaciones",detail:"Crear o reemplazar informes; requiere lectura."}
] as const;
export type PermissionKey=typeof permissionOptions[number]["key"];
export type ConnectorPermissions=Record<PermissionKey,boolean>;
export const noPermissions:ConnectorPermissions={companies:false,contacts:false,applications:false,profile:false,notes:false,research_read:false,research_write:false};
export function normalizePermissions(value:unknown):ConnectorPermissions {
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Permisos inválidos.");
  const input=value as Record<string,unknown>,result={...noPermissions};
  if(Object.keys(input).some(k=>!Object.hasOwn(result,k)))throw new Error("Permiso no reconocido.");
  for(const {key} of permissionOptions){if(typeof input[key]!=="boolean")throw new Error("Completá todos los permisos.");result[key]=input[key] as boolean;}
  if(result.research_write&&!result.research_read)throw new Error("Guardar investigaciones requiere habilitar su lectura.");
  return result;
}
export function storedPermissions(value:unknown):ConnectorPermissions {try{return normalizePermissions(value);}catch{return {...noPermissions};}}
export const toolPermission:Record<string,PermissionKey|null>={get_access_permissions:null,list_companies:"companies",get_company:"companies",list_contacts:"contacts",list_applications:"applications",get_professional_profile:"profile",get_company_research:"research_read",save_company_research:"research_write"};
export function toolAllowed(name:string,permissions:ConnectorPermissions){return Object.hasOwn(toolPermission,name)&&(toolPermission[name]===null||permissions[toolPermission[name]!]===true);}
