import test from "node:test";
import assert from "node:assert/strict";
import {parseCompanyCsv,detectCsvColumns,prepareCompanyCsv,importCompanyBatch} from "../lib/company-csv.ts";
import {normalizeCompany} from "../lib/company-pipeline-data.ts";
test("CSV handles BOM, regional delimiters, escaped quotes and multiline values",()=>{
 const table=parseCompanyCsv('\uFEFFEmpresa;Notas;Correo\r\n"ACME; Sur";"Primera línea\nDice ""hola""";a@example.com\r\n');
 assert.equal(table.rows[0][0],"ACME; Sur");assert.equal(table.rows[0][1],'Primera línea\nDice "hola"');
 const ready=prepareCompanyCsv(table,detectCsvColumns(table.headers),[]);assert.equal(ready.companies.length,1);assert.equal(ready.companies[0].contacts[0].email,"a@example.com");
 assert.equal(parseCompanyCsv("Company\tWebsite\nAcme\texample.com").rows[0][1],"example.com");
});
test("CSV rejects malformed, oversized, header-only and excessive input",()=>{
 for(const text of ['Empresa,Notas\nA,"unclosed','Empresa,Notas\nA,b,c','Empresa\n','Empresa\nA"b','Empresa\n"A"x'])assert.throws(()=>parseCompanyCsv(text));
 assert.throws(()=>parseCompanyCsv("Empresa\n"+"a".repeat(1_000_000)));
 assert.throws(()=>parseCompanyCsv("Empresa\n"+Array.from({length:201},(_,i)=>"E"+i).join("\n")));
});
test("mapping is explicit, validates rows and omits duplicates without replacing existing notes",()=>{
 const existing=normalizeCompany({id:"existing",name:"Ácme",website:"https://www.example.com",notes:"Keep",stage:"Cerrada"});
 const table=parseCompanyCsv("Organización,Web,Email,Fecha\nACME,,,\nOther,example.com,,\nNew,new.example,invalid,\nValid,,,2026-02-30\nFresh,,contact@example.org,");
 assert.throws(()=>prepareCompanyCsv(table,{},[existing]));assert.throws(()=>prepareCompanyCsv(table,{name:0,notes:0},[]));
 const result=prepareCompanyCsv(table,{name:0,website:1,email:2,nextDate:3},[existing]);assert.equal(result.duplicates,2);assert.equal(result.issues.length,2);assert.equal(result.companies[0].name,"Fresh");assert.equal(existing.notes,"Keep");assert.equal(existing.stage,"Cerrada");
});
test("batch imports are bounded, deduplicated and never mutate source rows on failure",()=>{
 const existing=normalizeCompany({id:"existing",name:"Acme",notes:"Keep"});
 const result=importCompanyBatch([existing],[{id:"new",name:"New"},{id:"duplicate",name:"Acme"}]);assert.equal(result.imported,1);assert.equal(result.duplicates,1);assert.equal(result.companies.find(c=>c.id==="existing")!.notes,"Keep");
 const source=[existing];assert.throws(()=>importCompanyBatch(source,[{id:"new",name:"New"},{id:"bad",name:"",stage:"invalid"}]));assert.equal(source.length,1);
 assert.throws(()=>importCompanyBatch(source,[{id:"existing",name:"Different"}]));assert.throws(()=>importCompanyBatch([],[]));
 const full=Array.from({length:200},(_,i)=>normalizeCompany({id:"c"+i,name:"Company "+i}));assert.throws(()=>importCompanyBatch(full,[{id:"extra",name:"Extra"}]));assert.equal(full.length,200);
});

