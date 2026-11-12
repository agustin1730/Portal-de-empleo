import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
test("staged records go only to the verified owner and cannot be claimed twice",async()=>{
 const db=new PGlite(),owner="00000000-0000-4000-8000-000000000001",other="00000000-0000-4000-8000-000000000002";
 try{
  await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;");
  for(const path of ["202611120001_jobs.sql","20261112164734_prepare_private_owner_import.sql"])await db.exec(await readFile(new URL("../supabase/migrations/"+path,import.meta.url),"utf8"));
  const data=[{id:"existing-job",payload:{title:"QA opportunity"},status:"postulado",notes:"Private note",applied_at:"2026-11-10"}];
  await db.query("insert into job_import_private.pending_import(owner_email,records) values('owner@example.test',$1::jsonb)",[JSON.stringify(data)]);
  await db.query("insert into auth.users(id,email) values($1,'owner@example.test')",[owner]);
  assert.equal((await db.query("select * from public.jobs")).rows.length,0);
  await db.query("insert into auth.users values($1,'other@example.test',now())",[other]);
  assert.equal((await db.query("select * from public.jobs")).rows.length,0);
  await db.query("update auth.users set email_confirmed_at=now() where id=$1",[owner]);
  const saved=await db.query("select *,applied_at::text as date_text from public.jobs");
  assert.equal(saved.rows.length,1);assert.equal(saved.rows[0].owner_id,owner);assert.equal(saved.rows[0].notes,"Private note");assert.equal(saved.rows[0].date_text,"2026-11-10");
  const staged=await db.query("select * from job_import_private.pending_import");assert.deepEqual(staged.rows[0].records,[]);assert.ok(staged.rows[0].imported_at);
  await db.exec("update public.jobs set notes='New decision';");
  await db.query("update auth.users set email_confirmed_at=now() where id=$1",[owner]);
  assert.equal((await db.query("select notes from public.jobs")).rows[0].notes,"New decision");
  await db.exec("set role authenticated;");
  await assert.rejects(()=>db.query("select * from job_import_private.pending_import"));
  await assert.rejects(()=>db.query("select job_import_private.claim_verified_owner_import()"));
  await db.exec("reset role;set role anon;");
  await assert.rejects(()=>db.query("select * from job_import_private.pending_import"));
 }finally{await db.close();}
});
