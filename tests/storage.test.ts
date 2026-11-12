import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
test("Postgres enforces ownership and imports preserve application decisions",async()=>{
 const db=new PGlite();
 const a="00000000-0000-4000-8000-000000000001",b="00000000-0000-4000-8000-000000000002";
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values ('${a}'),('${b}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  await db.exec(await readFile(new URL("../supabase/migrations/202611120001_jobs.sql",import.meta.url),"utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/20261112200430_add_crm_contacted_stage.sql",import.meta.url),"utf8"));
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}';`);
  const record={id:"job-1",payload:{title:"Vendedor",company:"QA"},status:"postulado",notes:"Keep this decision",applied_at:"2026-11-10"};
  const first=await db.query("select public.import_jobs($1::jsonb) as result",[JSON.stringify([record])]);
  assert.deepEqual(first.rows[0].result,{added:1,updated:0,total:1});
  const next={...record,payload:{title:"Vendedor actualizado"},status:"descartado",notes:"Must not replace",applied_at:null};
  const again=await db.query("select public.import_jobs($1::jsonb) as result",[JSON.stringify([next,next])]);
  assert.deepEqual(again.rows[0].result,{added:0,updated:1,total:1});
  const saved=await db.query("select *,applied_at::text as applied_at_text from public.jobs");assert.equal(saved.rows.length,1);
  assert.equal(saved.rows[0].status,"postulado");assert.equal(saved.rows[0].notes,"Keep this decision");
  assert.equal(saved.rows[0].applied_at_text,"2026-11-10");assert.equal(saved.rows[0].payload.company,"QA");
  assert.equal(saved.rows[0].payload.title,"Vendedor actualizado");
  await db.query("update public.jobs set status='contactado',payload=payload||$1::jsonb where id='job-1'",[JSON.stringify({contact:"Recruiter",email:"recruiter@example.com",phone:"+54 11 5555 0100"})]);
  await db.query("select public.import_jobs($1::jsonb)",[JSON.stringify([{...next,payload:{title:"New analysis"}}])]);
  const crm=(await db.query("select status,payload,notes from public.jobs where id='job-1'")).rows[0];
  assert.equal(crm.status,"contactado");assert.equal(crm.payload.contact,"Recruiter");assert.equal(crm.payload.email,"recruiter@example.com");assert.equal(crm.payload.phone,"+54 11 5555 0100");assert.equal(crm.notes,"Keep this decision");
  await db.exec(`set request.jwt.claim.sub='${b}';`);
  assert.equal((await db.query("select * from public.jobs")).rows.length,0);
  assert.equal((await db.query("update public.jobs set notes='bad' where id='job-1' returning id")).rows.length,0);
  assert.equal((await db.query("delete from public.jobs where id='job-1' returning id")).rows.length,0);
  await assert.rejects(()=>db.query("insert into public.jobs(owner_id,id,payload) values($1,'bad','{}')",[a]));
  await db.exec(`set request.jwt.claim.sub='${a}';`);
  assert.equal((await db.query("delete from public.jobs where id='job-1' returning id")).rows.length,1);
  assert.equal((await db.query("select * from public.jobs")).rows.length,0);
  await db.exec("reset role;set role anon;");
  await assert.rejects(()=>db.query("select * from public.jobs"));
  await assert.rejects(()=>db.query("select public.import_jobs('[]'::jsonb)"));
 }finally{await db.close();}
});
