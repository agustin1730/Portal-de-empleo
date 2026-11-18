import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {noPermissions} from "../lib/connector-permissions.ts";
test("reports persist independently, lock versions, validate mutable relationships, isolate owners and enforce live OAuth permissions",async()=>{
 const db=new PGlite(),owner="00000000-0000-4000-8000-000000000001",other="00000000-0000-4000-8000-000000000002",session="00000000-0000-4000-8000-000000000003",client="00000000-0000-4000-8000-000000000004",id="10000000-0000-4000-8000-000000000001",second="10000000-0000-4000-8000-000000000002";
 try{
  await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid);create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;grant usage on schema auth to authenticated;grant execute on all functions in schema auth to authenticated;`);
  for(const file of ["202611120001_jobs.sql","20261113110353_add_private_candidate_profile.sql","20261117171812_company_mcp_research.sql","20261117181454_company_oauth_claim_binding.sql","20261117185536_connector_section_permissions.sql","20261118100936_reports_markdown.sql"])await db.exec(await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8"));
  await db.query("insert into auth.users values($1),($2)",[owner,other]);await db.query("insert into auth.sessions values($1,$2)",[session,owner]);await db.query("insert into company_connector_private.oauth_clients values($1,'https://portal.test/mcp/companies')",[client]);
  await db.query("insert into candidate_profiles(owner_id,data) values($1,$2),($3,$4)",[owner,JSON.stringify({crm_prospects:[{id:"a",name:"A"},{id:"b",name:"B"}]}),other,JSON.stringify({crm_prospects:[{id:"foreign",name:"Other"}]})]);
  const claims=async(user=owner,oauth=false)=>{await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,...oauth?{client_id:client,session_id:session,resource:"https://portal.test/mcp/companies"}:{}})]);};
  const save=async(i=id,c:string|null="a",version:string|null=null,kind="investigacion")=>(await db.query<any>("select reports_save($1,'Example',$2,$3,'# Kept content',$4) as data",[i,kind,c,version])).rows[0].data;
  await db.exec("set role authenticated");await claims();const first=await save();await save(second);assert.equal((await db.query("select * from reports")).rows.length,2);
  await assert.rejects(()=>save(id,"b"),/changed/);const moved=await save(id,"b",first.updated_at,"carta");assert.equal(moved.company_id,"b");assert.equal(moved.kind,"carta");assert.equal(moved.content,"# Kept content");assert.equal(moved.created_at,first.created_at);
  await assert.rejects(()=>save(id,"foreign",moved.updated_at),/not found/);await assert.rejects(()=>save(id,"missing",moved.updated_at),/not found/);
  const cleared=await save(id,null,moved.updated_at);assert.equal(cleared.company_id,null);
  await assert.rejects(()=>db.query("update reports set owner_id=$1 where id=$2",[other,id]));await assert.rejects(()=>db.query("update reports set content=repeat('x',50001) where id=$1",[id]));
  await claims(other);assert.equal((await db.query("select * from reports")).rows.length,0);assert.equal((await db.query("update reports set title='Other' returning id")).rows.length,0);
  await claims(owner,true);assert.equal((await db.query("select * from reports")).rows.length,0);await assert.rejects(()=>save(),/disabled/);
  let permissionVersion:string|null=null;const permissions=async(p:unknown)=>{await claims();const value=(await db.query<any>("select connector_save_permissions($1,$2,$3) as data",[client,JSON.stringify(p),permissionVersion])).rows[0].data;permissionVersion=value.updated_at;await claims(owner,true);};
  await permissions({...noPermissions,research_read:true,research_write:true});assert.equal((await db.query("select * from reports")).rows.length,0);
  await permissions({...noPermissions,reports_read:true});assert.equal((await db.query("select * from reports")).rows.length,2);await assert.rejects(()=>save(id,null,cleared.updated_at),/disabled/);assert.equal((await db.query("update reports set title='No' returning id")).rows.length,0);
  await permissions({...noPermissions,reports_read:true,reports_write:true});const edited=await save(id,null,cleared.updated_at);await assert.rejects(()=>save(id,"a",edited.updated_at),/Company access disabled/);await assert.rejects(()=>db.query("select connector_save_permissions($1,$2,null)",[client,JSON.stringify(noPermissions)]),/owner session/);
  await permissions({...noPermissions,reports_read:true,reports_write:true,companies:true});await save(id,"a",edited.updated_at);
  await permissions(noPermissions);assert.equal((await db.query("select * from reports")).rows.length,0);
  await permissions({...noPermissions,reports_read:true});await db.exec("reset role");await db.query("delete from auth.sessions where id=$1",[session]);await db.exec("set role authenticated");assert.equal((await db.query("select * from reports")).rows.length,0);
  await db.exec("reset role;set role anon");await assert.rejects(()=>db.query("select * from reports"));await assert.rejects(()=>save());
 }finally{await db.close();}
});
