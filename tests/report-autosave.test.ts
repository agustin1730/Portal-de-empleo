import test from "node:test";
import assert from "node:assert/strict";
import {ReportAutosave,type AutosaveState} from "../lib/report-autosave.ts";
import type {Report,ReportInput} from "../lib/reports.ts";
const initial:ReportInput={id:"10000000-0000-4000-8000-000000000001",title:"Example",kind:"investigacion",company_id:null,content:"Original"};
const row=(input:ReportInput,version:string):Report=>({...input,created_at:"2026-11-18T00:00:00Z",updated_at:version});
const version="2026-11-18T00:00:00Z";
test("autosave serializes requests, preserves typing during saves and drains the latest text before close",async()=>{
 let release!:(r:Report)=>void;const writes:{draft:ReportInput;version:string|null}[]=[];const states:AutosaveState[]=[];
 const s=new ReportAutosave(initial,version,{save:async(draft,v)=>{writes.push({draft,version:v});return new Promise(r=>{release=r;});},load:async()=>null,saved:()=>{},changed:state=>states.push(state)},10000);
 try{s.update({content:"First"});const done=s.flush();await Promise.resolve();assert.equal(writes.length,1);s.update({content:"Latest",company_id:"company-a"});release(row(writes[0].draft,"2026-11-18T00:01:00Z"));await new Promise(r=>setTimeout(r,0));assert.equal(writes.length,2);assert.equal(writes[1].draft.content,"Latest");assert.equal(writes[1].draft.company_id,"company-a");assert.equal(writes[1].version,"2026-11-18T00:01:00Z");release(row(writes[1].draft,"2026-11-18T00:02:00Z"));assert.equal(await done,true);assert.equal(s.state().status,"saved");assert.equal(s.state().dirty,false);assert.ok(states.some(v=>v.status==="saving"));}finally{s.suspend();}
});
test("failed saves stop background writes; ambiguous committed responses reconcile safely and concurrent changes stay blocked",async()=>{
 let writes=0,remote:Report|null=row(initial,version),fail=true;const s=new ReportAutosave(initial,version,{save:async(draft)=>{writes++;remote=row(draft,"2026-11-18T00:01:00Z");if(fail)throw Error("Connection lost");return remote;},load:async()=>remote,saved:()=>{},changed:()=>{}},5);
 try{s.update({content:"Submitted"});assert.equal(await s.flush(),false);assert.equal(s.state().status,"error");s.update({content:"New local text"});await new Promise(r=>setTimeout(r,15));assert.equal(writes,1);fail=false;assert.equal(await s.retry(),true);assert.equal(writes,2);assert.equal(remote!.content,"New local text");
  fail=true;s.update({content:"Third"});assert.equal(await s.flush(),false);remote=row({...initial,content:"External edit"},"2026-11-18T00:03:00Z");const before=writes;assert.equal(await s.retry(),false);assert.equal(writes,before);assert.equal(s.state().draft.content,"Third");assert.match(s.state().error,/Otra ventana/);
 }finally{s.suspend();}
});
test("initial content never autosaves on open, imports need acceptance, and invalid drafts stay local",async()=>{
 let writes=0;const io={save:async(draft:ReportInput)=>{writes++;return row(draft,"2026-11-18T00:01:00Z");},load:async()=>null,saved:()=>{},changed:()=>{}};
 const s=new ReportAutosave(initial,null,io,5,true);try{s.resume();await new Promise(r=>setTimeout(r,10));assert.equal(writes,0);s.update({title:"Imported"});await new Promise(r=>setTimeout(r,10));assert.equal(writes,0);assert.equal(await s.accept(),true);assert.equal(writes,1);assert.equal(s.state().needsAcceptance,false);}finally{s.suspend();}
 const empty=new ReportAutosave({...initial,title:""},null,io,5);try{empty.update({content:"Kept local"});assert.equal(await empty.flush(),false);assert.equal(writes,1);assert.equal(empty.state().draft.content,"Kept local");assert.equal(empty.state().status,"error");}finally{empty.suspend();}
});
