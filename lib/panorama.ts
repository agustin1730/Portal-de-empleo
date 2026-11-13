import type {Profile} from "./profile-data.ts";
type AreaId="marketing"|"sales"|"operations"|"administration"|"leadership";
export type Area={id:AreaId;name:string;level:number;label:string;detail:string;sources:string[]};
const rules:{id:AreaId;name:string;pattern:RegExp;role:string;next:string}[]=[
 {id:"marketing",name:"Marketing",pattern:/\b(marketing|meta ads|google ads|tiktok ads|campanas|roas|seo|sem)\b/,role:"Marketing digital junior",next:"Documentá una campaña: objetivo, tareas propias y resultados."},
 {id:"sales",name:"Ventas",pattern:/\b(ventas?|comercial|atencion al cliente|seguimiento comercial|posventa)\b/,role:"Ventas y atención al cliente",next:"Mostrá ejemplos de seguimiento comercial y resultados de ventas."},
 {id:"operations",name:"Operaciones",pattern:/\b(procesos|operaciones|sistemas|logistica|automatizacion|organizar|organizacion)\b/,role:"Asistencia de operaciones",next:"Describí un proceso que organizaste y qué mejoró con tu trabajo."},
 {id:"administration",name:"Administración",pattern:/\b(finanzas|financiero|financiera|administracion|administrativo|caja|contabilidad|facturacion|presupuestos|reservas)\b/,role:"Asistencia administrativa",next:"Precisá tus tareas administrativas y su alcance en cada negocio."},
 {id:"leadership",name:"Liderazgo de equipos",pattern:/\b(liderazgo de equipos|gestion de equipos|personas a cargo|equipo a cargo|supervision de personal|team lead|people manager)\b/,role:"Coordinación de equipos",next:"Registrá personas a cargo, responsabilidades y resultados del equipo."},
];
const fold=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function supports(text:string,pattern:RegExp){return text.split(/[\n.;]+/).some(sentence=>{const s=fold(sentence);return !/\b(no tengo|no cuento|no manejo|sin experiencia|sin conocimientos|no he|no gestione|no lider|no poseo|no domino)\b/.test(s)&&pattern.test(s);});}
export function buildPanorama(profile:Profile){
 const areas:Area[]=rules.map(rule=>{
  const experience=profile.experience.filter(e=>supports(rule.id==="leadership"?e.description:e.role+". "+e.description,rule.pattern));
  const skills=[...profile.skills,...profile.personalSkills].filter(s=>supports(s,rule.pattern));
  const education=profile.education.filter(e=>supports(e.title,rule.pattern));
  const level=experience.length?(skills.length?3:2):skills.length||education.length?1:0;
  const sources=[...experience.map(e=>`Experiencia · ${e.role}${e.company?" · "+e.company:""}`),...skills.map(s=>`Habilidad declarada · ${s}`),...education.map(e=>`Formación · ${e.title}`)];
  return {id:rule.id,name:rule.name,level,label:level>=2?"Evidencia práctica":level===1?"Conocimiento registrado":"Falta evidencia",detail:experience.length?`${experience.length} experiencia${experience.length>1?"s":""} con tareas relacionadas.`:level===1?"Hay habilidades o formación; falta documentar su aplicación laboral.":rule.id==="leadership"?"Emprender no acredita por sí solo gestión de personas.":"No hay tareas, habilidades o formación relacionadas registradas.",sources};
 });
 const practical=areas.filter(a=>a.level>=2),known=areas.filter(a=>a.level>0);
 const summary=practical.length?`Perfil con experiencia documentada en ${practical.slice(0,3).map(a=>a.name.toLowerCase()).join(", ")}.`:known.length?`Perfil con conocimientos registrados en ${known.slice(0,3).map(a=>a.name.toLowerCase()).join(", ")}.`:"Completá tu perfil para construir tu panorama profesional.";
 const strengths=practical.map(a=>({title:`Experiencia en ${a.name.toLowerCase()}`,detail:a.sources.find(s=>s.startsWith("Experiencia"))!}));
 const gaps:{title:string;detail:string}[]=[];
 if(!profile.experience.length)gaps.push({title:"Experiencia por documentar",detail:"Agregá puestos, tareas y resultados. El resumen por sí solo no acredita experiencia."});
 if(areas.find(a=>a.id==="leadership")!.level<2)gaps.push({title:"Gestión de equipos por confirmar",detail:"No hay tareas explícitas de gestión de personas en la experiencia registrada."});
 if(profile.experience.some(e=>!/^\d{4}-\d{2}$/.test(e.start)||!!e.end&&!/^\d{4}-\d{2}$/.test(e.end)||e.ongoing===false&&!e.end))gaps.push({title:"Fechas de experiencia incompletas",detail:"Completá mes y año para verificar la duración; no se inventan meses."});
 if(!profile.portfolio.length)gaps.push({title:"Ejemplos de trabajo pendientes",detail:"Sumá tu sitio o portfolio y explicá qué hiciste en cada proyecto."});
 if(!profile.skills.length)gaps.push({title:"Herramientas por registrar",detail:"Agregá habilidades concretas y dónde las aplicaste."});
 const steps:{title:string;detail:string;href:string}[]=[];
 if(!profile.experience.length||profile.experience.some(e=>!/^\d{4}-\d{2}$/.test(e.start)||!!e.end&&!/^\d{4}-\d{2}$/.test(e.end)||e.ongoing===false&&!e.end))steps.push({title:"Precisá tu experiencia y fechas",detail:"Registrá tareas propias y períodos con mes y año.",href:"/?vista=perfil"});
 if(!profile.portfolio.length)steps.push({title:"Mostrá un caso de trabajo",detail:"Agregá un sitio o proyecto y describí tu aporte y resultados.",href:"/?vista=perfil#portfolio"});
 for(const rule of rules){if(steps.length>=3)break;const area=areas.find(a=>a.id===rule.id)!;if(area.level>0)steps.push({title:`Reforzá tu evidencia en ${area.name.toLowerCase()}`,detail:rule.next,href:"/?vista=perfil"});}
 if(steps.length<3)steps.push({title:"Definí tus habilidades",detail:"Separá lo que aplicaste en el trabajo de cursos e intereses.",href:"/?vista=perfil"});
 if(steps.length<3)steps.push({title:"Revisá requisitos de puestos reales",detail:"Usá Oportunidades para comparar avisos completos con tu perfil.",href:"/?vista=oportunidades"});
 const roles=rules.map(rule=>{const area=areas.find(a=>a.id===rule.id)!;return {title:rule.role,group:area.level>=2?"backed":area.level===1?"prepare":"unknown",detail:area.level>=2?"Hay tareas relacionadas en tu experiencia; el nivel y alcance dependen del aviso.":area.level===1?rule.next:"Falta evidencia específica para orientar esta familia de puestos."};});
 return {areas,summary,strengths,gaps,steps:steps.slice(0,3),roles,hasData:known.length>0};
}
