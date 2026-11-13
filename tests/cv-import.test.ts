import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {parseCvText,importPatch} from "../lib/cv-parser.ts";
import {pageText} from "../lib/pdf-text.ts";
import {emptyProfile,normalizeSection,profilePeriod} from "../lib/profile-data.ts";
import {assessFit} from "../lib/fit.ts";
const cv=`ANA PEREZ
Especialista comercial
Córdoba, Argentina · ana@example.com · +54 351 123 4567
PERFIL PROFESIONAL
Experiencia comercial con foco en atención al cliente y campañas digitales.
EXPERIENCIA LABORAL
Empresa de prueba – Actividad independiente
Responsable comercial 2021 – Actualidad
• Gestión de campañas y atención al cliente.
Consultora de prueba
Analista de ventas Ene. 2023 – Dic. 2025
• Manejo de Excel y reportes.
EDUCACIÓN
Academia de prueba – 2023
Fundamentos de marketing · Comercio electrónico
Colegio de prueba – 2020
Secundario completo
HERRAMIENTAS E IDIOMAS
Excel · Google Ads · Notion
Español nativo · Inglés intermedio
PROYECTOS
Resultados adicionales que deben revisarse sin asignación automática.`;
test("Spanish CV produces reviewable facts without invented months or omitted courses",()=>{
 const draft=parseCvText(cv),p=draft.profile;
 assert.equal(p.name,"Ana Perez");assert.equal(p.email,"ana@example.com");assert.equal(p.location,"Córdoba, Argentina");assert.equal(p.phone,"+54 351 123 4567");
 assert.equal(p.headline,"Especialista comercial");assert.equal(p.experience.length,2);
 assert.deepEqual(p.experience[0],{role:"Responsable comercial",company:"Empresa de prueba – Actividad independiente",start:"2021",end:"",ongoing:true,description:"Gestión de campañas y atención al cliente."});
 assert.equal(p.experience[1].start,"2023-01");assert.equal(p.experience[1].end,"2025-12");assert.equal(p.experience[1].ongoing,false);
 assert.equal(p.education.length,3);assert.equal(p.education[0].end,"2023");assert.equal(p.education[0].start,"");assert.equal(p.education[0].institution,"Academia de prueba");
 assert.deepEqual(p.skills,["Excel","Google Ads","Notion"]);assert.deepEqual(p.languages,[{name:"Español",level:"Nativo"},{name:"Inglés",level:"Intermedio"}]);
 assert.equal(p.letter,"");assert.equal(draft.unmapped.length,1);assert.equal(draft.text,cv);assert.ok(draft.warnings.some(s=>s.includes("mes")));
 assert.doesNotThrow(()=>importPatch(p,draft.sections));
});
test("English dates and explicit levels are retained; absent sections are not fabricated",()=>{
 const p=parseCvText(`JANE SAMPLE\nSales analyst\njane@example.com\nPROFESSIONAL SUMMARY\nCommercial analyst with experience in customer service and reporting.\nWORK EXPERIENCE\nExample Company\nSales analyst\nJanuary 2022 to September 2024\nCustomer reporting and Excel.\nSKILLS\nExcel, SQL\nLANGUAGES\nEnglish C1 · French\n`).profile;
 assert.equal(p.experience[0].start,"2022-01");assert.equal(p.experience[0].end,"2024-09");assert.deepEqual(p.education,[]);assert.deepEqual(p.languages,[{name:"Inglés",level:"C1"}]);
});
test("empty or oversized CV text fails clearly and imported patches allow only chosen sections",()=>{
 assert.throws(()=>parseCvText("Scan"),/escaneados/);assert.throws(()=>parseCvText("a".repeat(80001)),/límite/);
 assert.deepEqual(importPatch({...emptyProfile,name:"Test",letter:"Ignore me",owner_id:"other"},["contact"]),{name:"Test"});
 assert.throws(()=>importPatch(emptyProfile,["letter"]));assert.throws(()=>importPatch(emptyProfile,[]));assert.throws(()=>importPatch(emptyProfile,["experience"]));
 assert.throws(()=>importPatch({...emptyProfile,summary:"x".repeat(4001)},["summary"]));
});
test("PDF text reconstruction preserves separate lines and same-line spacing",()=>{
 assert.equal(pageText([{str:"Nombre",transform:[1,0,0,1,10,100],width:20},{str:"Apellido",transform:[1,0,0,1,35,100],width:25,hasEOL:true},{str:"Experiencia",transform:[1,0,0,1,10,80]},{}]),"Nombre Apellido\nExperiencia");
});
test("year-only dates and unknown endings are editable but never prove an exact duration",()=>{
 const experience=[{role:"Ventas",company:"Test",start:"2021",end:"2024",ongoing:false,description:""}];
 assert.doesNotThrow(()=>normalizeSection("experience",{experience}));assert.equal(profilePeriod(experience[0]),"2021 – 2024");
 assert.match(profilePeriod({...experience[0],end:""}),/Finalización por confirmar/);
 assert.throws(()=>normalizeSection("experience",{experience:[{...experience[0],ongoing:true}]}));
 const spec={assessment:{description:"Test",complete:true,requirements:[{category:"experience" as const,text:"Ventas",years:2,required:false},{category:"skills" as const,text:"Excel",years:null,required:false}]}};
 const result=assessFit(spec,{...emptyProfile,experience,skills:["Excel"]});assert.equal(result.evidence[0].status,"unknown");
});
test("acceptance RPC preserves manual data by default, replaces selected fields explicitly, and saves atomically",async()=>{
 const db=new PGlite(),a="00000000-0000-4000-8000-000000000001",b="00000000-0000-4000-8000-000000000002";
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values ('${a}'),('${b}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  for(const file of ["20261113110353_add_private_candidate_profile.sql","20261113121502_import_cv_draft.sql"])await db.exec(await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8"));
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}';`);
  await db.query("select public.save_profile_section($1::jsonb)",[JSON.stringify({name:"Manual name",summary:"",letter:"Keep letter",skills:["Manual skill"]})]);
  const save=async(patch:unknown,replace=false,name="CV.pdf")=>(await db.query<{data:Record<string,unknown>}>("select public.import_candidate_cv($1::jsonb,$2,'JVBERi0=',$3) as data",[JSON.stringify(patch),name,replace])).rows[0].data;
  const first=await save({name:"Draft name",summary:"Draft summary",skills:["Excel"],experience:[],cv_import:{parser:"cv-rules-v1"}});
  assert.equal(first.name,"Manual name");assert.equal(first.summary,"Draft summary");assert.equal(first.letter,"Keep letter");assert.deepEqual(first.skills,["Manual skill"]);
  const replaced=await save({skills:["Excel"]},true);assert.deepEqual(replaced.skills,["Excel"]);assert.equal(replaced.name,"Manual name");
  await assert.rejects(()=>save({summary:"Should roll back"},true,"x".repeat(201)));
  assert.equal((await db.query<{data:{summary:string}}>("select data from public.candidate_profiles")).rows[0].data.summary,"Draft summary");
  assert.equal((await db.query<{name:string}>("select name from public.candidate_files")).rows[0].name,"CV.pdf");
  await assert.rejects(()=>save({owner_id:b}));
  await db.exec(`set request.jwt.claim.sub='${b}';`);assert.equal((await db.query("select * from public.candidate_files")).rows.length,0);assert.equal((await db.query("select * from public.candidate_profiles")).rows.length,0);
  await save({summary:"Owner B"});await db.exec(`set request.jwt.claim.sub='${a}';`);assert.equal((await db.query<{data:{summary:string}}>("select data from public.candidate_profiles")).rows[0].data.summary,"Draft summary");
  await db.exec("reset role;set role anon;");await assert.rejects(()=>save({summary:"Blocked"}));
 }finally{await db.close();}
});
