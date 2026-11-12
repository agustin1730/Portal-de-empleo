import {LockKeyhole} from "lucide-react";
import {requireUser} from "../../lib/auth";
import {savePassword} from "./actions";
import AuthSubmit from "../login/submit";
export const dynamic="force-dynamic";
export default async function Password({searchParams}:{searchParams:Promise<{error?:string}>}){
 await requireUser();const {error}=await searchParams;
 return <main className="setup-screen"><section className="setup-card login-card"><div className="brand-icon"><LockKeyhole size={23}/></div><p className="eyebrow">TU ACCESO PRIVADO</p><h1>Elegí tu nueva contraseña.</h1><p>Usá entre 12 y 128 caracteres. Confirmala para guardar el cambio.</p><form action={savePassword} className="add-form"><label>Nueva contraseña<input type="password" name="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label><label>Confirmar contraseña<input type="password" name="confirmation" autoComplete="new-password" required minLength={12} maxLength={128}/></label>{error&&<p className="form-error" role="alert">{error==="password"?"Las contraseñas deben coincidir y tener entre 12 y 128 caracteres.":"No pudimos guardar la contraseña. Probá con una diferente."}</p>}<AuthSubmit>Guardar contraseña</AuthSubmit></form><a className="auth-back" href="/">Volver a mi búsqueda</a></section></main>;
}
