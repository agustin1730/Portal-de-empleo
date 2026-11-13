import {getCurrentUser} from "../../../lib/auth";
import {createClient} from "../../../lib/supabase/server";
import {emptyProfile,normalizeSection} from "../../../lib/profile-data";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(){const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);
 const db=await createClient();const [profile,files]=await Promise.all([db.from("candidate_profiles").select("data").eq("owner_id",user.userId).maybeSingle(),db.from("candidate_files").select("kind,name,updated_at").eq("owner_id",user.userId)]);
 if(profile.error||files.error)return reply({error:"No pudimos cargar tu perfil."},500);
 return reply({profile:{...emptyProfile,...profile.data?.data},files:files.data||[]});
}
export async function PATCH(request:Request){if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Origen no permitido."},403);
 const user=await getCurrentUser();if(!user)return reply({error:"Sesión requerida."},401);
 try{if(Number(request.headers.get("content-length"))>200000)return reply({error:"El perfil es demasiado extenso."},413);const body=await request.text();if(Buffer.byteLength(body)>200000)return reply({error:"El perfil es demasiado extenso."},413);const input=JSON.parse(body);const patch=normalizeSection(input.section,input.data);const db=await createClient();const {data,error}=await db.rpc("save_profile_section",{patch});if(error)return reply({error:"No se pudieron guardar los cambios."},500);return reply({profile:{...emptyProfile,...data}});}catch(e){return reply({error:e instanceof Error?e.message:"Datos no válidos."},400);}
}
