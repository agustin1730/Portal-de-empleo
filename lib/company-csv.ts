import {changeCompany,normalizeCompany,type CompanyLead} from "./company-pipeline-data.ts";

export const csvFields=[
 ["name","Empresa"],["website","Sitio web"],["industry","Rubro"],["country","Ubicación"],
 ["source","Fuente"],["roles","Puestos de interés"],["stage","Etapa"],["contactName","Contacto"],
 ["email","Correo"],["phone","Teléfono"],["contactRole","Cargo del contacto"],
 ["nextAction","Próxima acción"],["nextDate","Fecha de seguimiento"],["notes","Notas"],
] as const;
export type CsvField=typeof csvFields[number][0];
export type CsvTable={headers:string[];rows:string[][]};
const key=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const aliases:Record<CsvField,string[]>={name:["empresa","compania","company","name","nombre","razon social"],website:["sitio web","website","web","url"],industry:["rubro","industria","industry","sector"],country:["ubicacion","pais","country","location","ciudad"],source:["fuente","source","origen"],roles:["puestos de interes","puestos","roles"],stage:["etapa","stage","estado"],contactName:["contacto","nombre contacto","contact name"],email:["correo","email","mail"],phone:["telefono","phone","celular"],contactRole:["cargo del contacto","cargo","contact role"],nextAction:["proxima accion","next action"],nextDate:["fecha de seguimiento","next date","fecha"],notes:["notas","notes","observaciones"]};

// Quoted separators, escaped quotes and multiline cells follow the CSV convention.
export function parseCompanyCsv(raw:string):CsvTable{
 if(new TextEncoder().encode(raw).length>1_000_000)throw new Error("El CSV debe pesar menos de 1 MB.");
 const text=raw.replace(/^\uFEFF/,"");
 let quoted=false,first="";for(let i=0;i<text.length;i++){const c=text[i];if(c==='"')quoted=!quoted;if(!quoted&&(c==='\n'||c==='\r'))break;first+=c;}
 const counts=[",",";","\t"].map(separator=>{let n=0,q=false;for(const c of first){if(c==='"')q=!q;else if(c===separator&&!q)n++;}return {separator,n};});
 const separator=counts.sort((a,b)=>b.n-a.n)[0].separator;
 const rows:string[][]=[];let row:string[]=[],cell="",inQuotes=false,closed=false;
 const finishCell=()=>{row.push(cell);cell="";closed=false;};
 const finishRow=()=>{finishCell();if(row.some(c=>c.trim()))rows.push(row);row=[];if(rows.length>201)throw new Error("Máximo 200 filas por archivo.");};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(inQuotes){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{inQuotes=false;closed=true;}}else cell+=c;continue;}
  if(c===separator){finishCell();continue;}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;finishRow();continue;}
  if(c==='"'){if(cell||closed)throw new Error("Comillas inválidas en el CSV.");inQuotes=true;continue;}
  if(closed){if(c===' '||c==='\t')continue;throw new Error("Revisá las comillas del CSV.");}cell+=c;
 }
 if(inQuotes)throw new Error("El CSV tiene comillas sin cerrar.");
 finishRow();if(rows.length<2)throw new Error("Incluí encabezados y al menos una empresa.");
 const headers=rows.shift()!.map(h=>h.trim());if(headers.length>40)throw new Error("Máximo 40 columnas.");
 if(rows.some(r=>r.length!==headers.length))throw new Error("Hay filas con distinta cantidad de columnas. Revisá el separador y las comillas.");
 return {headers,rows};
}
export function detectCsvColumns(headers:string[]):Partial<Record<CsvField,number>>{
 const mapping:Partial<Record<CsvField,number>>={};for(const [field] of csvFields){const index=headers.findIndex(h=>aliases[field].some(a=>key(a)===key(h)));if(index>=0)mapping[field]=index;}return mapping;
}
function websiteKey(website:string){if(!website)return "";try{return new URL(website).hostname.toLowerCase().replace(/^www\./,"");}catch{return "";}}
const companyNameKey=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
export function isDuplicateCompany(a:CompanyLead,b:CompanyLead){const name=companyNameKey(a.name);return !!name&&name===companyNameKey(b.name)||!!websiteKey(a.website)&&websiteKey(a.website)===websiteKey(b.website);}
export function prepareCompanyCsv(table:CsvTable,mapping:Partial<Record<CsvField,number>>,existing:CompanyLead[]){
 if(mapping.name===undefined)throw new Error("Elegí la columna Empresa.");
 const selected=Object.values(mapping);if(new Set(selected).size!==selected.length)throw new Error("Usá una columna diferente para cada campo.");
 const companies:CompanyLead[]=[],issues:{row:number;message:string}[]=[];let duplicates=0;
 table.rows.forEach((row,index)=>{try{
  const values=Object.fromEntries(csvFields.map(([field])=>[field,mapping[field]===undefined?"":(row[mapping[field]!]||"").trim()]));
  const company=normalizeCompany({...values,id:"csv-"+index,stage:values.stage||"Por investigar",contacts:[{name:values.contactName,role:values.contactRole,email:values.email,phone:values.phone}]});
  if([...existing,...companies].some(c=>isDuplicateCompany(c,company))){duplicates++;return;}
  companies.push(company);
 }catch(e){issues.push({row:index+2,message:e instanceof Error?e.message:"Fila inválida."});}});
 return {companies,issues,duplicates};
}
export function importCompanyBatch(existing:CompanyLead[],input:unknown){
 if(!Array.isArray(input)||!input.length||input.length>200)throw new Error("Importá entre 1 y 200 empresas.");
 let rows=existing;let imported=0,duplicates=0;
 for(const item of input){const company=normalizeCompany(item);if(rows.some(c=>isDuplicateCompany(c,company))){duplicates++;continue;}if(rows.some(c=>c.id===company.id))throw new Error("Identificador repetido. Volvé a preparar el CSV.");rows=changeCompany(rows,{action:"save",company});imported++;}
 return {companies:rows,imported,duplicates};
}
