import {getCurrentUser} from "../../../lib/auth";
import {createClient} from "../../../lib/supabase/server";
import {connectorClientAllowed} from "../../../lib/company-connector-auth";
import {authSiteUrl} from "../../../lib/auth-flow";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(){if(!await getCurrentUser())return reply({error:"Sesión requerida."},401);const client=await createClient(),{data,error}=await client.auth.oauth.listGrants();return error?reply({error:"OAuth todavía no está habilitado o no pudimos consultar las conexiones."},503):reply({grants:(data||[]).filter(g=>connectorClientAllowed(g.client.id)).map(g=>({id:g.client.id,name:g.client.name,granted_at:g.granted_at}))});}
export async function POST(request:Request){
  if(request.headers.get("origin")!==authSiteUrl())return reply({error:"Origen no permitido."},403);
  if(!await getCurrentUser())return reply({error:"Sesión requerida."},401);
  try{const raw=await request.text();if(raw.length>1000)return reply({error:"Solicitud inválida."},400);const {clientId}=JSON.parse(raw);if(!connectorClientAllowed(clientId))return reply({error:"Conexión no habilitada."},400);const client=await createClient(),{error}=await client.auth.oauth.revokeGrant({clientId});return error?reply({error:"No pudimos revocar la conexión."},400):reply({revoked:true});}catch{return reply({error:"Solicitud inválida."},400);}
}
