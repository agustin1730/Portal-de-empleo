import {createClient} from "./supabase/server";
import {normalizePermissions,storedPermissions,type ConnectorPermissions} from "./connector-permissions";
export async function effectivePermissions():Promise<ConnectorPermissions>{
  const db=await createClient(),{data,error}=await db.rpc("connector_effective_permissions");
  if(error)throw new Error("No pudimos verificar los permisos de la conexión.");
  return storedPermissions(data);
}
export async function permissionRow(owner:string,clientId:string){const db=await createClient(),{data,error}=await db.from("connector_permissions").select("permissions,updated_at").eq("owner_id",owner).eq("client_id",clientId).maybeSingle();if(error)throw new Error("No pudimos leer los permisos.");return {permissions:storedPermissions(data?.permissions),version:data?.updated_at||null};}
export async function savePermissions(clientId:string,permissions:unknown,version:unknown){
  if(version!==null&&(typeof version!=="string"||version.length>50||!Number.isFinite(Date.parse(version))))throw new Error("Recargá los permisos antes de guardar.");
  const clean=normalizePermissions(permissions),db=await createClient(),{data,error}=await db.rpc("connector_save_permissions",{p_client_id:clientId,p_permissions:clean,p_expected_version:version});
  if(error)throw new Error(error.code==="40001"?"Los permisos cambiaron. Recargá antes de guardar.":"No pudimos guardar los permisos.");
  return {permissions:storedPermissions(data.permissions),version:data.updated_at};
}
export async function readConnectorSection(section:"contacts"|"applications"|"profile"){
  const db=await createClient(),{data,error}=await db.rpc("connector_"+section);
  if(error)throw new Error("No tenés permiso para consultar esta sección.");
  return data;
}
