export const statuses = ["pendiente","guardado","por_postular","postulado","contactado","entrevista","oferta","descartado"] as const;
type Data = Record<string, any>;
const bounded=(x:any,n=2000)=>typeof x==="string"?x.slice(0,n):"";
function safeUrl(x:any){if(!x)return "";try{const u=new URL(x);return ["https:","http:"].includes(u.protocol)?u.href:"";}catch{return "";}}
export async function normalizeJob(x:Data){
 if(!x || typeof x!=="object" || !bounded(x.title,250).trim())throw new Error("Cada empleo necesita un título.");
 const url=safeUrl(x.url), company=bounded(x.company,200)||"Empresa a confirmar";
 const key=url||[x.title,company,x.location_label||""].join("|").toLowerCase().trim();
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(key));
 const derived=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,24);
 const id=typeof x.id==="string"&&/^[a-zA-Z0-9_-]{1,80}$/.test(x.id)?x.id:derived;
 const score=typeof x.score==="number"&&Number.isFinite(x.score)?Math.max(0,Math.min(100,Math.round(x.score))):null;
 const arr=(v:any)=>Array.isArray(v)?v.slice(0,10).map(x=>bounded(x,500)):[];
 return {id,title:bounded(x.title,250),title_original:bounded(x.title_original,250),company,
  portal:bounded(x.portal,60)||"Otro",industry:bounded(x.industry,200)||"Sector a confirmar",
  url,gmail_url:safeUrl(x.gmail_url),company_logo_url:safeUrl(x.company_logo_url),
  location_label:bounded(x.location_label||x.location,200)||"Ubicación a confirmar",
  mode:bounded(x.mode,60)||"A confirmar",salary_label:bounded(x.salary_label,200)||"Sueldo neto a confirmar",
  summary:bounded(x.summary,1200)||"Descripción pendiente de revisión.",score,
  recommendation:bounded(x.recommendation,80)||"Needs description",provisional:!!x.provisional,
  matches:arr(x.matches),gaps:arr(x.gaps),next_action:bounded(x.next_action,500)||"Revisar el aviso.",
  key_requirement:bounded(x.key_requirement,500),reason:bounded(x.reason,800),
  source_trash:!!x.source_trash,received_at:bounded(x.received_at,80),source_id:bounded(x.source_id,100),
  contact:bounded(x.contact,200),email:bounded(x.email,254),phone:bounded(x.phone,80),
  application_evidence:bounded(x.application_evidence,500),other_alert_emails:arr(x.other_alert_emails).map(safeUrl).filter(Boolean)};
}
