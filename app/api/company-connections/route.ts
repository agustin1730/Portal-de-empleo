import {getCurrentUser} from "../../../lib/auth";
import {createClient} from "../../../lib/supabase/server";
import {connectorClientAllowed} from "../../../lib/company-connector-auth";
import {permissionRow,savePermissions} from "../../../lib/connector-permissions-store";
import {authSiteUrl} from "../../../lib/auth-flow";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(){
  const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);
  try{const client=await createClient(),{data,error}=await client.auth.oauth.listGrants();if(error)return reply({error:"No pudimos consultar las conexiones."},503);
    const ids=[...new Set((process.env.MCP_COMPANY_CLIENT_IDS||"").split(",").map(v=>v.trim()).filter(Boolean))];
    const connections=await Promise.all(ids.map(async id=>{const grant=data?.find(g=>g.client.id===id);return {id,name:grant?.client.name||"Asistente conectado",authorized:!!grant,...await permissionRow(user.userId,id)};}));
    return reply({connections});
  }catch{return reply({error:"No pudimos leer los permisos. Comprobá la configuración de la actualización."},503);}
}
export async function POST(request:Request){
  if(request.headers.get("origin")!==authSiteUrl())return reply({error:"Origen no permitido."},403);
  if(!await getCurrentUser())return reply({error:"Sesión requerida."},401);
  try{const raw=await request.text();if(raw.length>4000)return reply({error:"Solicitud inválida."},400);const body=JSON.parse(raw),clientId=body.clientId;
    if(!connectorClientAllowed(clientId))return reply({error:"Conexión no habilitada."},400);
    if(body.action==="permissions")return reply(await savePermissions(clientId,body.permissions,body.version));
    if(body.action!=="revoke")return reply({error:"Acción inválida."},400);
    const client=await createClient(),{error}=await client.auth.oauth.revokeGrant({clientId});return error?reply({error:"No pudimos revocar la conexión."},400):reply({revoked:true});
  }catch(e){return reply({error:e instanceof Error?e.message:"Solicitud inválida."},400);}
}
