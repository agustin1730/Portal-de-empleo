import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import * as icons from "lucide-react";
import {renderToStaticMarkup} from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as reportData from "../lib/reports.ts";
function load(name:string,react:any={}){const code=ts.transpileModule(readFileSync(new URL("../app/"+name+".tsx",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const exported:any={};new Function("require","exports",code)((id:string)=>id==="react"?react:id==="react/jsx-runtime"?jsx:id==="lucide-react"?icons:id==="../lib/reports"?reportData:id==="next/dynamic"?{default:()=>()=>null}:id==="react-markdown"?{default:Markdown}:id==="remark-gfm"?{default:remarkGfm}:{default:()=>null},exported);return exported;}
function nodes(root:any){const values:any[]=[];function walk(n:any){if(!n||typeof n!=="object")return;if(Array.isArray(n)){n.forEach(walk);return;}values.push(n);walk(n.props?.children);}walk(root);return values;}
test("Markdown preview renders formatting and tables while refusing executable HTML, unsafe links and remote image requests",()=>{
 const component=load("report-markdown");for(const url of ["javascript:alert(1)","data:text/html,hi","https://user:pass@example.test","/api/profile"])assert.equal(component.safeReportUrl(url),"");
 const content='# Example\n\n**Bold** and [Source](https://example.test)\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert(1))\n\n![tracker](https://example.test/pixel.png)\n\n| A | B |\n| - | - |\n| 1 | 2 |';
 const html=renderToStaticMarkup(component.default({content}));assert.match(html,/<h1>Example<\/h1>/);assert.match(html,/<strong>Bold<\/strong>/);assert.match(html,/<table>/);assert.match(html,/rel="noopener noreferrer"/);assert.doesNotMatch(html,/<script|javascript:|<img|pixel\.png/);
});
test("inline report property changes preserve content and use the displayed version; stale rows never post",async()=>{
 const original=globalThis.fetch;try{for(const stale of [false,true]){
 const row={id:"10000000-0000-4000-8000-000000000001",title:"Example",kind:"investigacion",company_id:"a",created_at:"2026-11-18T00:00:00Z",updated_at:"2026-11-18T01:00:00Z"};
 const values:any[]=[[row],[{value:"a",label:"A"},{value:"b",label:"B"}],"",false,false,"","","","","",null,new Set(),null,null,"",false];let index=0;const references:any[]=[];
 const react={useState(initial:any){const i=index++;if(!(i in values))values[i]=initial;return [values[i],(v:any)=>values[i]=typeof v==="function"?v(values[i]):v];},useRef:(v:any)=>{const r={current:v};references.push(r);return r;},useEffect(){},useMemo:(fn:any)=>fn()};
 let posted:any;globalThis.fetch=async(_url,init)=>{if(init?.method==="POST"){posted=JSON.parse(String(init.body));return Response.json({report:{...row,...posted.report,updated_at:"2026-11-18T02:00:00Z"}});}return Response.json({report:{...row,content:"# Keep this",updated_at:stale?"2026-11-18T01:01:00Z":row.updated_at}});};
 const tree=load("reports",react).default({displayName:"Owner"}),property=nodes(tree).find(n=>n.props?.label==="Empresa"&&n.props?.value==="a");assert.ok(property);property.props.onChange("b");await new Promise(r=>setTimeout(r,0));
 if(stale){assert.equal(posted,undefined);assert.match(values[5],/cambió/);}else{assert.equal(posted.report.company_id,"b");assert.equal(posted.report.content,"# Keep this");assert.equal(posted.expected_version,row.updated_at);assert.equal(values[0][0].company_id,"b");}
 }}finally{globalThis.fetch=original;}
});
