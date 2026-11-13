import {test} from "node:test";
import assert from "node:assert/strict";
import {buildPanorama} from "../lib/panorama.ts";
import {emptyProfile,normalizeSection} from "../lib/profile-data.ts";
test("empty panorama does not manufacture strengths, preparation or employment probability",()=>{
 const result=buildPanorama(emptyProfile);assert.equal(result.hasData,false);assert.equal(result.strengths.length,0);assert.ok(result.areas.every(a=>a.level===0));assert.ok(result.roles.every(r=>r.group==="unknown"));assert.equal(result.steps.length,3);
});
test("practical evidence, declared skills and education remain distinct and explainable",()=>{
 const p={...emptyProfile,experience:[{role:"Fundador",company:"Example",start:"2021",end:"",ongoing:true,description:"Ventas y atención al cliente. Gestión de campañas en Meta Ads. Organización de procesos en Excel."}],skills:["Meta Ads","Excel"],education:[{title:"Curso de administración",institution:"Academia",start:"",end:"2023"}]};
 const result=buildPanorama(p);assert.equal(result.areas.find(a=>a.id==="marketing")?.level,3);assert.equal(result.areas.find(a=>a.id==="administration")?.level,1);assert.equal(result.areas.find(a=>a.id==="leadership")?.level,0);
 assert.equal(result.roles.find(r=>r.title==="Asistencia administrativa")?.group,"prepare");assert.ok(result.areas.find(a=>a.id==="marketing")?.sources.some(s=>s.includes("Fundador")));
 assert.ok(result.gaps.some(g=>g.title.includes("Fechas")));assert.ok(result.steps.some(s=>s.href.includes("portfolio")));
 const updated=buildPanorama({...p,experience:[...p.experience,{role:"Coordinador",company:"Example",start:"2024-01",end:"2025-12",description:"Gestión de equipos y personas a cargo."}]});assert.equal(updated.areas.find(a=>a.id==="leadership")?.level,2);
});
test("personal identity, prose and portfolio links do not prove work experience or elevate bars",()=>{
 const p={...emptyProfile,name:"Marketing",summary:"Gestión de equipos",portfolio:[{title:"Ventas y liderazgo de equipos",url:"https://example.com",description:"Gestión de equipos y Meta Ads"}]};
 assert.ok(buildPanorama(p).areas.every(a=>a.level===0));assert.ok(!buildPanorama(p).gaps.some(g=>g.title.includes("Ejemplos")));
 assert.equal(buildPanorama({...emptyProfile,skills:["No manejo Meta Ads"]}).areas.find(a=>a.id==="marketing")?.level,0);
 assert.equal(buildPanorama({...emptyProfile,experience:[{role:"Team lead",company:"Example",start:"2024-01",end:"",description:""}]}).areas.find(a=>a.id==="leadership")?.level,0);
});
test("portfolio validates bounded HTTP links, excludes credentials and executable schemes",()=>{
 assert.deepEqual(normalizeSection("portfolio",{portfolio:[{title:" Trabajo ",url:"https://example.com",description:"Mi aporte"}],summary:"Ignore"}),{portfolio:[{title:"Trabajo",url:"https://example.com/",description:"Mi aporte"}]});
 for(const url of ["javascript:alert(1)","data:text/html,hello","file:///C:/test","https://user:pass@example.com","example.com"]){assert.throws(()=>normalizeSection("portfolio",{portfolio:[{title:"Portfolio",url,description:""}]}));}
 assert.throws(()=>normalizeSection("portfolio",{portfolio:Array(11).fill({title:"Portfolio",url:"https://example.com",description:""})}));
 assert.throws(()=>normalizeSection("portfolio",{portfolio:[{title:"",url:"https://example.com",description:""}]}));assert.deepEqual(normalizeSection("portfolio",{portfolio:[]}),{portfolio:[]});
});
