import {getCurrentUser} from "../../../lib/auth";
import {getDashboard,changeDashboardTask} from "../../../lib/dashboard";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(){const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);try{return reply(await getDashboard(user.userId));}catch{return reply({error:"No pudimos cargar Inicio."},500);}}
export async function POST(request:Request){if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Origen no permitido."},403);const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);try{const text=await request.text();if(Buffer.byteLength(text)>5000)return reply({error:"Solicitud demasiado extensa."},413);return reply(await changeDashboardTask(user.userId,JSON.parse(text)));}catch(error){return reply({error:error instanceof Error?error.message:"No se pudo guardar."},400);}}
