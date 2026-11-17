import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {noPermissions} from "../lib/connector-permissions.ts";
test("only the native owner session can manage an allowlisted connection with same-origin requests",async()=>{
 const old=process.env.MCP_COMPANY_CLIENT_IDS;process.env.MCP_COMPANY_CLIENT_IDS="client-a";
 let owner:any={userId:"owner"},saved=0,revoked=0;
 const source=fs.readFileSync(new URL("../app/api/company-connections/route.ts",import.meta.url),"utf8"),js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports:any={},modules:any={"../../../lib/auth":{getCurrentUser:async()=>owner},"../../../lib/supabase/server":{createClient:async()=>({auth:{oauth:{listGrants:async()=>({data:[],error:null}),revokeGrant:async()=>{revoked++;return {error:null};}}}})},"../../../lib/company-connector-auth":{connectorClientAllowed:(id:string)=>id==="client-a"},"../../../lib/connector-permissions-store":{permissionRow:async(id:string)=>{assert.equal(id,"owner");return {permissions:{...noPermissions},version:null};},savePermissions:async()=>{saved++;return {permissions:{...noPermissions,companies:true},version:"new"};}},"../../../lib/auth-flow":{authSiteUrl:()=>"https://portal.test"}};
 new Function("require","exports",js)((name:string)=>{assert.ok(name in modules,name);return modules[name];},exports);
 const request=(body:unknown,origin="https://portal.test")=>new Request("https://portal.test/api/company-connections",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
 try{
  let response=await exports.GET();assert.equal(response.status,200);const data=await response.json();assert.equal(data.connections.length,1);assert.equal(data.connections[0].authorized,false);assert.deepEqual(data.connections[0].permissions,noPermissions);
  assert.equal((await exports.POST(request({action:"permissions",clientId:"client-a"},"https://evil.test"))).status,403);
  owner=null;assert.equal((await exports.GET()).status,401);assert.equal((await exports.POST(request({action:"permissions",clientId:"client-a"}))).status,401);owner={userId:"owner"};
  assert.equal((await exports.POST(request({action:"permissions",clientId:"other"}))).status,400);assert.equal(saved,0);
  assert.equal((await exports.POST(request({action:"permissions",clientId:"client-a",permissions:{...noPermissions,companies:true},version:null}))).status,200);assert.equal(saved,1);
  assert.equal((await exports.POST(request({action:"revoke",clientId:"client-a"}))).status,200);assert.equal(revoked,1);
  assert.equal((await exports.POST(request({action:"anything",clientId:"client-a"}))).status,400);
 }finally{if(old===undefined)delete process.env.MCP_COMPANY_CLIENT_IDS;else process.env.MCP_COMPANY_CLIENT_IDS=old;}
});
