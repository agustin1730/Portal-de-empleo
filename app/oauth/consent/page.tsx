import {redirect} from "next/navigation";
import {getCurrentUser} from "../../../lib/auth";
import {createClient} from "../../../lib/supabase/server";
import {authorizationId,connectorClientAllowed} from "../../../lib/company-connector-auth";
import {permissionOptions} from "../../../lib/connector-permissions";
import {permissionRow} from "../../../lib/connector-permissions-store";
export const dynamic="force-dynamic";
export default async function Consent({searchParams}:{searchParams:Promise<{authorization_id?:string}>}) {
  const id=authorizationId((await searchParams).authorization_id);
  if(!id)return <main className="setup-screen"><section className="setup-card"><h1>Solicitud inválida</h1><a href="/">Volver al portal</a></section></main>;
  const user=await getCurrentUser();
  if(!user)redirect("/login?authorization_id="+encodeURIComponent(id));
  const client=await createClient(),{data,error}=await client.auth.oauth.getAuthorizationDetails(id);
  if(error||!data)return <main className="setup-screen"><section className="setup-card"><h1>No pudimos abrir la autorización</h1><p>Volvé al cliente e iniciá la conexión de nuevo.</p></section></main>;
  if(!("authorization_id" in data))redirect(data.redirect_url);
  if(!connectorClientAllowed(data.client.id))return <main className="setup-screen"><section className="setup-card"><h1>Conexión no habilitada</h1><p>Este cliente todavía no está habilitado en la configuración del servidor.</p><a href="/?vista=configuracion">Volver a Configuración</a></section></main>;
  const {permissions}=await permissionRow(user.userId,data.client.id);
  return <main className="setup-screen"><section className="setup-card"><h1>Conectar {data.client.name || "asistente"}</h1><p>Acceso autorizado en el portal:</p><ul>{permissionOptions.filter(p=>permissions[p.key]).map(p=><li key={p.key}>{p.label}</li>)}</ul>{!Object.values(permissions).some(Boolean)&&<p>Sin acceso a secciones. Elegí los permisos antes de usar la conexión.</p>}<a href="/?vista=configuracion" target="_blank" rel="noopener noreferrer">Configurar permisos</a><p>Archivos del CV y fotos bloqueados. No puede cambiar permisos, editar el CRM ni enviar mensajes.</p>{data.scope&&<p>Permisos de identidad solicitados: {data.scope}</p>}<small>Destino: {data.redirect_uri}</small><form action="/api/oauth/decision" method="post" className="add-form"><input type="hidden" name="authorization_id" value={id}/><button className="button primary" name="decision" value="approve">Autorizar conexión</button><button className="button" name="decision" value="deny">Cancelar</button></form></section></main>;
}
