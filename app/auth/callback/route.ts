import type {EmailOtpType} from "@supabase/supabase-js";
import {createClient} from "../../../lib/supabase/server";
import {getCurrentUser} from "../../../lib/auth";
import {allowedDestination} from "../../../lib/auth-flow";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const url=new URL(req.url),client=await createClient();
 const code=url.searchParams.get("code"),tokenHash=url.searchParams.get("token_hash"),type=url.searchParams.get("type");
 let success=false;
 if(code){const {error}=await client.auth.exchangeCodeForSession(code);success=!error;}
 else if(tokenHash&&["signup","recovery","email"].includes(type||"")){
  const {error}=await client.auth.verifyOtp({token_hash:tokenHash,type:type as EmailOtpType});success=!error;
 }
 if(success&&await getCurrentUser())return Response.redirect(new URL(allowedDestination(url.searchParams.get("next")),url.origin),303);
 return Response.redirect(new URL("/login?error=confirmation",url.origin),303);
}
