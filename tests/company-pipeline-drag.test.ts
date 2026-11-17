import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import * as data from "../lib/company-pipeline-data.ts";
import * as options from "../lib/company-options.ts";
import * as exporting from "../lib/company-export.ts";

test("dropping moves immediately, preserves data, and rolls back a rejected save",async()=>{
 const originalFetch=globalThis.fetch;
 try{for(const success of [true,false]){
  const company=data.normalizeCompany({id:"drag-test",name:"Example",notes:"Keep",contacts:[{linkedin:"linkedin.com/in/example"}]});
  const states:any[]=[company.id,"Por contactar","board",[company],"version-a",false,false,"","","",false,null,""];let cursor=0;
  const react={useState(initial:any){const index=cursor++;if(!(index in states))states[index]=initial;return [states[index],(next:any)=>{states[index]=typeof next==="function"?next(states[index]):next;}];},useRef:(value:any)=>({current:value}),useEffect(){},useLayoutEffect(){}};
  let resolve!:(response:Response)=>void;let body:any;globalThis.fetch=async(_url,init)=>{body=JSON.parse(String(init?.body));return await new Promise<Response>(r=>{resolve=r;});};
  const source=fs.readFileSync(new URL("../app/company-pipeline.tsx",import.meta.url),"utf8");const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const exported:any={};new Function("require","exports",code)((name:string)=>name==="react"?react:name==="react/jsx-runtime"?jsx:name.includes("company-pipeline-data")?data:name.includes("company-options")?options:name.includes("company-export")?exporting:{},exported);
  const root=exported.default();let destination:any;
  function walk(node:any){if(!node||typeof node!=="object")return;if(Array.isArray(node)){node.forEach(walk);return;}if(node.props?.["aria-label"]==="Por contactar"&&node.props.onDrop)destination=node;walk(node.props?.children);}
  walk(root);assert.ok(destination);destination.props.onDrop({preventDefault(){}});
  assert.equal(states[3][0].stage,"Por contactar");assert.equal(states[3][0].notes,"Keep");assert.equal(body.version,"version-a");assert.equal(body.company.contacts[0].linkedin,"https://linkedin.com/in/example");
  resolve(Response.json(success?{companies:[{...company,stage:"Por contactar"}],version:"version-b"}:{error:"No se pudo guardar."},{status:success?200:500}));
  await new Promise(r=>setTimeout(r,0));assert.equal(states[3][0].stage,success?"Por contactar":"Por investigar");assert.equal(states[3][0].notes,"Keep");assert.equal(states[4],success?"version-b":"version-a");assert.equal(states[6],false);
 }}finally{globalThis.fetch=originalFetch;}
});
