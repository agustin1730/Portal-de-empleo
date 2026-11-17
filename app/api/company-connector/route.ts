import {getCurrentUser} from "../../../lib/auth";
import {connectorResourceAllowed,connectorClientAllowed} from "../../../lib/company-connector-auth";
import {readConnectorCompanies} from "../../../lib/company-research-store";
import {authSiteUrl} from "../../../lib/auth-flow";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request:Request){
  const user=await getCurrentUser({allowOAuth:true});
  if(!user||(user.oauthClientId&&(!connectorClientAllowed(user.oauthClientId)||!connectorResourceAllowed(user.oauthResource,authSiteUrl()))))return reply({error:"Sesión requerida."},401);
  try{const id=new URL(request.url).searchParams.get("id");return reply({companies:await readConnectorCompanies(id??undefined)});}catch(e){return reply({error:e instanceof Error?e.message:"No pudimos leer las empresas."},400);}
}
