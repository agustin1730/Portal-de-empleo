import {test} from "node:test";
import assert from "node:assert/strict";
import {argentinaDate,buildDashboard,normalizeTask,normalizeReview,weekStart} from "../lib/dashboard-data.ts";
const now=new Date("2026-11-13T15:00:00Z");
const job=(id:string,status="pendiente",applied_at="",created_at="2026-11-13T10:00:00Z")=>({id,title:"Puesto "+id,company:"Empresa",status,applied_at,created_at});
test("Inicio uses Argentina's Monday week and only dated applications in that week",()=>{
 assert.equal(argentinaDate(new Date("2026-11-09T01:00:00Z")),"2026-11-08");assert.equal(weekStart("2026-11-08"),"2026-11-02");assert.equal(weekStart("2026-11-09"),"2026-11-09");
 const jobs=[job("a","postulado","2026-11-09"),job("b","contactado","2026-11-10"),job("c","entrevista","2026-11-11"),job("d","oferta","2026-11-12"),job("e","descartado","2026-11-13"),job("old","oferta","2026-11-08"),job("missing","entrevista"),job("future","postulado","2026-11-16")];
 const data=buildDashboard(jobs,[],null,now);assert.deepEqual(data.metrics,{applications:5,contacts:3,interviews:2,offers:1});assert.equal(data.weeks[3].count,5);assert.equal(data.weeks[2].count,1);assert.equal(data.review,null);
});
test("today tasks include overdue items, preserve later tasks and hide completed or discarded work",()=>{
 const tasks=[{id:"a",title:"Seguimiento",date:"2026-11-12",time:"",jobId:"a",done:false},{id:"b",title:"Entrevista",date:"2026-11-13",time:"16:00",jobId:"a",done:false},{id:"c",title:"Mañana",date:"2026-11-14",time:"",jobId:"a",done:false},{id:"d",title:"Hecha",date:"2026-11-12",time:"",jobId:"a",done:true},{id:"e",title:"Descartada",date:"2026-11-12",time:"",jobId:"trash",done:false}];
 const data=buildDashboard([job("a"),job("trash","descartado")],tasks,null,now);assert.deepEqual(data.due.map(task=>task.id),["a","b"]);assert.equal(data.tasks.length,4);assert.equal(data.recent.length,1);
});
test("review completion comes from source data and never from fit scores or email trash",()=>{
 const jobs=[{...job("a"),source_trash:true,assessment:{complete:true,description:"Aviso completo",requirements:[{},{}]}},{...job("b"),score:100},{...job("c"),enrichment:{status:"blocked"},assessment:{complete:true,description:"Texto anterior",requirements:[{},{}]}}];
 const data=buildDashboard(jobs,[],null,now);assert.equal(data.completeCount,1);assert.equal(data.pending.length,2);assert.equal(data.review,null);assert.equal(data.pending[1].reason,"Acceso bloqueado");
});
test("task and review metadata reject malformed dates and unverified counts",()=>{
 const task={id:"a",title:"Llamar",date:"2026-11-13",time:"16:00",jobId:"",done:false};assert.deepEqual(normalizeTask(task),task);
 assert.throws(()=>normalizeTask({...task,date:"2026-02-30"}));assert.throws(()=>normalizeTask({...task,time:"29:00"}));assert.throws(()=>normalizeTask({...task,title:""}));
 const review={status:"complete",started_at:"2026-11-13T12:00:00Z",finished_at:"2026-11-13T12:10:00Z",checked:20,completed:18,message:"Dos avisos pendientes."};assert.equal(normalizeReview(review).completed,18);assert.throws(()=>normalizeReview({...review,completed:21}));assert.throws(()=>normalizeReview({...review,finished_at:"2026-11-12T12:00:00Z"}));
});
