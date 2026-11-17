import test from "node:test";
import assert from "node:assert/strict";
import {noPermissions,normalizePermissions,storedPermissions,toolAllowed} from "../lib/connector-permissions.ts";
import {callCompanyTool} from "../lib/company-mcp.ts";
import {companyMcpResponse} from "../lib/company-mcp-http.ts";
test("permissions default closed, accept only known boolean fields and require report reading before writing",()=>{
 assert.deepEqual(storedPermissions(undefined),noPermissions);assert.deepEqual(storedPermissions({companies:true}),noPermissions);
 assert.throws(()=>normalizePermissions({...noPermissions,unknown:true}));assert.throws(()=>normalizePermissions({...noPermissions,profile:"true"}));assert.throws(()=>normalizePermissions({...noPermissions,research_write:true}));
 assert.equal(normalizePermissions({...noPermissions,profile:true}).profile,true);assert.equal(toolAllowed("get_professional_profile",noPermissions),false);assert.equal(toolAllowed("get_access_permissions",noPermissions),true);
});
test("cached tool calls are denied before reaching storage when a permission is disabled",async()=>{
 let reads=0;const services={companies:async()=>{reads++;return [];},research:async()=>{reads++;return null;},save:async()=>{reads++;return {};},profile:async()=>{reads++;return {};}};
 for(const [name,input] of [["list_companies",{}],["get_company",{id:"a"}],["get_professional_profile",{}],["get_company_research",{id:"a"}],["save_company_research",{id:"a"}]] as const)await assert.rejects(()=>callCompanyTool(name,input,services,noPermissions),/Acceso desactivado/);
 assert.equal(reads,0);await callCompanyTool("get_professional_profile",{},services,{...noPermissions,profile:true});assert.equal(reads,1);
});
test("tools/list and calls re-read live permissions, including existing tokens and empty connections",async()=>{
 let permissions={...noPermissions,companies:true},reads=0;
 const services={permissions:async()=>permissions,companies:async()=>{reads++;return [{id:"a",name:"A"}];},research:async()=>null,save:async()=>({})};
 const request=(method:string,params?:unknown)=>new Request("https://portal.test/mcp/companies",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
 let response=await(await companyMcpResponse(request("tools/list"),services)).json();assert.deepEqual(response.result.tools.map((t:any)=>t.name),["get_access_permissions","list_companies","get_company"]);
 permissions={...noPermissions};response=await(await companyMcpResponse(request("tools/list"),services)).json();assert.equal(response.result.tools.length,1);
 response=await(await companyMcpResponse(request("tools/call",{name:"get_company",arguments:{id:"a"}}),services)).json();assert.equal(response.result.isError,true);assert.equal(reads,0);
});
