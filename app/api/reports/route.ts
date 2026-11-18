import {getCurrentUser} from "../../../lib/auth";
import {authSiteUrl} from "../../../lib/auth-flow";
import {getReport,listReports,saveReport} from "../../../lib/reports-store";
import {ReportError} from "../../../lib/reports";
export const dynamic="force-dynamic";
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
const failure=(e:unknown)=>reply({error:e instanceof ReportError?e.message:"No pudimos completar la operación."},e instanceof ReportError?e.status:500);
export async function GET(request:Request){
 if(!await getCurrentUser())return reply({error:"Sesión requerida."},401);
 try{const p=new URL(request.url).searchParams;return p.has("id")?reply({report:await getReport(p.get("id"))}):reply(await listReports(Number(p.get("offset")||0)));}catch(e){return failure(e);}
}
export async function POST(request:Request){
 if(request.headers.get("origin")&&request.headers.get("origin")!==authSiteUrl())return reply({error:"Origen no permitido."},403);
 if(!await getCurrentUser())return reply({error:"Sesión requerida."},401);
 try{if(Number(request.headers.get("content-length"))>60000)return reply({error:"Informe demasiado extenso."},413);const raw=await request.text();if(Buffer.byteLength(raw)>60000)return reply({error:"Informe demasiado extenso."},413);let body;try{body=JSON.parse(raw);}catch{return reply({error:"Solicitud inválida."},400);}return reply({report:await saveReport(body?.report,body?.expected_version)});}catch(e){return failure(e);}
}
