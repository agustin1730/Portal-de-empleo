import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {createClient} from "./supabase/server";
import {isConfigured} from "./config";
export async function getCurrentUser({allowOAuth=false}:{allowOAuth?:boolean}={}){
 if(!isConfigured())return null;
 const client=await createClient();
 const token=(await headers()).get("authorization")?.replace(/^Bearer /,"");
 const {data:{user},error}=await client.auth.getUser(token);
 if(error||!user||!user.email_confirmed_at||!user.email||user.email.toLowerCase()!==process.env.OWNER_EMAIL!.trim().toLowerCase())return null;
 const {data:verified,error:claimsError}=await client.auth.getClaims(token);
 if(claimsError||!verified?.claims)return null;
 const oauthClientId=typeof verified.claims.client_id==="string"?verified.claims.client_id:null;
 if(oauthClientId&&!allowOAuth)return null;
 const oauthResource=typeof verified.claims.resource==="string"?verified.claims.resource:null;
 return {oauthClientId,oauthResource,userId:user.id,email:user.email,displayName:typeof user.user_metadata?.full_name==="string"?user.user_metadata.full_name:"Mi perfil"};
}
export async function requireUser(){const user=await getCurrentUser();if(!user)redirect("/login");return user;}
