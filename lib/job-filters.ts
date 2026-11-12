type FilterJob = {industry?:string; status?:string; mode?:string; portal?:string; title?:string; company?:string; location_label?:string; received_at?:string; created_at?:string};
const fold=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export function marketFor(job:FilterJob){
 const original=job.industry?.trim()||"";const industry=fold(original);
 if(!industry||/^(sector a confirmar|sin clasificar|otro|otros|a confirmar)$/.test(industry))return "Sin clasificar";
 const groups:[string,RegExp][]=[
  ["Automotriz",/automot|autopart|concesionari|vehicul/],
  ["Gastronomía",/gastronom|restauran|cafeter|catering/],
  ["Hotelería y turismo",/hoteler|hotel|turismo|hospitality/],
  ["Comercio y retail",/retail|comercio|indumentaria|supermercado/],
  ["Logística",/logistica|transporte|distribucion/],
  ["Tecnología",/tecnologia|software|informatica/],
  ["Salud",/salud|sanidad|hospital|clinica|farmaceut/],
  ["Industria y producción",/manufactura|produccion|industrial/],
  ["Finanzas y seguros",/finanzas|banca|bancario|seguros/],
  ["Construcción e inmobiliaria",/construccion|inmobiliari/],
  ["Educación",/educacion|ensenanza/],
 ];
 return groups.find(([,pattern])=>pattern.test(industry))?.[0]||original;
}
export type JobFilters={section:string;search:string;portal:string;mode:string;market:string;status:string;period:string};
export function matchesJob(job:FilterJob,filters:JobFilters,now=new Date()){
 const trash=filters.section==="basura";
 if((job.status==="descartado")!==trash)return false;
 if(!trash&&filters.section!=="todos"&&job.status!==filters.section)return false;
 const query=fold(filters.search.trim());
 if(query&&!fold([job.title,job.company,job.location_label].join(" ")).includes(query))return false;
 if(filters.portal!=="todos"&&job.portal!==filters.portal)return false;
 if(filters.market!=="todos"&&marketFor(job)!==filters.market)return false;
 if(filters.status!=="todos"&&job.status!==filters.status)return false;
 if(filters.mode!=="todos"&&job.mode!==filters.mode)return false;
 if(filters.period!=="todos"){
  const value=job.received_at||job.created_at;
  if(!value)return false;
  const date=new Date(value);const age=now.valueOf()-date.valueOf();
  if(!Number.isFinite(age)||age<0||age>Number(filters.period)*86400000)return false;
 }
 return true;
}
