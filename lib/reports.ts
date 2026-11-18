export const reportKinds=[{value:"investigacion",label:"Investigacion"},{value:"carta",label:"Carta"}] as const;
export type ReportKind=typeof reportKinds[number]["value"];
export type ReportInput={id:string;title:string;kind:ReportKind;company_id:string|null;content:string};
export type Report=ReportInput&{created_at:string;updated_at:string};
export type ReportSummary=Omit<Report,"content">;
export type ReportPage={reports:ReportSummary[];next_offset:number|null};
export class ReportError extends Error {status:number;constructor(message:string,status=400){super(message);this.status=status;}}
export function reportId(value:unknown){if(typeof value!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new ReportError("Identificador de informe inválido.");return value;}
export function normalizeReport(input:unknown):ReportInput{
 if(!input||typeof input!=="object"||Array.isArray(input))throw new ReportError("Informe inválido.");
 const r=input as Record<string,unknown>;
 if(Object.keys(r).some(k=>!["id","title","kind","company_id","content"].includes(k)))throw new ReportError("Propiedad no permitida.");
 if(typeof r.title!=="string"||!r.title.trim()||r.title.length>200)throw new ReportError("Escribí un título de hasta 200 caracteres.");
 if(r.kind!=="investigacion"&&r.kind!=="carta")throw new ReportError("Seleccioná Investigacion o Carta.");
 if(r.company_id!==null&&(typeof r.company_id!=="string"||!/^[a-zA-Z0-9_-]{1,80}$/.test(r.company_id)))throw new ReportError("Seleccioná una empresa del CRM o quitá la relación.");
 if(typeof r.content!=="string"||r.content.includes("\0")||r.content.length>40000||new TextEncoder().encode(r.content).length>50000)throw new ReportError("El informe admite hasta 40.000 caracteres y 50 KB de texto.");
 return {id:reportId(r.id),title:r.title.trim(),kind:r.kind,company_id:r.company_id,content:r.content.replace(/^\uFEFF/,"")};
}
export function reportVersion(value:unknown){if(value!==null&&(typeof value!=="string"||value.length>50||!Number.isFinite(Date.parse(value))))throw new ReportError("Recargá el informe antes de guardar.");return value as string|null;}
export function reportFileName(title:string){return (title.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-|-$/g,"").slice(0,100)||"informe")+".md";}
export function reportPagination(offset:unknown=0,limit:unknown=100){if(!Number.isSafeInteger(offset)||Number(offset)<0||Number(offset)>100000||!Number.isSafeInteger(limit)||Number(limit)<1||Number(limit)>100)throw new ReportError("Paginación inválida.");return {offset:Number(offset),limit:Number(limit)};}
