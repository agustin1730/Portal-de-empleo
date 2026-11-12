"use server";
import {redirect} from "next/navigation";
import {createClient} from "../../lib/supabase/server";
import {isConfigured} from "../../lib/config";
import {authSiteUrl,ownerEmailMatches,validNewPassword} from "../../lib/auth-flow";
export async function signIn(form:FormData){
 if(!isConfigured())redirect("/");
 const email=String(form.get("email")||"").trim(),password=String(form.get("password")||"");
 if(!ownerEmailMatches(email))redirect("/login?error=invalid");
 const client=await createClient();
 const {error}=await client.auth.signInWithPassword({email,password});
 if(error?.code==="email_not_confirmed")redirect("/login?mode=confirm&error=unconfirmed");
 if(error)redirect("/login?error=invalid");
 redirect("/");
}
export async function signUp(form:FormData){
 if(!isConfigured())redirect("/");
 const email=String(form.get("email")||"").trim(),password=String(form.get("password")||""),confirmation=String(form.get("confirmation")||"");
 if(!ownerEmailMatches(email))redirect("/login?mode=signup&error=access");
 if(!validNewPassword(password,confirmation))redirect("/login?mode=signup&error=password");
 const client=await createClient();
 const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:authSiteUrl()+"/auth/callback"}});
 if(error?.code==="user_already_exists")redirect("/login?error=exists");
 if(error?.status===429)redirect("/login?mode=signup&error=rate");
 if(error)redirect("/login?mode=signup&error=signup");
 if(data.user?.identities?.length===0)redirect("/login?error=exists");
 if(data.session&&data.user?.email_confirmed_at)redirect("/");
 redirect("/login?mode=confirm&notice=confirmation");
}
export async function resendConfirmation(form:FormData){
 if(!isConfigured())redirect("/");
 const email=String(form.get("email")||"").trim();
 if(ownerEmailMatches(email)){
  const client=await createClient();
  const {error}=await client.auth.resend({type:"signup",email,options:{emailRedirectTo:authSiteUrl()+"/auth/callback"}});
  if(error?.status===429)redirect("/login?mode=confirm&error=rate");
  if(error)redirect("/login?mode=confirm&error=resend");
 }
 redirect("/login?mode=confirm&notice=confirmation");
}
export async function recoverPassword(form:FormData){
 if(!isConfigured())redirect("/");
 const email=String(form.get("email")||"").trim();
 if(ownerEmailMatches(email)){
  const client=await createClient();
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:authSiteUrl()+"/auth/callback?next=/password"});
  if(error?.status===429)redirect("/login?mode=recover&error=rate");
  if(error)redirect("/login?mode=recover&error=recovery");
 }
 redirect("/login?mode=recover&notice=recovery");
}
