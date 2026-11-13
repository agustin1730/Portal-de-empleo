import {test} from "node:test";
import assert from "node:assert/strict";
import {assessFit,detectRequirements,normalizeAssessment,jobSourceText,type Requirement} from "../lib/fit.ts";
import {emptyProfile} from "../lib/profile-data.ts";
import {normalizeJob} from "../lib/job-data.ts";
const now=new Date("2026-11-13T12:00:00Z");
const profile={...emptyProfile,experience:[{role:"Ventas",company:"Empresa",start:"2023-01",end:"2025-12",description:"Atención al cliente. Manejo de Google Ads."}],skills:["Google Ads","Excel"],education:[{title:"Secundario completo",institution:"Escuela",start:"2017-01",end:"2022-12"}],languages:[{name:"Inglés",level:"Intermedio"}]};
const req=(category:Requirement["category"],text:string,years:number|null=null,required=false):Requirement=>({category,text,years,required});
const job=(requirements:Requirement[],complete=true)=>({assessment:{description:"Aviso de prueba",complete,requirements}});

test("legacy alert-only jobs explain the missing vacancy without blaming a saved profile",()=>{
 const alert={summary:"Importado desde una alerta de empleo. Falta revisar la descripción completa y la vigencia.",key_requirement:""};
 assert.equal(jobSourceText(alert),"");const fit=assessFit(alert,profile);
 assert.equal(fit.score,null);assert.equal(fit.missing,"requirements");assert.equal(fit.label,"Falta aviso");assert.match(fit.reason,/Tu perfil está disponible/);
 assert.equal(assessFit(alert,emptyProfile).missing,"profile");
});
test("older jobs use actual requirement text from every available source and recalculate against profile edits",()=>{
 const vacancy={description:"Descripción pendiente de revisión.",key_requirement:"Manejo de Excel.",summary:"Se requiere Google Ads."};
 const fit=assessFit(vacancy,profile);assert.equal(fit.score,100);assert.equal(fit.provisional,true);assert.equal(fit.missing,null);
 assert.equal(assessFit(vacancy,{...emptyProfile,skills:["Excel"]}).score,50);
 const sparse=assessFit({description:"Manejo de Excel."},profile);assert.equal(sparse.label,"Faltan requisitos");assert.equal(sparse.missing,"requirements");
});
test("reviewed requirements remain authoritative instead of falling back to stale imported summaries",()=>{
 const fit=assessFit({...job([req("skills","Python"),req("skills","SQL")]),summary:"Manejo de Excel y Google Ads."},profile);
 assert.equal(fit.score,null);assert.equal(fit.missing,null);assert.ok(fit.evidence.every(e=>e.status==="unknown"));
});
test("empty profile and insufficient vacancy evidence never reuse an old score",()=>{
 assert.equal(assessFit({...job([req("skills","Excel"),req("skills","Google Ads")]),score:99} as never,emptyProfile).score,null);
 assert.equal(assessFit({summary:"An old analysis says perfect fit"},profile).score,null);
 assert.equal(assessFit(job([req("skills","Excel")]),profile).score,null);
});
test("evidence-backed dimensions yield an explainable weighted total",()=>{
 const result=assessFit(job([req("experience","Experiencia en ventas",2),req("skills","Excel"),req("skills","Google Ads"),req("education","Secundario completo")]),profile,"2026-11-13",now);
 assert.equal(result.score,100);assert.equal(result.label,"Buen encaje");assert.equal(result.profileUpdatedAt,"2026-11-13");
 assert.deepEqual(result.breakdown.map(b=>b.points),[40,40,20]);
 assert.ok(result.evidence.every(e=>e.status==="matched"&&e.profileSource));
});
test("overlapping periods do not inflate related work experience",()=>{
 const double={...profile,experience:[profile.experience[0],{...profile.experience[0],company:"Another company"}]};
 const result=assessFit(job([req("experience","Ventas",4),req("skills","Excel")]),double,null,now);
 assert.equal(result.evidence[0].status,"gap");assert.match(result.evidence[0].explanation,/36 meses/);assert.equal(result.score,50);
});
test("undated and unrelated experience never proves years",()=>{
 const noDates={...profile,experience:[{...profile.experience[0],start:""}]};
 assert.equal(assessFit(job([req("experience","Ventas",2),req("skills","Excel")]),noDates,null,now).evidence[0].status,"unknown");
 assert.equal(assessFit(job([req("experience","Gastronomía",1),req("skills","Excel")]),profile,null,now).evidence[0].status,"unknown");
});
test("a mandatory unverified condition overrides the reassuring category",()=>{
 const result=assessFit(job([req("skills","Excel"),req("skills","Google Ads"),req("education","Secundario completo"),req("skills","Licencia de conducir",null,true)]),profile,null,now);
 assert.equal(result.label,"Requisito obligatorio por confirmar");assert.ok(result.nextSteps[0].includes("Licencia"));
});
test("absence of evidence is not presented as lack of skill, and all unknown means no score",()=>{
 const result=assessFit(job([req("skills","Python"),req("skills","SQL")]),profile,null,now);
 assert.equal(result.score,null);assert.equal(result.label,"Faltan datos");assert.ok(result.evidence.every(e=>e.status==="unknown"));
});
test("profile changes update scores and missing categories are disclosed, not given free points",()=>{
 const spec=job([req("skills","Excel"),req("skills","Python")]);
 const first=assessFit(spec,profile,null,now);assert.equal(first.score,50);assert.equal(first.breakdown[0].points,null);assert.equal(first.breakdown[1].weight,100);
 const improved=assessFit(spec,{...profile,skills:[...profile.skills,"Python"]},null,now);assert.equal(improved.score,100);
});
test("limited synonyms work but substrings and explicit negations do not",()=>{
 assert.equal(assessFit(job([req("skills","AdWords"),req("skills","Microsoft Excel")]),profile,null,now).score,100);
 assert.equal(assessFit(job([req("skills","SQL"),req("skills","Excel")]),{...profile,skills:["NoSQL"],experience:[]},null,now).score,null);
 const denied={...profile,skills:["No manejo Excel","No tengo Google Ads"],experience:[]};
 assert.equal(assessFit(job([req("skills","Excel"),req("skills","Google Ads")]),denied,null,now).score,null);
});
test("language level and completed education must be documented",()=>{
 const result=assessFit(job([req("skills","Inglés avanzado"),req("education","Secundario completo")]),profile,null,now);
 assert.equal(result.evidence[0].status,"gap");assert.equal(result.evidence[1].status,"matched");
 const unfinished={...profile,education:[{...profile.education[0],end:""}]};
 assert.equal(assessFit(job([req("skills","Excel"),req("education","Secundario completo")]),unfinished,null,now).evidence[1].status,"unknown");
});
test("personal identity and cover letters do not affect the score",()=>{
 const spec=job([req("skills","Excel"),req("skills","Python")]);
 const result=assessFit(spec,profile,null,now);
 assert.equal(assessFit(spec,{...profile,name:"Python",email:"python@example.com",summary:"Python",letter:"Python"},null,now).score,result.score);
});
test("generic language levels do not automatically meet CEFR or specific language competencies",()=>{
 for(const text of ["Inglés B2","Inglés técnico"]){
  const result=assessFit(job([req("skills",text),req("skills","Excel")]),profile,null,now);
  assert.equal(result.evidence[0].status,"unknown");
 }
});
test("partial source is marked provisional, years and mandatory signals can be reviewed",()=>{
 const found=detectRequirements("Experiencia en ventas de 2 años. Excel excluyente. No se requiere Python. Secundario completo.");
 assert.ok(found.some(r=>r.category==="experience"&&r.years===2));assert.ok(found.some(r=>r.text==="Excel"&&r.required));assert.ok(!found.some(r=>r.text==="Python"));
 assert.equal(assessFit(job(found,false),profile,null,now).provisional,true);
});
test("assessment normalization deduplicates, bounds input and survives re-normalization",async()=>{
 const assessment=normalizeAssessment(job([req("skills","Excel"),req("skills","excel",null,true),req("skills","Google Ads")]).assessment);
 assert.equal(assessment.requirements.length,2);assert.equal(assessment.requirements[0].required,true);
 assert.throws(()=>normalizeAssessment({description:"",complete:true,requirements:[req("experience","Ventas",-1)]}));
 assert.throws(()=>normalizeAssessment({description:"x".repeat(24001),complete:true,requirements:[]}));
 const normalized=await normalizeJob({title:"Sales",assessment});assert.deepEqual(normalized.assessment,assessment);
 assert.deepEqual((await normalizeJob({...normalized,title:"Updated"})).assessment,assessment);
});

test("industry and role combine within one experience, with source shown",()=>{
 const candidate={...emptyProfile,experience:[{role:"Asesor comercial",company:"Concesionaria",industry:"Automotor",start:"2023-01",end:"2025-12",description:"Seguimiento de clientes.",tools:["Microsoft Excel"]}]};
 const result=assessFit(job([req("experience","Experiencia en ventas en el rubro automotriz",3,true),req("skills","Excel")]),candidate,null,now);
 assert.equal(result.score,100);assert.equal(result.version,"rules-v2");
 assert.match(result.evidence[0].profileSource,/Concesionaria.*Automotor/);assert.match(result.evidence[1].profileSource,/Herramienta usada/);
 assert.equal(assessFit(job([req("experience","Ventas en gastronomía",1,true),req("skills","Excel")]),candidate,null,now).evidence[0].status,"unknown");
});
test("unrelated jobs and interested industries never combine to prove sector experience",()=>{
 const candidate={...emptyProfile,preferences:{...emptyProfile.preferences,industries:"Automotriz"},experience:[{role:"Ventas",company:"Tienda",industry:"Comercio",start:"2020-01",end:"2025-12",description:"Ventas."},{role:"Administración",company:"Concesionaria",industry:"Automotriz",start:"2020-01",end:"2025-12",description:"Facturación."}],skills:["Excel"]};
 const result=assessFit(job([req("experience","Ventas en automotriz",3,true),req("skills","Excel")]),candidate,null,now);
 assert.equal(result.evidence[0].status,"unknown");assert.equal(result.label,"Requisito obligatorio por confirmar");
});
test("only time in the requested industry counts and tools alone do not prove tool tenure",()=>{
 const candidate={...emptyProfile,experience:[{role:"Ventas",company:"A",industry:"Automotriz",start:"2025-01",end:"2025-12",description:"Ventas.",tools:["Excel"]},{role:"Ventas",company:"B",industry:"Gastronomía",start:"2020-01",end:"2024-12",description:"Ventas."}]};
 const result=assessFit(job([req("experience","Ventas en automotriz",3),req("skills","Excel")]),candidate,null,now);
 assert.equal(result.evidence[0].status,"gap");assert.match(result.evidence[0].explanation,/12 meses/);assert.equal(result.evidence[1].status,"matched");
 assert.equal(assessFit(job([req("experience","Excel",3),req("skills","Excel")]),candidate,null,now).evidence[0].status,"unknown");
});
test("structured tools respect negations, levels and lack of dates",()=>{
 const base={role:"Ventas",company:"A",industry:"Automotriz",start:"2023",end:"2025",description:"Sin experiencia en automotriz. No manejo Excel.",tools:["Excel"]};
 let result=assessFit(job([req("experience","Ventas en automotriz",1),req("skills","Excel")]),{...emptyProfile,experience:[base]},null,now);
 assert.ok(result.evidence.every(row=>row.status==="unknown"));
 result=assessFit(job([req("experience","Ventas en automotriz",1),req("skills","Excel avanzado")]),{...emptyProfile,experience:[{...base,description:"Ventas."}]},null,now);
 assert.ok(result.evidence.every(row=>row.status==="unknown"));assert.match(result.evidence[0].explanation,/fechas completas/);
});
test("skill context is visible and editing a structured tool recalculates the result",()=>{
 const spec=job([req("skills","Excel"),req("skills","CRM")]);
 const candidate={...emptyProfile,experience:[{role:"Ventas",company:"A",start:"",end:"",description:"",tools:["Excel","CRM"]}]};
 assert.equal(assessFit(spec,candidate,null,now).score,100);
 assert.equal(assessFit(spec,{...candidate,experience:[{...candidate.experience[0],tools:["Excel"]}]},null,now).score,50);
 const declared={...emptyProfile,skills:["Excel","CRM"],skillEvidence:[{skill:"Excel",context:"Reportes mensuales"}]};
 assert.match(assessFit(spec,declared,null,now).evidence[0].profileSource,/Reportes mensuales/);
});
