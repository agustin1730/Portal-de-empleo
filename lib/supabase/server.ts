import {createServerClient} from "@supabase/ssr";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {cookies,headers} from "next/headers";
export async function createClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
 const authorization=(await headers()).get("authorization");
 if(authorization?.startsWith("Bearer "))return createSupabaseClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const jar=await cookies();
 return createServerClient(url,key,{cookies:{getAll(){return jar.getAll();},setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server components cannot update cookies; proxy refreshes them. */}}}});
}
