import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {noPermissions} from "../lib/connector-permissions.ts";
test("section permissions are enforced by RPC and RLS, independently for each owner/client, with live revocation",async()=>{
 const db=new PGlite(),owner="00000000-0000-4000-8000-000000000001",other="00000000-0000-4000-8000-000000000002",session="00000000-0000-4000-8000-000000000003",client="00000000-0000-4000-8000-000000000004",client2="00000000-0000-4000-8000-000000000005";
 try{
  await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid);create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;grant usage on schema auth to authenticated;grant execute on all functions in schema auth to authenticated;`);
  for(const file of ["202611120001_jobs.sql","20261113110353_add_private_candidate_profile.sql","20261117171812_company_mcp_research.sql","20261117181454_company_oauth_claim_binding.sql","20261117185536_connector_section_permissions.sql","20261118100936_reports_markdown.sql"])await db.exec(await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8"));
  await db.query("insert into auth.users values($1),($2)",[owner,other]);await db.query("insert into auth.sessions values($1,$2)",[session,owner]);
  await db.query("insert into company_connector_private.oauth_clients values($1,'https://portal.test/mcp/companies'),($2,'https://portal.test/mcp/companies')",[client,client2]);
  const data={name:"Private name",email:"private@example.test",phone:"secret",cv_import:{secret:true},preferences:{salaryMin:"secret"},summary:"Professional summary",experience:[{role:"Sales",secret:"hidden"}],crm_prospects:[{id:"company-a",name:"Example",notes:"Private note",nextAction:"Private followup",contacts:[{name:"Contact",email:"contact@example.test"}]}]};
  await db.query("insert into candidate_profiles(owner_id,data) values($1,$2),($3,$4)",[owner,JSON.stringify(data),other,JSON.stringify({summary:"Other owner",crm_prospects:[{id:"b",name:"Other"}]})]);
  await db.query("insert into jobs(owner_id,id,payload,status,notes) values($1,'applied',$2,'postulado','Private application note'),($1,'opportunity','{}','pendiente',''),($1,'trash','{}','descartado','')",[owner,JSON.stringify({title:"Sales",company:"Example",url:"https://example.test",email:"recruiter@example.test",hidden:"secret"})]);
  async function claims(oauth=true,id=owner,c=client){await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,...oauth?{client_id:c,session_id:session,resource:"https://portal.test/mcp/companies"}:{}})]);}
  await db.exec("set role authenticated");await claims();
  const rpc=async(name:string)=> (await db.query<any>("select public."+name+"() as data")).rows[0].data;
  assert.deepEqual(await rpc("connector_effective_permissions"),noPermissions);
  for(const name of ["connector_contacts","connector_applications","connector_profile"])await assert.rejects(()=>rpc(name),/disabled/);
  await assert.rejects(()=>db.query("select public.crm_company_data(null)"),/disabled/);
  await assert.rejects(()=>db.query("select company_connector_private.company_data_unfiltered_v1(null)"),/permission denied/);
  await assert.rejects(()=>db.query("select public.connector_save_permissions($1,$2,null)",[client,JSON.stringify({...noPermissions,profile:true})]),/owner session/);
  let version:string|null=null;
  async function save(permissions:unknown){await claims(false);const result=(await db.query<any>("select public.connector_save_permissions($1,$2,$3) as data",[client,JSON.stringify(permissions),version])).rows[0].data;version=result.updated_at;await claims();return result;}
  await save({...noPermissions,companies:true});let rows=(await db.query<any>("select public.crm_company_data(null) as data")).rows[0].data;
  assert.equal(rows.length,1);assert.equal(rows[0].contacts,undefined);assert.equal(rows[0].notes,undefined);assert.equal(rows[0].nextAction,undefined);
  assert.equal((await db.query("select * from connector_permissions")).rows.length,0);for(const table of ["candidate_profiles","candidate_files","jobs"])assert.equal((await db.query("select * from "+table)).rows.length,0);
  await save({...noPermissions,contacts:true});const contacts=await rpc("connector_contacts");assert.equal(contacts[0].contact.email,"contact@example.test");assert.equal(contacts[0].company_name,undefined);
  await save({...noPermissions,profile:true});const profile=await rpc("connector_profile");assert.equal(profile.summary,"Professional summary");for(const key of ["name","email","phone","preferences","cv_import","crm_prospects"])assert.equal(profile[key],undefined);assert.equal(profile.experience[0].secret,undefined);
  await save({...noPermissions,applications:true});const apps=await rpc("connector_applications");assert.equal(apps.length,1);assert.equal(apps[0].id,"applied");assert.equal(apps[0].email,undefined);assert.equal(apps[0].notes,undefined);assert.equal(apps[0].hidden,undefined);
  await save({...noPermissions,applications:true,contacts:true,notes:true});const full=await rpc("connector_applications");assert.equal(full[0].notes,"Private application note");assert.equal(full[0].email,"recruiter@example.test");
  const report={summary:"Report",facts:[],hypotheses:[],unknowns:[],nextSteps:[],sources:[]};await save({...noPermissions,research_read:true});await assert.rejects(()=>db.query("select public.crm_save_research('company-a',$1,null)",[JSON.stringify(report)]),/disabled/);
  await save({...noPermissions,research_read:true,research_write:true});await db.query("select public.crm_save_research('company-a',$1,null)",[JSON.stringify(report)]);assert.equal((await db.query("select * from company_research")).rows.length,1);
  await save(noPermissions);assert.equal((await db.query("select * from company_research")).rows.length,0);await assert.rejects(()=>db.query("select public.crm_read_research('company-a')"),/disabled/);await assert.rejects(()=>rpc("connector_profile"),/disabled/);
  await claims(false);await assert.rejects(()=>db.query("select public.connector_save_permissions($1,$2,null)",[client,JSON.stringify(noPermissions)]),/changed/);await assert.rejects(()=>db.query("select public.connector_save_permissions($1,$2,$3)",[client,JSON.stringify({...noPermissions,admin:true}),version]),/Invalid/);
  await claims(false,other);assert.equal((await db.query("select * from connector_permissions")).rows.length,0);
  await claims(true,owner,client2);assert.deepEqual(await rpc("connector_effective_permissions"),noPermissions);
  await claims(false);assert.equal((await db.query("select * from candidate_profiles")).rows.length,1);assert.equal((await db.query<any>("select public.crm_company_data(null) as data")).rows[0].data[0].notes,"Private note");
 }finally{await db.close();}
});
