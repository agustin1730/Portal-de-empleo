import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
test("OAuth sees only own companies and reports; private data, edits, stale writes and revoked sessions are blocked",async()=>{
 const db=new PGlite(),owner="00000000-0000-4000-8000-000000000001",other="00000000-0000-4000-8000-000000000002",session="00000000-0000-4000-8000-000000000003";
 const report={summary:"Example",facts:[{text:"Software",source:0}],hypotheses:[],unknowns:["Vacancies"],nextSteps:[],sources:[{title:"Official",url:"https://example.test",consultedAt:"2026-01-01"}]};
 try{
  await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid);create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;grant usage on schema auth to authenticated;grant execute on all functions in schema auth to authenticated;`);
  for(const file of ["202611120001_jobs.sql","20261113110353_add_private_candidate_profile.sql"]){await db.exec(await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8"));}
  const migration=(await readdir(new URL("../supabase/migrations/",import.meta.url))).find(n=>n.endsWith("_company_mcp_research.sql"));assert.ok(migration);await db.exec(await readFile(new URL("../supabase/migrations/"+migration,import.meta.url),"utf8"));
  await db.query("insert into company_connector_private.oauth_clients values($1,$2)",[session,"https://portal.test/mcp/companies"]);
  await db.query("insert into auth.users values($1),($2)",[owner,other]);await db.query("insert into auth.sessions values($1,$2)",[session,owner]);
  for(const id of [owner,other])await db.query("insert into candidate_profiles(owner_id,data) values($1,$2)",[id,JSON.stringify({summary:"Secret CV",crm_prospects:[{id:id===owner?"a":"b",name:"Example",contacts:[{name:"Contact"}]}]})]);
  await db.query("insert into candidate_files(owner_id,kind,name,mime,content) values($1,'cv','private.pdf','application/pdf','secret')",[owner]);await db.query("insert into jobs(owner_id,id,payload) values($1,'job','{}')",[owner]);
  async function claims(id:string,oauth=true){await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,...oauth?{client_id:session,session_id:session,resource:"https://portal.test/mcp/companies"}:{}})]);}
  const baseClaims={sub:owner,aud:"authenticated",resource:"untrusted",role:"authenticated"};
  await db.exec("set role supabase_auth_admin");
  const hooked:any=(await db.query("select public.company_connector_access_token($1) as data",[JSON.stringify({client_id:session,claims:baseClaims})])).rows[0];
  assert.equal(hooked.data.claims.resource,"https://portal.test/mcp/companies");assert.equal(hooked.data.claims.aud,"authenticated");
  const normal:any=(await db.query("select public.company_connector_access_token($1) as data",[JSON.stringify({claims:baseClaims})])).rows[0];assert.equal(normal.data.claims.resource,undefined);assert.equal(normal.data.claims.sub,owner);
  await db.exec("reset role;set role authenticated");await claims(owner);
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:owner,client_id:session,session_id:session,resource:"https://wrong.test/mcp/companies"})]);
  await assert.rejects(()=>db.query("select public.crm_company_data(null)"),/Authentication/);
  await claims(owner);
  await assert.rejects(()=>db.query("select public.company_connector_access_token('{}')"));
  await assert.rejects(()=>db.query("select * from company_connector_private.oauth_clients"));
  for(const table of ["candidate_profiles","candidate_files","jobs"])assert.equal((await db.query("select * from "+table)).rows.length,0);
  const companies:any=await db.query("select public.crm_company_data(null) as data");assert.equal(companies.rows[0].data.length,1);assert.equal(companies.rows[0].data[0].id,"a");assert.equal(companies.rows[0].data[0].summary,undefined);
  assert.deepEqual((await db.query<any>("select public.crm_company_data('b') as data")).rows[0].data,[]);
  assert.equal((await db.query("update candidate_profiles set data='{}' returning owner_id")).rows.length,0);
  assert.equal((await db.query("delete from jobs returning id")).rows.length,0);
  await assert.rejects(()=>db.query("select public.save_profile_section('{\"summary\":\"overwrite\"}')"));
  const saved:any=(await db.query("select public.crm_save_research('a',$1,null) as data",[JSON.stringify(report)])).rows[0];assert.ok(saved.data.updated_at);
  assert.equal((await db.query("select * from company_research")).rows.length,1);
  await assert.rejects(()=>db.query("select public.crm_save_research('a',$1,null)",[JSON.stringify(report)]),/Research changed/);
  await db.query("select public.crm_save_research('a',$1,$2)",[JSON.stringify({...report,summary:"Updated"}),saved.data.updated_at]);
  await assert.rejects(()=>db.query("select public.crm_save_research('a',$1,null)",[JSON.stringify({...report,facts:[{text:"No source",source:10}]})]),/source/);
  await assert.rejects(()=>db.query("select public.crm_save_research('b',$1,null)",[JSON.stringify(report)]),/not found/);
  await assert.rejects(()=>db.query("update company_research set report='{}'"));
  await claims(other);await assert.rejects(()=>db.query("select public.crm_company_data(null)"),/Authentication/);assert.equal((await db.query("select * from company_research")).rows.length,0);
  await claims(owner,false);assert.equal((await db.query("select * from candidate_profiles")).rows.length,1);assert.equal((await db.query("select * from candidate_files")).rows.length,1);assert.equal((await db.query("select * from jobs")).rows.length,1);
  await db.exec("reset role");await db.query("delete from auth.sessions where id=$1",[session]);await db.exec("set role authenticated");await claims(owner);
  await assert.rejects(()=>db.query("select public.crm_company_data(null)"),/Authentication/);assert.equal((await db.query("select * from company_research")).rows.length,0);
  await db.exec("reset role;set role anon");await assert.rejects(()=>db.query("select public.crm_company_data(null)"));await assert.rejects(()=>db.query("select * from company_research"));
 }finally{await db.close();}
});
