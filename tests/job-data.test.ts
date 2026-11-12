import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeJob} from '../lib/job-data.ts';
test('rejects blank records and neutralizes executable links',async()=>{
 await assert.rejects(()=>normalizeJob({}));
 const j=await normalizeJob({title:'QA',url:'javascript:alert(1)',gmail_url:'data:text/html,secret'});
 assert.equal(j.url,'');assert.equal(j.gmail_url,'');assert.equal(j.score,null);
});
test('imports match by stable public URL while supplied IDs preserve previous records',async()=>{
 const a=await normalizeJob({title:'Sales',company:'A',url:'https://example.test/jobs/123'});
 const b=await normalizeJob({title:'Updated title',company:'A',url:'https://example.test/jobs/123'});
 assert.equal(a.id,b.id);
 const c=await normalizeJob({id:a.id,title:'Translated role',company:'A'});assert.equal(c.id,a.id);
});
test('limits imported content and distinguishes unknown fit from zero fit',async()=>{
 const j=await normalizeJob({title:'QA',score:200,summary:'x'.repeat(3000),gaps:Array(50).fill('gap')});
 assert.equal(j.score,100);assert.equal(j.summary.length,1200);assert.equal(j.gaps.length,10);
 assert.equal((await normalizeJob({title:'QA',score:0})).score,0);
 assert.equal((await normalizeJob({title:'QA',score:'80'})).score,null);
});
