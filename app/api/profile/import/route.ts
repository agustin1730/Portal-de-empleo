import {getCurrentUser} from "../../../../lib/auth";
import {createClient} from "../../../../lib/supabase/server";
import {emptyProfile,validateFile} from "../../../../lib/profile-data";
import {importPatch} from "../../../../lib/cv-parser";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(request:Request){
 if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Origen no permitido."},403);
 const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);
 try{
  if(Number(request.headers.get("content-length"))>3500000)return reply({error:"El archivo y el borrador superan el límite permitido."},413);
  const form=await request.formData(),file=form.get("file"),raw=form.get("draft");
  if(!(file instanceof File)||typeof raw!=="string"||Buffer.byteLength(raw)>180000)return reply({error:"Borrador o archivo no válidos."},400);
  if(file.size>3*1024*1024)return reply({error:"El CV debe pesar hasta 3 MB."},413);
  const input=JSON.parse(raw);if(input.accepted!==true||typeof input.replaceExisting!=="boolean")return reply({error:"Revisá y aceptá el borrador antes de guardar."},400);
  const patch=importPatch(input.profile,input.sections);
  const bytes=new Uint8Array(await file.arrayBuffer());validateFile("cv","application/pdf",bytes);
  const name=file.name.replace(/[\x00-\x1f\x7f/\\]/g,"_").slice(0,200)||"CV.pdf";
  const db=await createClient();
  const {data,error}=await db.rpc("import_candidate_cv",{profile_patch:{...patch,cv_import:{file:name,imported_at:new Date().toISOString(),parser:"cv-rules-v1",sections:input.sections}},file_name:name,file_content:Buffer.from(bytes).toString("base64"),replace_existing:input.replaceExisting});
  if(error)return reply({error:"No se pudo guardar el borrador. Tu perfil y el CV anterior se conservaron."},500);
  return reply({profile:{...emptyProfile,...data}});
 }catch(e){return reply({error:e instanceof Error?e.message:"No se pudo importar el borrador."},400);}
}
