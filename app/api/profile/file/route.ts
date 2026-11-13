import {getCurrentUser} from "../../../../lib/auth";
import {createClient} from "../../../../lib/supabase/server";
import {validKind,validateFile} from "../../../../lib/profile-data";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request:Request){const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);const kind=new URL(request.url).searchParams.get("kind");if(!validKind(kind))return reply({error:"Archivo no válido."},400);
 const db=await createClient();const {data,error}=await db.from("candidate_files").select("name,mime,content").eq("owner_id",user.userId).eq("kind",kind).maybeSingle();if(error)return reply({error:"No se pudo leer el archivo."},500);if(!data)return reply({error:"Archivo no encontrado."},404);
 return new Response(Buffer.from(data.content,"base64"),{headers:{"Content-Type":data.mime,"Content-Disposition":`${kind==="photo"?"inline":"attachment"}; filename*=UTF-8''${encodeURIComponent(data.name)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
export async function DELETE(request:Request){
 if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Origen no permitido."},403);
 const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);
 if(new URL(request.url).searchParams.get("kind")!=="cv")return reply({error:"Solo podés eliminar el PDF del CV desde esta acción."},400);
 const db=await createClient();
 const {error}=await db.from("candidate_files").delete().eq("owner_id",user.userId).eq("kind","cv");
 if(error)return reply({error:"No se pudo eliminar el PDF. Tu perfil se conserva."},500);
 return reply({deleted:true});
}
export async function POST(request:Request){if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Origen no permitido."},403);const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);
 try{if(Number(request.headers.get("content-length"))>3300000)return reply({error:"El archivo supera el tamaño permitido."},413);const form=await request.formData();const kind=form.get("kind"),file=form.get("file");if(!validKind(kind)||!(file instanceof File))return reply({error:"Archivo no válido."},400);if(file.size>3*1024*1024)return reply({error:"El archivo supera 3 MB."},413);const bytes=new Uint8Array(await file.arrayBuffer());validateFile(kind,file.type,bytes);const name=file.name.replace(/[\x00-\x1f\x7f/\\]/g,"_").slice(0,200)||"archivo";const db=await createClient();const {error}=await db.from("candidate_files").upsert({owner_id:user.userId,kind,name,mime:file.type,content:Buffer.from(bytes).toString("base64"),updated_at:new Date().toISOString()},{onConflict:"owner_id,kind"});if(error)return reply({error:"No se pudo guardar el archivo."},500);return reply({saved:true});}catch(e){return reply({error:e instanceof Error?e.message:"No se pudo subir el archivo."},400);}
}
