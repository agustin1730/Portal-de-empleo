import {getCurrentUser} from "../../../lib/auth";
import {listJobs,importJobs,updateJob} from "../../../lib/jobs";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
async function readBody(req:Request){const text=await req.text();if(new TextEncoder().encode(text).length>2000000)throw new Error("El archivo supera 2 MB.");return JSON.parse(text);}
function sameOrigin(req:Request){const origin=req.headers.get("origin");return !origin||origin===new URL(req.url).origin;}
export async function GET(){const user=await getCurrentUser();if(!user)return reply({error:"Iniciá sesión para ver tus empleos."},401);
 try{return reply({jobs:await listJobs(user.userId)});}catch{return reply({error:"No pudimos cargar tus empleos. Verificá la conexión y la migración de Supabase."},500);}}
export async function POST(req:Request){if(!sameOrigin(req))return reply({error:"Origen no permitido."},403);const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);
 try{const data=await readBody(req);return reply(await importJobs(user.userId,data.jobs));}catch(e){return reply({error:e instanceof Error?e.message:"No se pudo importar."},400);}}
export async function PATCH(req:Request){if(!sameOrigin(req))return reply({error:"Origen no permitido."},403);const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);
 try{const data=await readBody(req);return reply(await updateJob(user.userId,data.id,data));}catch(e){return reply({error:e instanceof Error?e.message:"No se guardó el cambio."},400);}}
