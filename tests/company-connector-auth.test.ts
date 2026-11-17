import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {connectorResourceAllowed} from "../lib/company-connector-auth.ts";
function load(file:string,modules:Record<string,unknown>){const source=fs.readFileSync(new URL("../"+file,import.meta.url),"utf8"),js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,output:any={};new Function("require","exports",js)((name:string)=>{if(!(name in modules))throw Error("Unexpected module: "+name);return modules[name];},output);return output;}
test("normal portal authentication rejects OAuth tokens; connector opt-in still requires verified owner and claims",async()=>{
 const old=process.env.OWNER_EMAIL;process.env.OWNER_EMAIL="owner@example.test";
 try{
  let clientId:string|null="connector",claimsError=false,email="owner@example.test";
  const db={auth:{getUser:async()=>({data:{user:{id:"owner",email,email_confirmed_at:"date",user_metadata:{displayName:"Name"}}},error:null}),getClaims:async()=>({data:{claims:{client_id:clientId,resource:"https://portal.test/mcp/companies"}},error:claimsError?new Error("Invalid token"):null})}};
  const auth=load("lib/auth.ts",{"next/headers":{headers:async()=>new Headers({Authorization:"Bearer test"})},"next/navigation":{redirect:()=>{throw Error("Redirect");}},"./supabase/server":{createClient:async()=>db},"./config":{isConfigured:()=>true}});
  assert.equal(await auth.getCurrentUser(),null);assert.equal((await auth.getCurrentUser({allowOAuth:true})).oauthClientId,"connector");
  clientId=null;assert.equal((await auth.getCurrentUser()).userId,"owner");claimsError=true;assert.equal(await auth.getCurrentUser({allowOAuth:true}),null);
  claimsError=false;email="other@example.test";assert.equal(await auth.getCurrentUser({allowOAuth:true}),null);
 }finally{if(old===undefined)delete process.env.OWNER_EMAIL;else process.env.OWNER_EMAIL=old;}
});
test("MCP route rejects missing bearer, unapproved clients, wrong resource and untrusted origins before reading data",async()=>{
 let user:any={oauthClientId:"allowed",oauthResource:"https://portal.test/mcp/companies"},calls=0;
 const route=load("app/mcp/companies/route.ts",{"../../../lib/auth":{getCurrentUser:async()=>user},"../../../lib/auth-flow":{authSiteUrl:()=>"https://portal.test"},"../../../lib/company-connector-auth":{connectorClientAllowed:(id:string)=>id==="allowed",connectorResourceAllowed,connectorOriginAllowed:(origin:string|null)=>origin===null||origin==="https://portal.test"},"../../../lib/company-mcp-http":{companyMcpResponse:async()=>{calls++;return Response.json({ok:true});}},"../../../lib/company-research-store":{readConnectorCompanies:async()=>[],readResearch:async()=>null,saveResearch:async()=>({})}});
 const request=(headers:Record<string,string>={Authorization:"Bearer token"})=>new Request("https://portal.test/mcp/companies",{method:"POST",headers});
 assert.equal((await route.POST(request({}))).status,401);assert.equal((await route.POST(request({Authorization:"Bearer token",Origin:"https://evil.test"}))).status,403);
 user={oauthClientId:"other",oauthResource:"https://portal.test/mcp/companies"};assert.equal((await route.POST(request())).status,401);
 user={oauthClientId:"allowed",oauthResource:"https://other.test/mcp/companies"};assert.equal((await route.POST(request())).status,401);
 user=null;assert.equal((await route.POST(request())).status,401);assert.equal(calls,0);
 user={oauthClientId:"allowed",oauthResource:"https://portal.test/mcp/companies"};assert.equal((await route.POST(request())).status,200);assert.equal(calls,1);
 assert.equal((await route.GET(request())).status,405);
});
