import { getCurrentUser } from "../../lib/auth";
import { listJobs, importJobs, updateJob, statuses } from "../../lib/jobs";
export const dynamic="force-dynamic";
const tools=[
 {name:"list_jobs",description:"Lista los empleos privados del usuario, con análisis, estados, notas y enlaces. Permite filtrar por estado o texto.",inputSchema:{type:"object",properties:{status:{type:"string",enum:[...statuses]},query:{type:"string"}},additionalProperties:false}},
 {name:"import_jobs",description:"Agrega o actualiza hasta 300 análisis laborales. Conserva estados, notas y fecha de postulación de registros existentes. Reutiliza el id devuelto por list_jobs al actualizar un empleo; evita duplicados. No envía postulaciones.",inputSchema:{type:"object",properties:{jobs:{type:"array",minItems:1,maxItems:300,items:{type:"object",properties:{id:{type:"string"},title:{type:"string"},company:{type:"string"},portal:{type:"string"},url:{type:"string"},gmail_url:{type:"string"},location_label:{type:"string"},mode:{type:"string"},industry:{type:"string"},company_logo_url:{type:"string"},score:{type:["number","null"]},provisional:{type:"boolean"},recommendation:{type:"string",enum:["Prioritise","Worth trying","Low priority","Needs description"]},summary:{type:"string"},matches:{type:"array",items:{type:"string"}},gaps:{type:"array",items:{type:"string"}},salary_label:{type:"string"},next_action:{type:"string"},key_requirement:{type:"string"},reason:{type:"string"},source_trash:{type:"boolean"}},required:["title","company"],additionalProperties:true}}},required:["jobs"],additionalProperties:false}},
 {name:"update_job",description:"Actualiza el estado, las notas o la fecha de una postulación del usuario. No postula al usuario a ningún empleo.",inputSchema:{type:"object",properties:{id:{type:"string"},status:{type:"string",enum:[...statuses]},contact:{type:"string",maxLength:200},email:{type:"string",maxLength:254},phone:{type:"string",maxLength:80},company:{type:"string",maxLength:200},title:{type:"string",maxLength:250},location_label:{type:"string",maxLength:200},notes:{type:"string",maxLength:12000},applied_at:{type:["string","null"],description:"Fecha YYYY-MM-DD, o null para borrar."}},required:["id"],additionalProperties:false}}
];
export async function POST(req:Request){
 let body:any;try{body=await req.json();}catch{return Response.json({jsonrpc:"2.0",id:null,error:{code:-32700,message:"Parse error"}},{status:400});}
 const result=(r:any)=>Response.json({jsonrpc:"2.0",id:body.id??null,result:r},{headers:{"Cache-Control":"no-store"}});
 if(body.method==="server/discover")return result({supportedVersions:["2026-07-28"],capabilities:{tools:{}}});
 if(body.method==="initialize")return result({protocolVersion:"2026-07-28",capabilities:{tools:{}},serverInfo:{name:"mi-busqueda",version:"1.0.0"}});
 if(body.method==="tools/list")return result({tools});
 if(body.method==="notifications/initialized")return new Response(null,{status:204});
 if(body.method!=="tools/call")return Response.json({jsonrpc:"2.0",id:body.id??null,error:{code:-32601,message:"Method not found"}});
 const user=await getCurrentUser();if(!user)return result({content:[{type:"text",text:"Sesión requerida."}],isError:true});
 try{
  const p=body.params||{},a=p.arguments||{};let data:any;
  if(p.name==="list_jobs"){data=await listJobs(user.userId);if(a.status)data=data.filter((j:any)=>j.status===a.status);if(a.query)data=data.filter((j:any)=>(j.title+" "+j.company).toLowerCase().includes(String(a.query).toLowerCase()));}
  else if(p.name==="import_jobs")data=await importJobs(user.userId,a.jobs);
  else if(p.name==="update_job")data=await updateJob(user.userId,a.id,a);
  else throw new Error("Herramienta no encontrada.");
  return result({content:[{type:"text",text:JSON.stringify(data)}]});
 }catch(e){return result({content:[{type:"text",text:e instanceof Error?e.message:"Error"}],isError:true});}
}
