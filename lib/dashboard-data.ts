export type DashboardTask={id:string;title:string;date:string;time:string;jobId:string;done:boolean};
export type ReviewRun={status:"running"|"complete"|"partial"|"failed";started_at:string;finished_at:string|null;checked:number;completed:number;message:string};
export type DashboardJob={id:string;title:string;company:string;portal?:string;status:string;applied_at?:string;created_at?:string;location_label?:string;url?:string;enrichment?:{status?:string;reason?:string;checked_at?:string};assessment?:{complete:boolean;description:string;requirements:unknown[]}|null};
export function argentinaDate(now=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);}
export function validDay(value:unknown):value is string{if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+"T12:00:00Z");return Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===value;}
function shift(day:string,days:number){const date=new Date(day+"T12:00:00Z");date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}
export function weekStart(day:string){const date=new Date(day+"T12:00:00Z");return shift(day,-((date.getUTCDay()+6)%7));}
export function normalizeTask(input:unknown):DashboardTask{
 if(!input||typeof input!=="object")throw new Error("Tarea no válida.");const row=input as Record<string,unknown>;
 if(typeof row.id!=="string"||!/^[a-zA-Z0-9_-]{1,80}$/.test(row.id)||typeof row.title!=="string"||!row.title.trim()||row.title.length>200||!validDay(row.date)||typeof row.time!=="string"||row.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time)||typeof row.jobId!=="string"||row.jobId&&!/^[a-zA-Z0-9_-]{1,80}$/.test(row.jobId)||typeof row.done!=="boolean")throw new Error("Revisá el título, la fecha y la hora de la tarea.");
 return {id:row.id,title:row.title.trim(),date:row.date,time:row.time,jobId:row.jobId,done:row.done};
}
export function normalizeReview(input:unknown):ReviewRun{
 if(!input||typeof input!=="object")throw new Error("Revisión no válida.");const row=input as Record<string,unknown>;
 const validTime=(v:unknown)=>typeof v==="string"&&v.length<=40&&Number.isFinite(Date.parse(v));
 if(!["running","complete","partial","failed"].includes(String(row.status))||!validTime(row.started_at)||row.status!=="running"&&!validTime(row.finished_at)||!Number.isInteger(row.checked)||Number(row.checked)<0||Number(row.checked)>10000||!Number.isInteger(row.completed)||Number(row.completed)<0||Number(row.completed)>Number(row.checked)||typeof row.message!=="string"||row.message.length>500)throw new Error("Estado o cantidades de revisión no válidos.");
 if(row.status!=="running"&&Date.parse(String(row.finished_at))<Date.parse(String(row.started_at)))throw new Error("Fechas de revisión no válidas.");
 return {status:row.status as ReviewRun["status"],started_at:String(row.started_at),finished_at:row.status==="running"?null:String(row.finished_at),checked:Number(row.checked),completed:Number(row.completed),message:row.message.trim()};
}
export function pendingReason(job:DashboardJob){const status=job.enrichment?.status;if(status==="expired")return "Aviso vencido";if(status==="blocked")return "Acceso bloqueado";if(status==="failed")return "Error al leer el aviso";return job.assessment?.complete?"Requisitos incompletos":"Información insuficiente";}
export function jobComplete(job:DashboardJob){return !["partial","blocked","expired","failed"].includes(job.enrichment?.status||"")&&!!job.assessment?.complete&&!!job.assessment.description.trim()&&job.assessment.requirements.length>=2;}
export function buildDashboard(jobs:DashboardJob[],tasks:DashboardTask[],review:ReviewRun|null,now=new Date()){
 const today=argentinaDate(now),start=weekStart(today),active=jobs.filter(job=>job.status!=="descartado"),byId=new Map(jobs.map(job=>[job.id,job]));
 const current=jobs.filter(job=>validDay(job.applied_at)&&job.applied_at>=start&&job.applied_at<=today);
 const metrics={applications:current.length,contacts:current.filter(job=>["contactado","entrevista","oferta"].includes(job.status)).length,interviews:current.filter(job=>["entrevista","oferta"].includes(job.status)).length,offers:current.filter(job=>job.status==="oferta").length};
 const weeks=Array.from({length:4},(_,i)=>{const from=shift(start,(i-3)*7),to=shift(from,6);return {start:from,end:to,label:i===3?"Esta sem.":new Date(from+"T12:00:00Z").toLocaleDateString("es-AR",{day:"numeric",month:"short",timeZone:"America/Argentina/Buenos_Aires"}),count:jobs.filter(job=>validDay(job.applied_at)&&job.applied_at>=from&&job.applied_at<=to&&job.applied_at<=today).length};});
 const relevantTasks=tasks.filter(task=>!task.jobId||byId.has(task.jobId)&&byId.get(task.jobId)?.status!=="descartado");
 const due=relevantTasks.filter(task=>!task.done&&task.date<=today).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const recent=active.filter(job=>{const date=job.created_at&&new Date(job.created_at);return date&&Number.isFinite(date.valueOf())&&date<=now&&argentinaDate(date)>=shift(today,-6);}).sort((a,b)=>(b.created_at||"").localeCompare(a.created_at||""));
 const pending=active.filter(job=>!jobComplete(job)).map(job=>({id:job.id,title:job.title,portal:job.portal||"Otro",reason:pendingReason(job)}));
 return {today,weekStart:start,metrics,weeks,due,tasks:relevantTasks,choices:active.map(({id,title,company})=>({id,title,company})),recent:recent.slice(0,3).map(({id,title,company,portal,location_label})=>({id,title,company,portal,location_label})),recentCount:recent.length,review,completeCount:active.length-pending.length,pending};
}
export type DashboardData=ReturnType<typeof buildDashboard>;
