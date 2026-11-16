import test from "node:test";
import assert from "node:assert/strict";
import {changeCompany,normalizeCompany,followUpDay} from "../lib/company-pipeline-data.ts";
const company={id:"example-1",name:"Example",stage:"Por investigar",contacts:[{name:"Recruiter",email:"recruiter@example.com"}],nextAction:"Enviar presentación",nextDate:"2026-11-20"};
test("company input rejects unsafe websites, impossible dates and invalid contacts",()=>{
 for(const website of ["javascript:alert(1)","https://user:secret@example.com","file:///test"])assert.throws(()=>normalizeCompany({...company,website}));
 assert.throws(()=>normalizeCompany({...company,nextDate:"2026-02-30"}));assert.throws(()=>normalizeCompany({...company,contacts:[{name:"A",email:"invalid"}]}));assert.throws(()=>normalizeCompany({...company,stage:"Postulado"}));
});
test("server keeps activity independent of client-supplied history and only changes selected company",()=>{
 const first=changeCompany([],{action:"save",company},"2026-11-16T12:00:00Z");const second=changeCompany(first,{action:"save",company:{...company,id:"example-2"}});const changed=changeCompany(second,{action:"save",company:{...company,stage:"Contactada",activity:[{text:"forged"}]}},"2026-11-16T13:00:00Z");
 assert.equal(changed.find(c=>c.id===company.id)!.activity.length,2);assert.equal(changed.find(c=>c.id===company.id)!.activity[0].text,"Etapa: Contactada");assert.deepEqual(changed[0],second[0]);assert.equal(first[0].stage,"Por investigar");
});
test("completing a next action retains saved company data and records the actual action",()=>{
 const rows=changeCompany([],{action:"save",company});const done=changeCompany(rows,{action:"complete",company:{...company,name:"Do not overwrite",notes:"ignored"}});
 assert.equal(done[0].name,"Example");assert.equal(done[0].nextAction,"");assert.equal(done[0].nextDate,"");assert.equal(done[0].activity[0].text,"Acción realizada: Enviar presentación");assert.throws(()=>changeCompany(done,{action:"complete",company}));
});
test("records and histories stay bounded",()=>{
 const initial=Array.from({length:200},(_,i)=>normalizeCompany({...company,id:"c"+i}));assert.throws(()=>changeCompany(initial,{action:"save",company}));const rows=changeCompany([],{action:"save",company});rows[0].activity=Array.from({length:50},()=>({text:"Old",at:"2026-11-16T12:00:00Z"}));assert.equal(changeCompany(rows,{action:"save",company})[0].activity.length,50);assert.throws(()=>normalizeCompany({...company,contacts:Array.from({length:11},()=>({name:"A"}))}));
});

test("minimal companies, partial contacts and independent follow-up fields are accepted",()=>{
 const minimal=normalizeCompany({id:"minimal",name:"Example"});assert.equal(minimal.stage,"Por investigar");assert.deepEqual(minimal.contacts,[]);assert.equal(minimal.nextDate,"");
 const partial=normalizeCompany({...company,nextAction:"",website:"example.com",contacts:[{phone:"123"},{}]});assert.equal(partial.nextDate,company.nextDate);assert.equal(partial.website,"https://example.com/");assert.equal(partial.contacts.length,1);assert.equal(partial.contacts[0].phone,"123");
 assert.equal(normalizeCompany({...company,nextDate:""}).nextAction,company.nextAction);
 const rows=changeCompany([],{action:"save",company:partial});const done=changeCompany(rows,{action:"complete",company:partial});assert.equal(done[0].nextDate,"");assert.equal(done[0].activity[0].text,"Acción realizada: Seguimiento");assert.deepEqual(done[0].contacts,partial.contacts);
});
test("date shortcuts follow Argentina time and calendar rollover",()=>{
 const now=new Date("2026-11-17T01:00:00Z");assert.equal(followUpDay(0,now),"2026-11-16");assert.equal(followUpDay(1,now),"2026-11-17");assert.equal(followUpDay(1,new Date("2026-12-31T23:30:00-03:00")),"2027-01-01");
});
