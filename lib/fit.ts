import type {Profile} from "./profile-data";
export type Category="experience"|"skills"|"education";
export type Requirement={category:Category;text:string;required:boolean;years:number|null};
export type Assessment={description:string;complete:boolean;requirements:Requirement[]};
export type Evidence={requirement:Requirement;status:"matched"|"gap"|"unknown";profileSource:string;explanation:string};
export type Fit={score:number|null;label:string;reason:string;missing:"profile"|"requirements"|null;provisional:boolean;profileUpdatedAt:string|null;source:string;breakdown:{category:Category;label:string;weight:number;points:number|null;count:number}[];evidence:Evidence[];nextSteps:string[];version:string};
export const categoryNames:Record<Category,string>={experience:"Experiencia relevante",skills:"Habilidades",education:"Educación"};
const weights:Record<Category,number>={experience:40,skills:40,education:20};
export const fold=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9+#]+/g," ").trim();
const aliases:[RegExp,string][]=[[/\b(?:adwords|googleads|google ads)\b/g,"google ads"],[/\b(?:facebook ads|facebookads|metaads|meta ads)\b/g,"meta ads"],[/\b(?:tiktokads|tik tok ads|tiktok ads)\b/g,"tiktok ads"],[/\b(?:microsoft excel|ms excel)\b/g,"excel"],[/\b(?:customer service|atencion al cliente|servicio al cliente)\b/g,"atencion cliente"],[/\b(?:ventas|sales)\b/g,"venta"],[/\b(?:ingles|english)\b/g,"ingles"],[/\bfluido\b/g,"avanzado"]];
function canonical(s:string){let v=fold(s);for(const [pattern,replacement] of aliases)v=v.replace(pattern,replacement);return v;}
const stop=new Set("experiencia experiencia relacionada relacion relevante minimo minima minimos minimas anos ano meses mes al la el las los de del en con y o un una para por se requiere requieren requiere requeridos requerida requerido requisitos requisito conocimientos conocimiento manejo dominio capacidad comprobable previa previo puesto nivel no preferentemente debe requerimos solicita es al como mas menos laboral laborales comprobables curso excluyente obligatorio obligatoria deseable preferente completo completa finalizado finalizada graduado graduada titulo formacion estudios contar tener trabajo tareas herramientas".split(" "));
function terms(s:string){return [...new Set(canonical(s).split(" ").filter(t=>t.length>1&&!/^\d+$/.test(t)&&!stop.has(t)))];}
function proves(need:string,value:string){
 const wanted=terms(need),sentences=value.split(/[\n.;]+/);
 return wanted.length>0&&sentences.some(sentence=>{
  const text=canonical(sentence);if(/\b(?:sin experiencia|no tengo|no cuento|no manejo|no domino|no poseo|no utilizo|no he trabajado|sin conocimientos)\b/.test(text))return false;
  const words=new Set(text.split(" "));return wanted.every(t=>words.has(t));
 });
}
export function requirementKey(r:Requirement){return [r.category,...terms(r.text).sort(),r.years??""].join("|");}
export function normalizeAssessment(input:unknown):Assessment{
 if(!input||typeof input!=="object")throw new Error("Aviso y requisitos no válidos.");
 const raw=input as Record<string,unknown>;
 if(typeof raw.description!=="string"||raw.description.length>24000||typeof raw.complete!=="boolean"||!Array.isArray(raw.requirements)||raw.requirements.length>30)throw new Error("El aviso admite hasta 24.000 caracteres y 30 requisitos.");
 if(raw.complete&&!raw.description.trim())throw new Error("Pegá el texto del aviso antes de marcarlo como completo.");
 const requirements:Requirement[]=[];
 for(const row of raw.requirements){if(!row||typeof row!=="object")throw new Error("Requisito no válido.");
  const r=row as Record<string,unknown>;if(!["experience","skills","education"].includes(String(r.category))||typeof r.text!=="string"||!r.text.trim()||r.text.length>300||typeof r.required!=="boolean"||!(r.years===null||typeof r.years==="number"&&Number.isFinite(r.years)&&r.years>=0&&r.years<=50))throw new Error("Completá el texto, categoría y años de cada requisito.");
  const value={category:r.category as Category,text:r.text.trim(),required:r.required,years:r.category==="experience"?r.years as number|null:null};
  const existing=requirements.find(existing=>requirementKey(existing)===requirementKey(value));
  if(existing)existing.required=existing.required||value.required;else requirements.push(value);
 }
 return {description:raw.description.trim(),complete:raw.complete,requirements};
}
const skillCatalog=["Google Ads","Meta Ads","TikTok Ads","Excel","Atención al cliente","Ventas","CRM","SQL","Python","JavaScript","React","Power BI","Google Analytics","GA4","SEO","SEM","Gestión de equipos","Manejo de caja","Licencia de conducir"];
export function detectRequirements(text:string):Requirement[]{
 const rows:Requirement[]=[];
 for(const line of text.split(/[\n.;]+/).map(s=>s.trim()).filter(Boolean)){
  const normalized=canonical(line);
  if(/no (?:se )?(?:requiere|requieren|necesita)|sin experiencia/.test(normalized))continue;
  const required=/excluyente|obligatori|imprescindible|indispensable/.test(normalized)&&!/no excluyente/.test(normalized);
  const experience=line.match(/(\d+(?:[.,]\d+)?)\s*(?:años?|anos?)/i);
  if(experience&&/experiencia/.test(normalized)){
   const cleaned=line.replace(/(?:m[ií]nim[oa]s?\s*)?\d+(?:[.,]\d+)?\s*(?:años?|anos?)\s*(?:de\s*)?/i,"").replace(/\s+de\s*$/i,"").slice(0,300);
   rows.push({category:"experience",text:cleaned,required,years:Number(experience[1].replace(",","."))});
  }else if(/experiencia/.test(normalized))rows.push({category:"experience",text:line.slice(0,300),required,years:null});
  if(/secundario|bachiller|universitari|terciari|licenciatura|ingenieria|tecnicatura/.test(normalized))rows.push({category:"education",text:line.slice(0,300),required,years:null});
  for(const skill of skillCatalog)if(!(/experiencia/.test(normalized)&&["Ventas","Atención al cliente","Gestión de equipos"].includes(skill))&&proves(skill,line))rows.push({category:"skills",text:skill,required,years:null});
  const language=line.match(/(?:ingl[eé]s|english)(?:\s+(b[aá]sico|intermedio|avanzado|fluido|nativo))?/i);if(language)rows.push({category:"skills",text:"Inglés"+(language[1]?" "+language[1]:""),required,years:null});
 }
 return rows.filter((r,i)=>rows.findIndex(v=>v.category===r.category&&canonical(v.text)===canonical(r.text)&&v.years===r.years)===i).slice(0,30);
}
function experienceMonths(entries:Profile["experience"],now:Date){
 const intervals:[number,number][]=[];const current=now.getUTCFullYear()*12+now.getUTCMonth();
 for(const entry of entries){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(entry.start)||entry.end&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(entry.end))continue;
  const number=(s:string)=>Number(s.slice(0,4))*12+Number(s.slice(5))-1;
  const start=number(entry.start),end=Math.min(entry.end?number(entry.end)+1:current,current);if(start<=current&&end>start)intervals.push([start,end]);
 }
 intervals.sort((a,b)=>a[0]-b[0]);let total=0,end=-Infinity;for(const [start,finish] of intervals){total+=Math.max(0,finish-Math.max(start,end));end=Math.max(end,finish);}return total;
}
function evaluateRequirement(r:Requirement,profile:Profile,now:Date):Evidence{
 const result=(status:Evidence["status"],profileSource:string,explanation:string):Evidence=>({requirement:r,status,profileSource,explanation});
 if(r.category==="experience"){
  const entries=profile.experience.filter(e=>proves(r.text,e.role+". "+e.description));
  if(!entries.length)return result("unknown","Mi perfil · Experiencia","No hay experiencia documentada que coincida con este requisito.");
  const source=entries.map(e=>`${e.role}${e.company?" · "+e.company:""}`).join("; ");
  if(r.years===null||r.years===0)return result("matched",source,"Coincide con las tareas o puestos registrados en tu perfil.");
  if(entries.some(e=>!/^\d{4}-(0[1-9]|1[0-2])$/.test(e.start)||e.ongoing===false&&!e.end||!!e.end&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(e.end)))return result("unknown",source,"Faltan fechas completas (año y mes) para verificar la duración de tu experiencia relacionada.");
  const months=experienceMonths(entries,now),needed=Math.ceil(r.years*12);
  return result(months>=needed?"matched":"gap",source,`${months} meses documentados de ${needed} solicitados. Los períodos simultáneos cuentan una sola vez.`);
 }
 if(r.category==="education"){
  const item=profile.education.find(e=>proves(r.text,e.title));
  if(!item)return result("unknown","Mi perfil · Educación","No se acredita esta formación en tu perfil.");
  const complete=/complet|finaliz|graduad/.test(fold(r.text));
  if(complete&&(!item.end||item.ongoing===true||item.end.length===4&&item.end>=String(now.getUTCFullYear())||item.end>now.toISOString().slice(0,7)))return result("unknown",item.title,"La formación figura, pero no hay una finalización confirmada.");
  return result("matched",`${item.title}${item.institution?" · "+item.institution:""}`,"La formación coincide con el requisito registrado.");
 }
 if(/\bingles\b/.test(canonical(r.text))){
  const lang=profile.languages.find(l=>/\bingles\b/.test(canonical(l.name)));const levels=["basico","intermedio","avanzado","nativo"];
  const wanted=levels.findIndex(level=>canonical(r.text).includes(level));
  if(lang){const cefr=canonical(r.text).match(/\b(a1|a2|b1|b2|c1|c2)\b/);if(cefr){const levelsCefr=["a1","a2","b1","b2","c1","c2"],actual=levelsCefr.indexOf(canonical(lang.level));if(actual<0)return result("unknown",`Idiomas · ${lang.name}: ${lang.level}`,"El nivel genérico del perfil no acredita el nivel CEFR solicitado.");return result(actual>=levelsCefr.indexOf(cefr[1])?"matched":"gap",`Idiomas · ${lang.name}: ${lang.level}`,"Comparación de niveles CEFR documentados.");}if(wanted<0&&terms(r.text).some(term=>term!=="ingles"))return result("unknown",`Idiomas · ${lang.name}: ${lang.level}`,"Falta acreditar la competencia específica del idioma solicitada.");const level=levels.indexOf(canonical(lang.level));if(wanted<0||level>=wanted)return result("matched",`Idiomas · ${lang.name}: ${lang.level}`,"El idioma registrado cubre el nivel solicitado.");return result(level<0?"unknown":"gap",`Idiomas · ${lang.name}: ${lang.level||"sin nivel"}`,"El nivel registrado no acredita el nivel solicitado.");}
 }
 const explicit=[...profile.skills,...profile.personalSkills].find(skill=>proves(r.text,skill));
 if(explicit)return result("matched",`Habilidades · ${explicit}`,"Habilidad registrada explícitamente en tu perfil.");
 const experience=profile.experience.find(e=>proves(r.text,e.role+". "+e.description));
 if(experience)return result("matched",`Experiencia · ${experience.role}`,"La habilidad aparece en las tareas que registraste.");
 return result("unknown","Mi perfil · Habilidades y experiencia","No documentada. Esto no significa que no tengas esta habilidad.");
}
type FitJob={assessment?:Assessment|null;description?:string;key_requirement?:string;summary?:string};
export function jobSourceText(job:FitJob){
 if(job.assessment)return job.assessment.description;
 const parts=[job.description,job.key_requirement,job.summary].filter((s):s is string=>typeof s==="string"&&!!s.trim()&&!/^(?:Importado desde una alerta de empleo\.|Descripción pendiente de revisión\.)/i.test(s.trim())).map(s=>s.trim());
 return [...new Set(parts)].join("\n");
}
export function assessFit(job:FitJob,profile:Profile|null,profileUpdatedAt:string|null=null,now=new Date()):Fit{
 const explicit=job.assessment;
 const source=explicit?.complete?"Aviso completo y requisitos revisados":"Texto parcial del aviso";
 const text=jobSourceText(job),requirements=explicit?explicit.requirements:detectRequirements(text);
 const result:Fit={score:null,label:"Sin evaluar",reason:"",missing:null,provisional:!explicit?.complete,profileUpdatedAt,source,breakdown:[],evidence:[],nextSteps:[],version:"rules-v1"};
 if(!profile||!(profile.experience.length||profile.skills.length||profile.personalSkills.length||profile.education.length||profile.languages.length)){result.missing="profile";result.label="Falta perfil";result.reason="Completá tu experiencia, habilidades o educación en Mi perfil. Si importás tu CV, revisá y guardá el borrador para usar esos datos.";result.nextSteps=["Completar Mi perfil."];return result;}
 if(requirements.length<2){result.missing="requirements";result.label=text?"Faltan requisitos":"Falta aviso";result.reason=text?`Se detectaron ${requirements.length} de al menos 2 requisitos necesarios. Revisá y completá los requisitos del aviso.`:"Tu perfil está disponible, pero este empleo solo tiene datos básicos de la alerta. Agregá la descripción y los requisitos publicados para calcular la afinidad.";result.nextSteps=["Abrir el aviso original y copiar su descripción.","Pegar el texto, detectar y revisar al menos dos requisitos; guardar para calcular la afinidad."];return result;}
 const evidence=requirements.map(r=>evaluateRequirement(r,profile,now));result.evidence=evidence;
 const categories=(Object.keys(weights) as Category[]).filter(category=>requirements.some(r=>r.category===category));
 const sum=categories.reduce((total,c)=>total+weights[c],0);
 result.breakdown=(Object.keys(weights) as Category[]).map(category=>{const rows=evidence.filter(e=>e.requirement.category===category);const weight=rows.length?weights[category]/sum*100:0;return {category,label:categoryNames[category],weight,points:rows.length?weight*rows.filter(r=>r.status==="matched").length/rows.length:null,count:rows.length};});
 result.score=evidence.every(e=>e.status==="unknown")?null:Math.round(result.breakdown.reduce((total,b)=>total+(b.points||0),0));
 const mandatory=evidence.filter(e=>e.requirement.required&&e.status!=="matched");
 const unknown=evidence.filter(e=>e.status==="unknown");
 result.label=mandatory.length?"Requisito obligatorio por confirmar":unknown.length===evidence.length?"Faltan datos":(result.score??0)>=75?"Buen encaje":(result.score??0)>=50?"Encaje parcial":"Requiere preparación";
 result.reason=`${evidence.filter(e=>e.status==="matched").length} de ${evidence.length} requisitos respaldados por tu perfil.`;
 result.nextSteps=mandatory.slice(0,3).map(e=>"Verificar requisito obligatorio: "+e.requirement.text);
 if(!explicit?.complete)result.nextSteps.push("Revisar el aviso completo; la comparación es provisional.");
 if(unknown.length)result.nextSteps.push("Completar evidencia en Mi perfil para los requisitos no documentados.");
 if(!result.nextSteps.length)result.nextSteps.push("Revisar el aviso original y preparar una postulación que destaque las coincidencias.");
 return result;
}
