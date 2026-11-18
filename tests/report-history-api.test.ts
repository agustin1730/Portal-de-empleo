import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as reports from '../lib/reports.ts';
test('history API scopes every read to the native owner, keeps lists small and checks conflicts on restores',async()=>{
 let user:any=null,calls:any[]=[],error:any=null;const code=ts.transpileModule(readFileSync(new URL('../app/api/reports/history/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,route:any={};
 const query:any={select:(v:any)=>{calls.push(['select',v]);return query;},eq:(...v:any[])=>{calls.push(['eq',...v]);return query;},order:()=>query,limit:async(v:number)=>{calls.push(['limit',v]);return {data:[],error};}};
 const modules:any={'../../../../lib/auth':{getCurrentUser:async(opts:any)=>{assert.equal(opts,undefined);return user;}},'../../../../lib/auth-flow':{authSiteUrl:()=> 'https://portal.test'},'../../../../lib/reports':reports,'../../../../lib/supabase/server':{createClient:async()=>({from:()=>query,rpc:async(name:string,args:any)=>{calls.push([name,args]);return {data:{id:args.p_id},error};}})}};
 new Function('require','exports',code)((id:string)=>{assert.ok(id in modules,id);return modules[id];},route);
 const id='10000000-0000-4000-8000-000000000001',revision='10000000-0000-4000-8000-000000000002',url='https://portal.test/api/reports/history?id='+id;
 const post=(value:any,origin='https://portal.test')=>route.POST(new Request(url,{method:'POST',headers:{Origin:origin},body:typeof value==='string'?value:JSON.stringify(value)}));
 assert.equal((await route.GET(new Request(url))).status,401);assert.equal((await post({})).status,401);assert.equal(calls.length,0);user={userId:'native-owner'};
 assert.equal((await post({},'https://evil.test')).status,403);assert.equal(calls.length,0);let r=await route.GET(new Request(url));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='owner_id'&&c[2]==='native-owner'));assert.ok(calls.some(c=>c[0]==='limit'&&c[1]===30));assert.ok(calls.some(c=>c[0]==='select'&&!c[1].includes('content')));
 calls=[];await route.GET(new Request(url+'&revision='+revision));assert.ok(calls.some(c=>c[0]==='select'&&c[1].includes('content')));assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='id'&&c[2]===revision));
 assert.equal((await post('x'.repeat(2001))).status,413);assert.equal((await post({})).status,400);const body={id,revision,snapshot_version:'2026-11-18T00:00:00Z',expected_version:'2026-11-18T01:00:00Z',clear_company:false};error={code:'40001'};assert.equal((await post(body)).status,409);error={code:'23503'};assert.match((await (await post(body)).json()).error,/empresa/);error=null;r=await post(body);assert.equal(r.status,200);assert.equal((await r.json()).report.id,id);assert.ok(calls.some(c=>c[0]==='reports_restore'&&c[1].p_snapshot_version===body.snapshot_version&&c[1].p_expected_version===body.expected_version));
});
