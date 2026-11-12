"use server";
import {redirect} from "next/navigation";
import {createClient} from "../../lib/supabase/server";
import {isConfigured} from "../../lib/config";
export async function signIn(form:FormData){
 if(!isConfigured())redirect("/");
 const email=String(form.get("email")||"").trim(),password=String(form.get("password")||"");
 if(email.toLowerCase()!==process.env.OWNER_EMAIL!.trim().toLowerCase())redirect("/login?error=invalid");
 const client=await createClient();
 const {error}=await client.auth.signInWithPassword({email,password});
 if(error)redirect("/login?error=invalid");
 redirect("/");
}
