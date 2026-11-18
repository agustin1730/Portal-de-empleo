import test from "node:test";
import assert from "node:assert/strict";
import {normalizeReport,reportVersion,reportFileName,reportPagination} from "../lib/reports.ts";
import {callCompanyTool} from "../lib/company-mcp.ts";
import {noPermissions,storedPermissions} from "../lib/connector-permissions.ts";
const report={id:"10000000-0000-4000-8000-000000000001",title:" Carta ",kind:"carta",company_id:null,content:"# Hola\n\n**Texto**"};
test("reports validate identity, type, optional relationships and UTF-8 import limits without altering Markdown",()=>{
 assert.deepEqual(normalizeReport(report),{...report,title:"Carta"});assert.equal(normalizeReport({...report,company_id:"company-a"}).company_id,"company-a");
 for(const bad of [{id:"../x"},{kind:"otro"},{company_id:"foreign/id"},{title:" "},{content:"a".repeat(40001)},{content:"😀".repeat(13000)},{content:"x\0"},{owner_id:"other"}])assert.throws(()=>normalizeReport({...report,...bad}));
 assert.throws(()=>reportVersion(undefined));assert.equal(reportVersion(null),null);assert.throws(()=>reportPagination(-1,10));assert.throws(()=>reportPagination(0,101));assert.equal(reportFileName("../../Presentación <SDR>"),"Presentacion-SDR.md");
});
test("new report access stays off for existing permissions; cached MCP calls cannot reach storage after revocation",async()=>{
 const old={companies:true,contacts:false,applications:false,profile:false,notes:false,research_read:true,research_write:true};assert.deepEqual(storedPermissions(old),{...old,reports_read:false,reports_write:false});
 let reads=0,saved:unknown;const services={companies:async()=>[],research:async()=>null,save:async()=>({}),reports:async()=>{reads++;return {reports:[]};},report:async()=>{reads++;return report;},saveReport:async(r:unknown,v:unknown)=>{saved={r,v};return r;}};
 for(const [name,input] of [["list_reports",{}],["get_report",{id:report.id}],["save_report",{report,expected_version:null}]] as const)await assert.rejects(()=>callCompanyTool(name,input,services,noPermissions),/Acceso desactivado/);assert.equal(reads,0);
 const permissions={...noPermissions,reports_read:true,reports_write:true};await callCompanyTool("save_report",{report,expected_version:null},services,permissions);assert.deepEqual(saved,{r:{...report,title:"Carta"},v:null});
 await assert.rejects(()=>callCompanyTool("save_report",{report},services,permissions),/Recargá/);await assert.rejects(()=>callCompanyTool("list_reports",{limit:51},services,permissions),/Máximo/);await callCompanyTool("get_report",{id:report.id},services,permissions);assert.equal(reads,1);
});
