import {getCurrentUser} from "../../../lib/auth";
import {readCompanyPipeline,companyRows,saveCompanyPipeline} from "../../../lib/company-pipeline-store";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(){const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);try{const {row}=await readCompanyPipeline(user.userId);return reply({companies:companyRows(row?.data),version:row?.updated_at||null});}catch{return reply({error:"No pudimos cargar las empresas."},500);}}
export async function POST(request:Request){if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Origen no permitido."},403);const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);try{const raw=await request.text();if(Buffer.byteLength(raw)>1_500_000)return reply({error:"Solicitud demasiado extensa."},413);return reply(await saveCompanyPipeline(user.userId,JSON.parse(raw)));}catch(error){return reply({error:error instanceof Error?error.message:"No se pudo guardar."},400);}}

