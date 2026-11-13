export type Experience={role:string;company:string;start:string;end:string;ongoing?:boolean;description:string;industry?:string};
export type Education={title:string;institution:string;start:string;end:string;ongoing?:boolean};
export type Language={name:string;level:string};
export type PortfolioLink={title:string;url:string;description:string};
export type SkillEvidence={skill:string;context:string};
export type WorkPreferences={salaryMin:string;currency:string;salaryBasis:string;salaryPeriod:string;roles:string;industries:string;location:string;modality:string;hours:string;availability:string};
export const emptyPreferences:WorkPreferences={salaryMin:"",currency:"ARS",salaryBasis:"neto",salaryPeriod:"mes",roles:"",industries:"",location:"",modality:"",hours:"",availability:""};
export type Profile={name:string;headline:string;location:string;email:string;phone:string;summary:string;experience:Experience[];education:Education[];skills:string[];personalSkills:string[];languages:Language[];letter:string;portfolio:PortfolioLink[];skillEvidence:SkillEvidence[];preferences:WorkPreferences};
export const emptyProfile:Profile={name:"",headline:"",location:"",email:"",phone:"",summary:"",experience:[],education:[],skills:[],personalSkills:[],languages:[],letter:"",portfolio:[],skillEvidence:[],preferences:emptyPreferences};
export function formatProfileDate(value:string){return /^\d{4}$/.test(value)?value:value?new Date(value+"-02T12:00:00").toLocaleDateString("es-AR",{month:"short",year:"numeric"}):"Por confirmar";}
export function profilePeriod(row:{start:string;end:string;ongoing?:boolean},education=false){if(!row.start&&row.end)return formatProfileDate(row.end);return `${formatProfileDate(row.start)} – ${row.end?formatProfileDate(row.end):row.ongoing===false?"Finalización por confirmar":education?"En curso":"Actualidad"}`;}
export const profileSections=["contact","summary","experience","education","skills","languages","letter","portfolio","preferences"] as const;
export type ProfileSection=typeof profileSections[number];
const fields:Record<ProfileSection,(keyof Profile)[]>={contact:["name","headline","location","email","phone"],summary:["summary"],experience:["experience"],education:["education"],skills:["skills","personalSkills","skillEvidence"],languages:["languages"],letter:["letter"],portfolio:["portfolio"],preferences:["preferences"]};
function text(value:unknown,max:number){if(typeof value!=="string"||value.length>max)throw new Error("Revisá los datos: hay campos vacíos o demasiado extensos.");return value.trim();}
function month(value:string){if(value&&!/^(19|20)\d{2}(?:-(0[1-9]|1[0-2]))?$/.test(value))throw new Error("Fecha no válida.");return value;}
export function normalizeSection(section:unknown,input:unknown):Partial<Profile>{
 if(typeof section!=="string"||!profileSections.includes(section as ProfileSection)||!input||typeof input!=="object")throw new Error("Sección no válida.");
 const data=input as Record<string,unknown>,patch:Record<string,unknown>={};
 for(const key of fields[section as ProfileSection]){
  if(key==="preferences"){
   const value=data.preferences;if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Preferencias no válidas.");
   const raw=value as Record<string,unknown>,clean={...emptyPreferences};
   for(const field of Object.keys(clean) as (keyof WorkPreferences)[])clean[field]=text(raw[field],500);
   if(clean.salaryMin&&!/^\d{1,10}(?:[.]\d{1,2})?$/.test(clean.salaryMin))throw new Error("Ingresá un sueldo mínimo válido, sin separadores de miles.");
   if(!["ARS","USD","EUR"].includes(clean.currency)||!["neto","bruto"].includes(clean.salaryBasis)||!["mes","hora","año"].includes(clean.salaryPeriod))throw new Error("Revisá la moneda y el período salarial.");
   patch.preferences=clean;
  }else if(key==="skillEvidence"){
   const rows=data.skillEvidence??[];if(!Array.isArray(rows)||rows.length>40)throw new Error("Podés contextualizar hasta 40 conocimientos.");
   patch.skillEvidence=rows.map(row=>{if(!row||typeof row!=="object")throw new Error("Conocimiento no válido.");return {skill:text(row.skill,100),context:text(row.context,500)};}).filter(row=>row.skill&&Array.isArray(data.skills)&&data.skills.includes(row.skill));
  }else if(key==="portfolio"){
   if(!Array.isArray(data.portfolio)||data.portfolio.length>10)throw new Error("Podés guardar hasta 10 enlaces de tu portfolio.");
   patch.portfolio=data.portfolio.map(row=>{if(!row||typeof row!=="object")throw new Error("Enlace no válido.");const title=text(row.title,120),value=text(row.url,2000),description=text(row.description,1500);if(!title||!value)throw new Error("Completá el título y la URL del enlace.");let url:URL;try{url=new URL(value);}catch{throw new Error("Ingresá una URL completa, por ejemplo https://misitio.com.");}if(!["https:","http:"].includes(url.protocol)||url.username||url.password)throw new Error("El enlace debe usar http o https y no incluir credenciales.");return {title,url:url.href,description};});
  }else if(key==="skills"||key==="personalSkills"){
   if(!Array.isArray(data[key])||data[key].length>40)throw new Error("Podés guardar hasta 40 habilidades por grupo.");
   patch[key]=[...new Set((data[key] as unknown[]).map(v=>text(v,100)).filter(Boolean))];
  }else if(["experience","education","languages"].includes(key)){
   const list=data[key];if(!Array.isArray(list)||list.length>30)throw new Error("Podés guardar hasta 30 entradas.");
   const keys=key==="experience"?["role","company","start","end","description"]:key==="education"?["title","institution","start","end"]:["name","level"];
   patch[key]=list.map(row=>{if(!row||typeof row!=="object")throw new Error("Entrada no válida.");const clean:Record<string,string>={};for(const field of keys){clean[field]=text(row[field],field==="description"?3000:200);if(field==="start"||field==="end")month(clean[field]);}if(!clean[key==="experience"?"role":key==="education"?"title":"name"])throw new Error("Completá el título o nombre de cada entrada.");if(clean.start&&clean.end&&(clean.end.length===4?clean.end+"-12":clean.end)<(clean.start.length===4?clean.start+"-01":clean.start))throw new Error("La fecha final no puede ser anterior al inicio.");if(key==="experience"&&row.industry!==undefined)clean.industry=text(row.industry,200);if(row.ongoing!==undefined){if(typeof row.ongoing!=="boolean")throw new Error("Revisá si el puesto o estudio continúa actualmente.");if(row.ongoing&&clean.end)throw new Error("Una entrada actual no puede tener fecha final.");return {...clean,ongoing:row.ongoing};}return clean;});
  }else patch[key]=text(data[key],key==="letter"?12000:key==="summary"?4000:250);
 }
 if(patch.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(patch.email)))throw new Error("Correo electrónico no válido.");
 return patch;
}
export type FileKind="cv"|"photo"|"letter";
export function validKind(value:unknown):value is FileKind{return ["cv","photo","letter"].includes(String(value));}
export function validateFile(kind:FileKind,mime:string,bytes:Uint8Array){
 if(!bytes.length||bytes.length>3*1024*1024)throw new Error(kind==="photo"?"La foto debe pesar hasta 3 MB.":"El PDF debe pesar hasta 3 MB.");
 const pdf=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;
 const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(kind==="photo"?!(mime==="image/png"&&png||mime==="image/jpeg"&&jpeg):!(mime==="application/pdf"&&pdf))throw new Error(kind==="photo"?"Elegí una imagen JPG o PNG válida.":"Elegí un archivo PDF válido.");
}
