import {authSiteUrl} from "../../../../../lib/auth-flow";
export const dynamic="force-dynamic";
export function GET() {
  const issuer=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(!issuer)return Response.json({error:"Conexión no configurada."},{status:503});
  return Response.json({resource:authSiteUrl()+"/mcp/companies",resource_name:"Mi búsqueda · Empresas",authorization_servers:[issuer.replace(/\/$/,"")+"/auth/v1"],bearer_methods_supported:["header"]},{headers:{"Cache-Control":"no-store"}});
}
