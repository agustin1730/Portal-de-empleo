import {BriefcaseBusiness} from "lucide-react";
import {signIn,signUp,recoverPassword,resendConfirmation} from "./actions";
import AuthSubmit from "./submit";
import {getCurrentUser} from "../../lib/auth";
import {isConfigured} from "../../lib/config";
import {redirect} from "next/navigation";
export const dynamic="force-dynamic";
const errors:Record<string,string>={
 invalid:"No pudimos iniciar sesión. Revisá tus credenciales.",
 access:"Usá el correo propietario de este espacio para crear tu acceso.",
 password:"Las contraseñas deben coincidir y tener entre 12 y 128 caracteres.",
 signup:"No pudimos crear el acceso. Si ya tenés una cuenta, probá recuperar tu contraseña.",
 exists:"Este correo ya tiene una cuenta. Iniciá sesión o recuperá tu contraseña.",
 rate:"Se enviaron varios intentos. Esperá unos minutos antes de volver a probar.",
 recovery:"No pudimos enviar el enlace. Intentá de nuevo en unos minutos.",
 resend:"No pudimos reenviar la confirmación. Intentá de nuevo más tarde.",
 unconfirmed:"Primero confirmá tu correo. Podés solicitar un nuevo enlace acá.",
 confirmation:"El enlace venció o se abrió en otro navegador. Si ya confirmaste tu correo, intentá iniciar sesión. Si no, solicitá otro enlace.",
};
export default async function Login({searchParams}:{searchParams:Promise<{error?:string;mode?:string;notice?:string}>}){
 if(!isConfigured())redirect("/");
 if(await getCurrentUser())redirect("/");
 const {error,mode,notice}=await searchParams;
 const screen=mode==="signup"?"signup":mode==="recover"?"recover":mode==="confirm"?"confirm":"signin";
 const config={
  signin:{title:"Volvé a tu búsqueda.",intro:"Ingresá para revisar tus oportunidades y continuar donde lo dejaste.",action:signIn,button:"Entrar a mi búsqueda"},
  signup:{title:"Creá tu acceso.",intro:"Elegí una contraseña para tu espacio privado. Después confirmá tu correo para activar tu cuenta.",action:signUp,button:"Crear mi acceso"},
  recover:{title:"Recuperá tu acceso.",intro:"Te enviaremos un enlace para elegir una nueva contraseña.",action:recoverPassword,button:"Enviar enlace de recuperación"},
  confirm:{title:"Confirmá tu correo.",intro:"Abrí el enlace del correo de confirmación en este mismo navegador. ¿No llegó? Revisá spam o solicitá otro enlace.",action:resendConfirmation,button:"Reenviar confirmación"},
 }[screen];
 const message=notice==="confirmation"?"Revisá tu correo para confirmar tu cuenta.":notice==="recovery"?"Si el correo corresponde a una cuenta habilitada, recibirás el enlace de recuperación.":notice==="password"?"Contraseña actualizada. Ya podés iniciar sesión.":"";
 return <main className="setup-screen"><section className="setup-card login-card"><div className="brand-icon"><BriefcaseBusiness size={23}/></div><p className="eyebrow">TU ESPACIO PERSONAL</p><h1>{config.title}</h1><p>{config.intro}</p>
 {message&&<div className="auth-notice" role="status">{message}</div>}
 <form action={config.action} className="add-form">
 <label>Correo electrónico<input name="email" type="email" autoComplete="username" required maxLength={254}/></label>
 {(screen==="signin"||screen==="signup")&&<label>{screen==="signup"?"Elegí tu contraseña":"Contraseña"}<input name="password" type="password" autoComplete={screen==="signup"?"new-password":"current-password"} required minLength={screen==="signup"?12:1} maxLength={128}/>{screen==="signup"&&<small>Entre 12 y 128 caracteres.</small>}</label>}
 {screen==="signup"&&<label>Confirmar contraseña<input name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label>}
 {error&&errors[error]&&<p className="form-error" role="alert">{errors[error]}</p>}
 <AuthSubmit>{config.button}</AuthSubmit></form>
 {screen==="signin"?<div className="auth-links"><a href="/login?mode=signup">Crear mi acceso</a><a href="/login?mode=recover">Olvidé mi contraseña</a></div>:<a className="auth-back" href="/login">Ya tengo acceso · Iniciar sesión</a>}
 {screen==="signin"&&error==="confirmation"&&<a className="auth-back" href="/login?mode=confirm">Solicitar otra confirmación</a>}
 <small>Acceso exclusivo para el correo propietario de este espacio.</small></section></main>;
}
