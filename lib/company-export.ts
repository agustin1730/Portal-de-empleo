import type {CompanyLead} from "./company-pipeline-data.ts";

export function selectedCompanies(rows:CompanyLead[],ids:ReadonlySet<string>){return rows.filter(row=>ids.has(row.id));}
const columns=["ID","Empresa","Rubro","País","Sitio web","Fuente","Puestos de interés","Etapa","Contacto","Cargo del contacto","Correo","Teléfono","LinkedIn del contacto","Próxima acción","Fecha de seguimiento","Notas","Mensaje guardado","Contactos (JSON)","Actividad (JSON)","LinkedIn de la empresa","Instagram de la empresa"];
function cell(value:unknown){let text=String(value??"");if(/^[\s\uFEFF]*[=+@-]/u.test(text)||/^[\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
export function exportCompaniesCsv(companies:readonly CompanyLead[]){
 if(!companies.length)throw new Error("Seleccioná al menos una empresa.");
 const rows=companies.map(c=>{const contact=c.contacts[0];return [c.id,c.name,c.industry,c.country,c.website,c.source,c.roles,c.stage,contact?.name,contact?.role,contact?.email,contact?.phone,contact?.linkedin,c.nextAction,c.nextDate,c.notes,c.message,JSON.stringify(c.contacts),JSON.stringify(c.activity),c.linkedin,c.instagram];});
 return "\uFEFF"+[columns,...rows].map(row=>row.map(cell).join(",")).join("\r\n")+"\r\n";
}
export function companyExportFilename(companies:readonly CompanyLead[],day:string){const name=companies.length===1?companies[0].name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"sin-nombre":"seleccion-"+companies.length;return "empresas-"+name+"-"+day+".csv";}
