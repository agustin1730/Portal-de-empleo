import {BriefcaseBusiness,LockKeyhole} from "lucide-react";
import {signIn} from "./actions";
import {getCurrentUser} from "../../lib/auth";
import {isConfigured} from "../../lib/config";
import {redirect} from "next/navigation";
export const dynamic="force-dynamic";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(!isConfigured())redirect("/");
 if(await getCurrentUser())redirect("/");
 const {error}=await searchParams;
 return <main className="setup-screen"><section className="setup-card login-card"><div className="brand-icon"><BriefcaseBusiness size={23}/></div><p className="eyebrow">TU ESPACIO PERSONAL</p><h1>Volvé a tu búsqueda.</h1><p>Ingresá para revisar tus oportunidades y continuar donde lo dejaste.</p><form action={signIn} className="add-form"><label>Correo electrónico<input name="email" type="email" autoComplete="username" required/></label><label>Contraseña<input name="password" type="password" autoComplete="current-password" required minLength={8}/></label>{error&&<p className="form-error" role="alert">No pudimos iniciar sesión. Revisá tus credenciales e intentá de nuevo.</p>}<button className="button primary full"><LockKeyhole size={15}/>Entrar a mi búsqueda</button></form><small>Acceso reservado al propietario del proyecto. No compartas tu contraseña.</small></section></main>;
}
