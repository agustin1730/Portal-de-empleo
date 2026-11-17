import test from "node:test";
import assert from "node:assert/strict";
import {normalizeResearch} from "../lib/company-research.ts";
import {callCompanyTool} from "../lib/company-mcp.ts";
import {companyMcpResponse} from "../lib/company-mcp-http.ts";
import {authorizationId,connectorClientAllowed,connectorOriginAllowed} from "../lib/company-connector-auth.ts";
const report=()=>({summary:"Empresa de ejemplo",facts:[{text:"Ofrece software",source:0}],hypotheses:["Posible interés comercial"],unknowns:["Vacantes actuales"],nextSteps:["Consultar carreras"],sources:[{title:"Sitio oficial",url:"https://example.test/company",consultedAt:"2026-01-01"}]});
const rows=[{id:"a",name:"Alpha",industry:"Software",country:"Argentina",notes:"Private CRM note",contacts:[{email:"public@example.test"}]},{id:"b",name:"Beta",industry:"Industria",country:"Chile"}];
const allow={companies:true,contacts:true,applications:true,profile:true,notes:true,research_read:true,research_write:true};
const service={permissions:async()=>allow,companies:async(id?:string)=>rows.filter(c=>!id||c.id===id),research:async()=>null,save:async(id:string,r:unknown,v:unknown)=>({id,report:r,version:v})};
test("research requires real source references, safe links, bounded data and valid dates",()=>{
 assert.equal(normalizeResearch(report()).facts[0].source,0);
 for(const edit of [(r:any)=>r.facts[0].source=1,(r:any)=>r.sources[0].url="javascript:alert(1)",(r:any)=>r.sources[0].url="https://user:pass@example.test",(r:any)=>r.sources[0].consultedAt="2026-02-30",(r:any)=>r.sources[0].consultedAt="2999-01-01",(r:any)=>r.summary="",(r:any)=>r.facts=Array(31).fill(r.facts[0])]){const r=report();edit(r);assert.throws(()=>normalizeResearch(r));}
});
test("company tools paginate and minimize lists without leaking notes or contacts",async()=>{
 const result:any=await callCompanyTool("list_companies",{query:"argentina",limit:1},service,allow);assert.equal(result.total,1);assert.equal(result.companies[0].id,"a");assert.equal(result.companies[0].notes,undefined);assert.equal(result.companies[0].contacts,undefined);
 const next:any=await callCompanyTool("list_companies",{limit:1},service,allow);assert.equal(next.next_offset,1);
 assert.equal((await callCompanyTool("get_company",{id:"a"},service,allow) as any).contacts[0].email,"public@example.test");
 await assert.rejects(()=>callCompanyTool("get_company",{id:"missing"},service,allow),/no encontrada/);
 for(const args of [{limit:51},{offset:-1},{owner_id:"other"},{query:3}])await assert.rejects(()=>callCompanyTool("list_companies",args,service,allow));
 await assert.rejects(()=>callCompanyTool("delete_company",{id:"a"},service,allow));
});
test("writes validate evidence before invoking persistence",async()=>{
 let called=false;const services={...service,save:async()=>{called=true;return {};}};
 await assert.rejects(()=>callCompanyTool("save_company_research",{id:"a",report:{},expected_version:null},services,allow));assert.equal(called,false);
 await callCompanyTool("save_company_research",{id:"a",report:report(),expected_version:null},services,allow);assert.equal(called,true);
});
function request(body:unknown,extra:Record<string,string>={}){return new Request("https://portal.test/mcp/companies",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json, text/event-stream",...extra},body:typeof body==="string"?body:JSON.stringify(body)});}
test("stateless Streamable HTTP initializes, lists tools, accepts notifications and reports tool errors",async()=>{
 const init=await companyMcpResponse(request({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-06-18",capabilities:{},clientInfo:{name:"test",version:"1"}}}),service,allow);assert.equal(init.status,200);assert.equal((await init.json()).result.protocolVersion,"2025-06-18");
 const notification=await companyMcpResponse(request({jsonrpc:"2.0",method:"notifications/initialized"}),service,allow);assert.equal(notification.status,202);
 const tools=await (await companyMcpResponse(request({jsonrpc:"2.0",id:2,method:"tools/list"}),service,allow)).json();assert.equal(tools.result.tools.length,8);assert.equal(tools.result.tools[0].annotations.readOnlyHint,true);
 const call=await(await companyMcpResponse(request({jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"get_company",arguments:{id:"a"}}}),service,allow)).json();assert.equal(call.result.structuredContent.data.id,"a");
 const fail=await(await companyMcpResponse(request({jsonrpc:"2.0",id:4,method:"tools/call",params:{name:"get_company",arguments:{id:"missing"}}}),service,allow)).json();assert.equal(fail.result.isError,true);
});
test("malformed requests, oversized payloads, invalid ids and unsupported protocol headers are rejected",async()=>{
 for(const body of ["{",[],null,{jsonrpc:"2.0",id:null,method:"ping"},{jsonrpc:"1.0",id:1,method:"ping"}])assert.equal((await companyMcpResponse(request(body),service,allow)).status,400);
 assert.equal((await companyMcpResponse(request(" ".repeat(60001)),service,allow)).status,413);
 assert.equal((await companyMcpResponse(request({jsonrpc:"2.0",id:1,method:"ping"},{"MCP-Protocol-Version":"unknown"}),service,allow)).status,400);
});
test("OAuth clients and browser origins are fail-closed; authorization IDs cannot become redirects",()=>{
 assert.equal(connectorClientAllowed("client",""),false);assert.equal(connectorClientAllowed("client"," client,other "),true);assert.equal(connectorClientAllowed("other","client"),false);
 assert.equal(authorizationId("https://evil.test"),null);assert.equal(authorizationId("a".repeat(32)),"a".repeat(32));assert.equal(authorizationId("x".repeat(129)),null);assert.equal(authorizationId("../oauth/consent"),null);assert.equal(authorizationId("00000000-0000-4000-8000-000000000001"),"00000000-0000-4000-8000-000000000001");
 assert.equal(connectorOriginAllowed(null,"https://portal.test"),true);assert.equal(connectorOriginAllowed("https://evil.test","https://portal.test",""),false);assert.equal(connectorOriginAllowed("https://chatgpt.com","https://portal.test","https://chatgpt.com"),true);
});
