import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {normalizeSection,validateFile} from "../lib/profile-data.ts";
test("profile validates bounded sections and excludes unrelated fields",()=>{
 assert.deepEqual(normalizeSection("summary",{summary:"  Mi trayectoria  ",owner_id:"another",letter:"ignore"}),{summary:"Mi trayectoria"});
 assert.throws(()=>normalizeSection("contact",{name:"A",headline:"",location:"",email:"invalid",phone:""}));
 assert.throws(()=>normalizeSection("experience",{experience:[{role:"QA",company:"Test",start:"2026-11",end:"2025-01",description:""}]}));
 assert.deepEqual(normalizeSection("skills",{skills:["Excel","Excel",""],personalSkills:[]}),{skills:["Excel"],personalSkills:[]});
 assert.throws(()=>normalizeSection("summary",{summary:"x".repeat(4001)}));
});
test("uploads require supported file signatures and obey size limits",()=>{
 validateFile("cv","application/pdf",new TextEncoder().encode("%PDF-1.7\n"));
 validateFile("photo","image/png",new Uint8Array([137,80,78,71,13,10,26,10]));
 assert.throws(()=>validateFile("cv","application/pdf",new TextEncoder().encode("<script>bad</script>")));
 assert.throws(()=>validateFile("photo","image/svg+xml",new TextEncoder().encode("<svg/>")));
 assert.throws(()=>validateFile("photo","image/jpeg",new Uint8Array(3*1024*1024)));
 assert.throws(()=>validateFile("cv","application/pdf",new Uint8Array(4*1024*1024)));
});
test("profile and documents stay private and saving one section preserves the others",async()=>{
 const db=new PGlite();const a="00000000-0000-4000-8000-000000000001",b="00000000-0000-4000-8000-000000000002";
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values ('${a}'),('${b}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  await db.exec(await readFile(new URL("../supabase/migrations/20261113110353_add_private_candidate_profile.sql",import.meta.url),"utf8"));
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}';`);
  await db.query("select public.save_profile_section($1::jsonb)",[JSON.stringify({name:"Profile A",summary:"Keep experience"})]);
  await db.query("select public.save_profile_section($1::jsonb)",[JSON.stringify({letter:"My letter",portfolio:[{title:"Portfolio",url:"https://example.com/",description:"My contribution"}]})]);
  const profile=(await db.query<{data:{summary:string;letter:string}}>("select data from public.candidate_profiles")).rows[0].data;
  assert.equal(profile.summary,"Keep experience");assert.equal(profile.letter,"My letter");
  const links=(await db.query<{data:{portfolio:{url:string}[]}}>("select data from public.candidate_profiles")).rows[0].data.portfolio;assert.equal(links[0].url,"https://example.com/");
  await db.query("insert into public.candidate_files(owner_id,kind,name,mime,content) values($1,'cv','cv.pdf','application/pdf','JVBERi0=')",[a]);
  await db.exec(`set request.jwt.claim.sub='${b}';`);
  assert.equal((await db.query("select * from public.candidate_files")).rows.length,0);
  assert.equal((await db.query("select * from public.candidate_profiles")).rows.length,0);
  assert.equal((await db.query("update public.candidate_profiles set data='{}' where owner_id=$1 returning owner_id",[a])).rows.length,0);
  await assert.rejects(()=>db.query("insert into public.candidate_files(owner_id,kind,name,mime,content) values($1,'photo','x.jpg','image/jpeg','data')",[a]));
  await db.exec("reset role;set role anon;");
  await assert.rejects(()=>db.query("select * from public.candidate_files"));
  await assert.rejects(()=>db.query("select public.save_profile_section('{}')"));
 }finally{await db.close();}
});
