import {assessFit,normalizeAssessment} from "./fit";
import {emptyProfile} from "./profile-data";
import {createClient} from "./supabase/server";
import {normalizeJob,statuses} from "./job-data";
export {statuses} from "./job-data";
type Data=Record<string,any>;
function fail(error:unknown){if(error){console.error("Job storage request failed");throw new Error("No pudimos guardar o leer los datos. Verificá la conexión y la migración de Supabase.");}}
function validDate(x:unknown){if(typeof x!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(x))return null;const d=new Date(x+"T00:00:00Z");return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===x?x:null;}
export async function deleteJob(owner:string,id:string){
 if(typeof id!=="string"||!/^[a-zA-Z0-9_-]{1,80}$/.test(id))throw new Error("Postulación no válida.");
 const db=await createClient();
 const {data,error}=await db.from("jobs").delete().eq("owner_id",owner).eq("id",id).in("status",["postulado","contactado","entrevista","oferta","descartado"]).select("id").single();
 fail(error);if(!data)throw new Error("No se encontró la postulación.");
 return {id:data.id,deleted:true};
}
export async function listJobs(owner:string){
 const db=await createClient();const rows:Data[]=[];
 for(let start=0;;start+=500){
  const {data,error}=await db.from("jobs").select("*").eq("owner_id",owner).order("created_at",{ascending:false}).order("id").range(start,start+499);
  fail(error);rows.push(...(data||[]));if(!data||data.length<500)break;
 }
 const {data:profile,error:profileError}=await db.from("candidate_profiles").select("data,updated_at").eq("owner_id",owner).maybeSingle();fail(profileError);
 return rows.map(r=>{const fit=assessFit(r.payload,profile?{...emptyProfile,...profile.data}:null,profile?.updated_at||null);return {...r.payload,score:fit.score,fit,id:r.id,status:r.status,notes:r.notes,applied_at:r.applied_at,created_at:r.created_at,updated_at:r.updated_at};});
}
export async function importJobs(owner:string,items:Data[]){
 if(!Array.isArray(items)||items.length<1||items.length>300)throw new Error("Importá entre 1 y 300 empleos.");
 const clean=await Promise.all(items.map(normalizeJob)),db=await createClient();
 const {data:existing,error}=await db.from("jobs").select("id,payload").eq("owner_id",owner).in("id",clean.map(j=>j.id));fail(error);
 const previous=new Map((existing||[]).map(r=>[r.id,r.payload]));
 const records=await Promise.all(clean.map(async(job,i)=>({
  id:job.id,payload:previous.has(job.id)?await normalizeJob({...previous.get(job.id),...items[i],id:job.id}):job,
  status:statuses.includes(items[i].status)?items[i].status:"pendiente",
  notes:typeof items[i].notes==="string"?items[i].notes.slice(0,12000):"",
  applied_at:validDate(items[i].applied_at),
 })));
 const {data,error:saveError}=await db.rpc("import_jobs",{records});fail(saveError);
 return data as {added:number;updated:number;total:number};
}
export async function updateJob(owner:string,id:string,patch:Data){
 if(typeof id!=="string"||!/^[a-zA-Z0-9_-]{1,80}$/.test(id))throw new Error("Empleo no válido.");
 if(patch.status!==undefined&&!statuses.includes(patch.status))throw new Error("Estado no válido.");
 if(patch.notes!==undefined&&(typeof patch.notes!=="string"||patch.notes.length>12000))throw new Error("La nota debe tener hasta 12.000 caracteres.");
 if(patch.applied_at!==undefined&&patch.applied_at!==""&&patch.applied_at!==null&&!validDate(patch.applied_at))throw new Error("Fecha no válida.");
 const db=await createClient(),changes:Data={updated_at:new Date().toISOString()};
 const payloadFields={company:200,title:250,location_label:200,contact:200,email:254,phone:80};
 const payloadPatch:Data={};
 if(patch.assessment!==undefined)payloadPatch.assessment=normalizeAssessment(patch.assessment);
 for(const [field,limit] of Object.entries(payloadFields)){
  if(patch[field]===undefined)continue;
  if(typeof patch[field]!=="string"||patch[field].length>limit)throw new Error("Datos de contacto o postulación no válidos.");
  if(["company","title","location_label"].includes(field)&&!patch[field].trim())throw new Error("Completá compañía, puesto y ubicación.");
  payloadPatch[field]=patch[field].trim();
 }
 if(payloadPatch.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payloadPatch.email))throw new Error("Correo electrónico no válido.");
 if(Object.keys(payloadPatch).length){
  const {data,error}=await db.from("jobs").select("payload").eq("owner_id",owner).eq("id",id).single();
  fail(error);if(!data)throw new Error("No se encontró el empleo.");
  changes.payload={...data.payload,...payloadPatch};
 }
 if(patch.status!==undefined)changes.status=patch.status;
 if(patch.notes!==undefined)changes.notes=patch.notes;
 if(patch.applied_at!==undefined)changes.applied_at=validDate(patch.applied_at);
 if(patch.status==="postulado"&&patch.applied_at===undefined){
  const {data,error}=await db.from("jobs").select("applied_at,status").eq("owner_id",owner).eq("id",id).single();
  if(error||!data)throw new Error("No se encontró el empleo.");
  if(data.status!=="postulado"&&!data.applied_at)changes.applied_at=new Date().toISOString().slice(0,10);
 }
 const {data,error}=await db.from("jobs").update(changes).eq("owner_id",owner).eq("id",id).select("id,status,notes,applied_at").single();
 fail(error);if(!data)throw new Error("No se encontró el empleo.");
 if(changes.payload){const {data:profile,error:profileError}=await db.from("candidate_profiles").select("data,updated_at").eq("owner_id",owner).maybeSingle();fail(profileError);const fit=assessFit(changes.payload,profile?{...emptyProfile,...profile.data}:null,profile?.updated_at||null);return {...payloadPatch,...data,fit,score:fit.score};}
 return {...payloadPatch,...data};
}
