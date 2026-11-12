import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {createClient} from "./supabase/server";
import {isConfigured} from "./config";
export async function getCurrentUser(){
 if(!isConfigured())return null;
 const client=await createClient();
 const token=(await headers()).get("authorization")?.replace(/^Bearer /,"");
 const {data:{user},error}=await client.auth.getUser(token);
 if(error||!user||!user.email||user.email.toLowerCase()!==process.env.OWNER_EMAIL!.trim().toLowerCase())return null;
 return {userId:user.id,email:user.email,displayName:typeof user.user_metadata?.full_name==="string"?user.user_metadata.full_name:"Mi perfil"};
}
export async function requireUser(){const user=await getCurrentUser();if(!user)redirect("/login");return user;}
