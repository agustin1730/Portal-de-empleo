import {normalizeCompanyLink} from "./company-links.ts";
export const companyStages=["Por investigar","Por contactar","Contactada","En conversación","Cerrada"] as const;
export type CompanyStage=typeof companyStages[number];
export type CompanyContact={name:string;role:string;email:string;phone:string;linkedin?:string};
export type CompanyLead={id:string;name:string;industry:string;country:string;website:string;linkedin?:string;instagram?:string;source:string;roles:string;stage:CompanyStage;contacts:CompanyContact[];notes:string;nextAction:string;nextDate:string;message:string;activity:{text:string;at:string}[]};
const str=(value:unknown,max:number)=>{if(value===undefined)return "";if(typeof value!=="string"||value.length>max)throw new Error("Campo inválido o demasiado extenso.");return value.trim();};
export function followUpDay(offset:0|1=0,now=new Date()){
 const day=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 const date=new Date(day+"T12:00:00Z");date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);
}
export function normalizeCompany(input:unknown):CompanyLead{
 if(!input||typeof input!=="object"||Array.isArray(input))throw new Error("Empresa no válida.");const r=input as Record<string,unknown>;
 const id=str(r.id,80),name=str(r.name,200),stage=r.stage??companyStages[0];if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||!companyStages.includes(stage as CompanyStage))throw new Error("Revisá la empresa y la etapa.");
 let website=str(r.website,2000);if(website){let u;try{u=new URL(/^[a-z][a-z\d+.-]*:/i.test(website)?website:"https://"+website);}catch{throw new Error("Revisá el sitio web.");}if(!["https:","http:"].includes(u.protocol)||u.username||u.password)throw new Error("Usá una URL http/https sin credenciales.");website=u.href;}
 const nextDate=str(r.nextDate,10);if(nextDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)||!Number.isFinite(Date.parse(nextDate))||new Date(nextDate).toISOString().slice(0,10)!==nextDate))throw new Error("Fecha no válida.");
 const nextAction=str(r.nextAction,300);
 if(r.contacts!==undefined&&!Array.isArray(r.contacts)||Array.isArray(r.contacts)&&r.contacts.length>10)throw new Error("Máximo 10 contactos por empresa.");
 const contacts=((r.contacts||[]) as unknown[]).map(c=>{if(!c||typeof c!=="object"||Array.isArray(c))throw new Error("Contacto no válido.");const v=c as Record<string,unknown>,name=str(v.name,200),role=str(v.role,200),email=str(v.email,254),phone=str(v.phone,80);let linkedin=str(v.linkedin,2000);if(linkedin){let url;try{url=new URL(/^[a-z][a-z\d+.-]*:/i.test(linkedin)?linkedin:"https://"+linkedin);}catch{throw new Error("Revisá el LinkedIn del contacto.");}if(!["http:","https:"].includes(url.protocol)||url.username||url.password||!(url.hostname==="linkedin.com"||url.hostname.endsWith(".linkedin.com")))throw new Error("Usá un enlace válido de LinkedIn.");linkedin=url.href;}if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("Correo no válido.");return {name,role,email,phone,linkedin};}).filter(c=>c.name||c.role||c.email||c.phone||c.linkedin);
 return {id,name,stage:stage as CompanyStage,website,linkedin:normalizeCompanyLink(str(r.linkedin,2000),"linkedin"),instagram:normalizeCompanyLink(str(r.instagram,2000),"instagram"),industry:str(r.industry,200),country:str(r.country,200),source:str(r.source,200),roles:str(r.roles,300),notes:str(r.notes,12000),nextAction,nextDate,contacts,message:str(r.message,5000),activity:[]};
}
export function changeCompany(rows:CompanyLead[],input:unknown,now=new Date().toISOString()){
 if(!input||typeof input!=="object")throw new Error("Acción inválida.");const body=input as Record<string,unknown>;const lead=normalizeCompany(body.company),old=rows.find(r=>r.id===lead.id);
 if(body.action!=="save"&&body.action!=="complete")throw new Error("Acción inválida.");if(body.action==="complete"&&(!old||!old.nextAction&&!old.nextDate))throw new Error("No hay una acción pendiente.");
 if(!old&&rows.length>=200)throw new Error("Máximo 200 empresas en esta versión.");
 const event=body.action==="complete"?"Acción realizada: "+(old!.nextAction||"Seguimiento"):!old?"Empresa agregada":old.stage!==lead.stage?"Etapa: "+lead.stage:"Datos actualizados";
 if(body.action==="complete"){Object.assign(lead,old,{nextAction:"",nextDate:""});}
 lead.activity=[{text:event,at:now},...(old?.activity||[])].slice(0,50);
 return old?rows.map(r=>r.id===lead.id?lead:r):[lead,...rows];
}
