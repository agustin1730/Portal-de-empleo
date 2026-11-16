import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as rules from "../lib/company-pipeline-data.ts";
function fixture(conflict=false){
 const original={data:{summary:"Preserved",dashboard_tasks:[{id:"task"}],dashboard_review:{status:"partial"}},updated_at:"2026-11-16T12:00:00Z"};let saved:any=null,ownerFilters:string[]=[];
 const db={from(table:string){assert.equal(table,"candidate_profiles");let update:any=null;const filters:Record<string,string>={};const query:any={select(){if(update)return Promise.resolve({data:conflict?[]:[{owner_id:"owner-a",updated_at:update.updated_at.replace("Z","+00:00")}],error:null}).then(result=>{if(result.data.length)saved=update;return result;});return query;},eq(k:string,v:string){filters[k]=v;if(k==="owner_id")ownerFilters.push(v);if(k==="updated_at")assert.equal(v,original.updated_at);return query;},maybeSingle(){return Promise.resolve({data:structuredClone(original),error:null});},update(value:any){update=value;return query;}};return query;}};
 const source=fs.readFileSync(new URL("../lib/company-pipeline-store.ts",import.meta.url),"utf8"),js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{} as any};new Function("require","exports",js)((name:string)=>name==="./supabase/server"?{createClient:async()=>db}:rules,module.exports);
 return {store:module.exports,original,read:()=>saved,owners:()=>ownerFilters};
}
const company={id:"example-1",name:"Example",stage:"Por contactar",contacts:[]};
test("prospecting save scopes owner, preserves all other profile sections and returns saved version",async()=>{
 const f=fixture();const result=await f.store.saveCompanyPipeline("owner-a",{version:f.original.updated_at,action:"save",company});const saved=f.read();assert.deepEqual(saved.data.dashboard_tasks,f.original.data.dashboard_tasks);assert.deepEqual(saved.data.dashboard_review,f.original.data.dashboard_review);assert.equal(saved.data.summary,"Preserved");assert.equal(saved.data.crm_prospects[0].name,"Example");assert.equal(result.version,saved.updated_at.replace("Z","+00:00"));assert.deepEqual(f.owners(),["owner-a","owner-a"]);
});
test("stale and racing profile saves never overwrite data",async()=>{
 const f=fixture();await assert.rejects(f.store.saveCompanyPipeline("owner-a",{version:"stale",action:"save",company}),/cambiaron/);assert.equal(f.read(),null);
 const racing=fixture(true);await assert.rejects(racing.store.saveCompanyPipeline("owner-a",{version:racing.original.updated_at,action:"save",company}),/cambiaron/);assert.equal(racing.read(),null);
});

