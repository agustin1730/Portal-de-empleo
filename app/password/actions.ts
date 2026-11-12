"use server";
import {redirect} from "next/navigation";
import {requireUser} from "../../lib/auth";
import {createClient} from "../../lib/supabase/server";
import {validNewPassword} from "../../lib/auth-flow";
export async function savePassword(form:FormData){
 await requireUser();
 const password=String(form.get("password")||""),confirmation=String(form.get("confirmation")||"");
 if(!validNewPassword(password,confirmation))redirect("/password?error=password");
 const client=await createClient();const {error}=await client.auth.updateUser({password});
 if(error)redirect("/password?error=save");
 await client.auth.signOut();
 redirect("/login?notice=password");
}
