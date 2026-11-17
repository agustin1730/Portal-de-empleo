import {getCurrentUser} from "../../../lib/auth";
import {authSiteUrl} from "../../../lib/auth-flow";
import {connectorResourceAllowed,connectorClientAllowed,connectorOriginAllowed} from "../../../lib/company-connector-auth";
import {companyMcpResponse} from "../../../lib/company-mcp-http";
import {readConnectorCompanies,readResearch,saveResearch} from "../../../lib/company-research-store";
import {effectivePermissions,readConnectorSection} from "../../../lib/connector-permissions-store";
export const dynamic="force-dynamic";
function unauthorized() {
  return Response.json({error:"Autorizá la conexión con tu cuenta del portal."},{status:401,headers:{"Cache-Control":"no-store","WWW-Authenticate":`Bearer resource_metadata="${authSiteUrl()}/.well-known/oauth-protected-resource/mcp/companies"`}});
}
export async function POST(request:Request) {
  if(!connectorOriginAllowed(request.headers.get("origin"),authSiteUrl()))return new Response(null,{status:403});
  if(!request.headers.get("authorization")?.startsWith("Bearer "))return unauthorized();
  const user=await getCurrentUser({allowOAuth:true});
  if(!user || (!connectorClientAllowed(user.oauthClientId)||!connectorResourceAllowed(user.oauthResource,authSiteUrl())))return unauthorized();
  return companyMcpResponse(request,{companies:readConnectorCompanies,research:readResearch,save:saveResearch,permissions:effectivePermissions,contacts:()=>readConnectorSection("contacts"),applications:()=>readConnectorSection("applications"),profile:()=>readConnectorSection("profile")});
}
export async function GET(request:Request) {
  if(!connectorOriginAllowed(request.headers.get("origin"),authSiteUrl()))return new Response(null,{status:403});
  return new Response(null,{status:405,headers:{Allow:"POST","Cache-Control":"no-store"}});
}
