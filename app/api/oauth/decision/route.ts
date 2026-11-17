import {getCurrentUser} from "../../../../lib/auth";
import {createClient} from "../../../../lib/supabase/server";
import {authSiteUrl} from "../../../../lib/auth-flow";
import {authorizationId,connectorClientAllowed} from "../../../../lib/company-connector-auth";
export async function POST(request:Request) {
  if(request.headers.get("origin")!==authSiteUrl())return new Response(null,{status:403});
  if(!await getCurrentUser())return new Response(null,{status:401});
  const form=await request.formData(),id=authorizationId(form.get("authorization_id")),decision=form.get("decision");
  if(!id||!["approve","deny"].includes(String(decision)))return new Response(null,{status:400});
  const client=await createClient(),details=await client.auth.oauth.getAuthorizationDetails(id);
  if(details.error||!details.data||!("authorization_id" in details.data)||!connectorClientAllowed(details.data.client.id))return Response.json({error:"Solicitud inválida o cliente no habilitado."},{status:403});
  const {data,error}=decision==="approve"?await client.auth.oauth.approveAuthorization(id,{skipBrowserRedirect:true}):await client.auth.oauth.denyAuthorization(id,{skipBrowserRedirect:true});
  if(error||!data)return Response.json({error:"No pudimos completar la autorización. Reiniciá la conexión."},{status:400});
  return new Response(null,{status:303,headers:{Location:data.redirect_url,"Cache-Control":"no-store"}});
}
