import {createClient} from "../../../lib/supabase/server";
export async function POST(req:Request){
 const url=new URL(req.url),origin=req.headers.get("origin");
 if(origin&&origin!==url.origin)return new Response("Forbidden",{status:403});
 const client=await createClient();await client.auth.signOut();
 return new Response(null,{status:303,headers:{Location:"/login","Cache-Control":"no-store"}});
}
