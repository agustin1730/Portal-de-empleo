import type {WorkPreferences} from "./profile-data";
import {preferenceTags} from "./preference-options.ts";
export type ConditionStatus="matched"|"different"|"unknown";
export type WorkCondition={key:"salary"|"modality"|"location"|"hours";label:string;offer:string;preference:string;status:ConditionStatus};
type ConditionJob={salary_label?:string;mode?:string;location_label?:string;hours?:string;description?:string;assessment?:{description:string}|null};
const fold=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const missing=(value:string)=>!value.trim()||/confirmar|no informad|no especificad|a convenir|negociable|competitiv|segun|pendiente/.test(fold(value));
function modes(value:string){const text=fold(value);if(missing(value)||/\bno\b|\bsin\b/.test(text))return [];if(/hibrid/.test(text))return /\bo\b|[/|]/.test(text)&&/remot/.test(text)?["Híbrido","Remoto"]:["Híbrido"];const result:string[]=[];if(/remot|home office|teletrabajo/.test(text))result.push("Remoto");if(/presencial|on.?site/.test(text))result.push("Presencial");return result;}
function hours(value:string){const text=fold(value);if(missing(value)||/\bno\b|\bsin\b/.test(text))return [];return [...(/tiempo completo|jornada completa|full[ -]?time/.test(text)?["Tiempo completo"]:[]),...(/tiempo parcial|media jornada|part[ -]?time|jornada parcial/.test(text)?["Tiempo parcial"]:[]),...(/por horas/.test(text)?["Por horas"]:[]),...(/freelance/.test(text)?["Freelance"]:[])];}
function explicitLine(job:ConditionJob,pattern:RegExp){return (job.assessment?.description||job.description||"").split(/[\n.;]+/).find(line=>pattern.test(fold(line)))?.trim()||"";}
function optionsStatus(offered:string[],wanted:string[]):ConditionStatus{return !offered.length||!wanted.length?"unknown":offered.some(value=>wanted.includes(value))?"matched":"different";}
function location(value:string){return fold(value).replace(/ciudad autonoma de buenos aires|capital federal/g,"caba").replace(/\bargentina\b|\bhibrido\b|\bpresencial\b|\bremoto\b/g,"").replace(/[^a-z0-9]+/g," ").trim();}
const cities=new Set(["caba","cordoba","rosario","mendoza","la plata","mar del plata","salta","neuquen","santa fe","san miguel de tucuman"]);
function locationStatus(offer:string,wanted:string):ConditionStatus{
 if(missing(offer)||missing(wanted))return "unknown";const offers=preferenceTags(offer).map(location).filter(Boolean),preferences=preferenceTags(wanted).map(location).filter(Boolean);
 if(offers.some(item=>preferences.includes(item)))return "matched";
 return offers.length&&preferences.length&&offers.every(item=>cities.has(item))&&preferences.every(item=>cities.has(item))?"different":"unknown";
}
function amount(value:string){let text=value.replace(/\s/g,"");if(/^\d{1,3}(?:[.,]\d{3})+$/.test(text))text=text.replace(/[.,]/g,"");else if(text.includes(",")&&text.includes(".")){const last=Math.max(text.lastIndexOf(","),text.lastIndexOf("."));text=text.slice(0,last).replace(/[.,]/g,"")+"."+text.slice(last+1);}else text=text.replace(",",".");const result=Number(text);return Number.isFinite(result)&&result>0?result:null;}
function salaryStatus(offer:string,p:WorkPreferences):ConditionStatus{
 if(missing(offer)||!p.salaryMin)return "unknown";const text=fold(offer);
 const currencies=[...(/\b(?:ars|pesos argentinos)\b/.test(text)?["ARS"]:[]),...(/\b(?:usd|dolares)\b|u\$s|us\$/.test(text)?["USD"]:[]),...(/\beur\b|€/.test(text)?["EUR"]:[])];
 const periods=[...(/mensual|mensuales|por mes|\/\s*mes\b/.test(text)?["mes"]:[]),...(/por hora|\/\s*hora\b/.test(text)?["hora"]:[]),...(/anual|anuales|por ano|\/\s*ano\b/.test(text)?["año"]:[])];
 if(currencies.length!==1||periods.length!==1||currencies[0]!==p.currency||periods[0]!==p.salaryPeriod||/comision|variable|bono|premio|[0-9]\s*[km]\b/.test(text))return "unknown";
 const numbers=(text.match(/\d+(?:[.,]\d+)*/g)||[]).map(amount);if(!numbers.length||numbers.length>2||numbers.some(value=>value===null))return "unknown";
 const values=numbers as number[],minimum=Number(p.salaryMin);if(!Number.isFinite(minimum)||minimum<0)return "unknown";
 if(values.length===2){if(!/entre|hasta|\s[-–—]\s|\d\s*[-–—]\s*\d|\d\s+a\s+\d/.test(text))return "unknown";if(values[0]>values[1])return "unknown";return values[0]>=minimum?"matched":values[1]<minimum?"different":"unknown";}
 if(/desde|a partir/.test(text))return values[0]>=minimum?"matched":"unknown";
 if(/hasta/.test(text))return values[0]<minimum?"different":"unknown";
 return values[0]>=minimum?"matched":"different";
}
export function compareWorkConditions(job:ConditionJob,p:WorkPreferences|null):WorkCondition[]{
 const salary=job.salary_label||"",mode=missing(job.mode||"")?explicitLine(job,/\bmodalidad\b|\btrabajo (?:remoto|presencial|hibrido)\b/):job.mode||"",schedule=missing(job.hours||"")?explicitLine(job,/jornada (?:completa|parcial)|tiempo (?:completo|parcial)|full[ -]?time|part[ -]?time/):job.hours||"";
 const wanted=p;
 return [
 {key:"salary",label:"Sueldo",offer:missing(salary)?"No informado":salary,preference:wanted?.salaryMin?"Desde "+Number(wanted.salaryMin).toLocaleString("es-AR")+" "+wanted.currency+" / "+wanted.salaryPeriod:"Por definir",status:wanted?salaryStatus(salary,wanted):"unknown"},
 {key:"modality",label:"Modalidad",offer:modes(mode).join(" · ")||"No informada",preference:wanted?.modality||"Por definir",status:wanted?optionsStatus(modes(mode),preferenceTags(wanted.modality).flatMap(modes)):"unknown"},
 {key:"location",label:"Ubicación",offer:missing(job.location_label||"")?"No informada":job.location_label||"",preference:wanted?.location||"Por definir",status:wanted?locationStatus(job.location_label||"",wanted.location):"unknown"},
 {key:"hours",label:"Jornada",offer:hours(schedule).join(" · ")||"No informada",preference:wanted?.hours||"Por definir",status:wanted?optionsStatus(hours(schedule),preferenceTags(wanted.hours).flatMap(hours)):"unknown"}
 ];
}
