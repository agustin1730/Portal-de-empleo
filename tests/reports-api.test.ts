import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import * as reports from "../lib/reports.ts";
test("reports API requires native authentication, rejects foreign origins, bounds input and preserves conflict status",async()=>{
 let user:unknown=null,calls=0;const code=ts.transpileModule(readFileSync(new URL("../app/api/reports/route.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,route:any={};
 const modules:Record<string,unknown>={"../../../lib/auth":{getCurrentUser:async()=>user},"../../../lib/auth-flow":{authSiteUrl:()=>"https://portal.test"},"../../../lib/reports":reports,"../../../lib/reports-store":{listReports:async(offset:number)=>{reports.reportPagination(offset);calls++;return {reports:[],next_offset:null};},getReport:async(id:unknown)=>{reports.reportId(id);calls++;return {id};},saveReport:async(r:unknown,v:unknown)=>{const clean=reports.normalizeReport(r);reports.reportVersion(v);calls++;throw new reports.ReportError("El informe cambió.",409);}}};
 new Function("require","exports",code)((id:string)=>{if(!(id in modules))throw Error(id);return modules[id];},route);
 const get=new Request("https://portal.test/api/reports");assert.equal((await route.GET(get)).status,401);assert.equal((await route.POST(new Request(get,{method:"POST",body:"{}"}))).status,401);assert.equal(calls,0);
 user={userId:"owner"};assert.equal((await route.POST(new Request(get,{method:"POST",headers:{Origin:"https://evil.test"},body:"{}"}))).status,403);assert.equal(calls,0);
 const reply=await route.GET(get);assert.equal(reply.status,200);assert.equal(reply.headers.get("cache-control"),"private, no-store");
 assert.equal((await route.GET(new Request(get.url+"?id=../private"))).status,400);assert.equal((await route.GET(new Request(get.url+"?offset=NaN"))).status,400);
 assert.equal((await route.POST(new Request(get,{method:"POST",body:"{"}))).status,400);assert.equal((await route.POST(new Request(get,{method:"POST",body:"x".repeat(60001)}))).status,413);
 const report={id:"10000000-0000-4000-8000-000000000001",title:"Example",kind:"carta",company_id:null,content:"Keep"};assert.equal((await route.POST(new Request(get,{method:"POST",body:JSON.stringify({report,expected_version:null})}))).status,409);
 assert.equal((await route.POST(new Request(get,{method:"POST",body:JSON.stringify({report:{...report,owner_id:"other"},expected_version:null})}))).status,400);
});
