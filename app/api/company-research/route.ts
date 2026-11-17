import {getCurrentUser} from "../../../lib/auth";
import {connectorResourceAllowed,connectorClientAllowed} from "../../../lib/company-connector-auth";
import {authSiteUrl} from "../../../lib/auth-flow";
import {readResearch,saveResearch} from "../../../lib/company-research-store";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
async function permitted(){const user=await getCurrentUser({allowOAuth:true});return user&&(!user.oauthClientId||(connectorClientAllowed(user.oauthClientId)&&connectorResourceAllowed(user.oauthResource,authSiteUrl())));}
export async function GET(request:Request){if(!await permitted())return reply({error:"Sesión requerida."},401);try{return reply({research:await readResearch(new URL(request.url).searchParams.get("id")||"")});}catch(e){return reply({error:e instanceof Error?e.message:"No pudimos leer el informe."},400);}}
export async function POST(request:Request){
  if(request.headers.get("origin")&&request.headers.get("origin")!==authSiteUrl())return reply({error:"Origen no permitido."},403);
  if(!await permitted())return reply({error:"Sesión requerida."},401);
  try{const raw=await request.text();if(Buffer.byteLength(raw)>60000)return reply({error:"Informe demasiado extenso."},413);const body=JSON.parse(raw);return reply({research:await saveResearch(body.id,body.report,body.expected_version)});}catch(e){return reply({error:e instanceof Error?e.message:"No pudimos guardar."},400);}
}
