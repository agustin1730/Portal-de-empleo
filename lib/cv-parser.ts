import {emptyProfile,normalizeSection,type Profile,type ProfileSection,type Experience,type Education} from "./profile-data.ts";
export const cvImportSections=["contact","summary","experience","education","skills","languages"] as const;
export type CvSection=typeof cvImportSections[number];
export type CvDraft={profile:Profile;sections:CvSection[];warnings:string[];text:string;unmapped:string[];version:string};
const fold=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const clean=(s:string)=>s.replace(/^[\s•●▪◦*–—-]+/,"").trim();
const unique=(items:string[])=>[...new Set(items.map(s=>s.trim()).filter(Boolean))];
const headings:Record<string,string>={
 "perfil profesional":"summary","perfil":"summary","resumen profesional":"summary","resumen":"summary","sobre mi":"summary","professional profile":"summary","professional summary":"summary","summary":"summary","about me":"summary",
 "experiencia profesional":"experience","experiencia laboral":"experience","mis experiencias profesionales":"experience","experiencia":"experience","work experience":"experience","professional experience":"experience","employment history":"experience",
 "educacion y formacion":"education","educacion":"education","formacion academica":"education","estudios":"education","formacion":"education","education":"education","education and training":"education","cursos y certificaciones":"education","certificaciones":"education",
 "herramientas e idiomas":"combined","herramientas y habilidades":"skills","herramientas":"skills","conocimientos y habilidades":"skills","habilidades":"skills","conocimientos tecnicos":"skills","habilidades tecnicas":"skills","skills":"skills","technical skills":"skills","tools":"skills",
 "habilidades personales":"personal","habilidades blandas":"personal","habilidades interpersonales":"personal","soft skills":"personal",
 "idiomas":"languages","languages":"languages","resultados destacados":"extra","logros":"extra","achievements":"extra","proyectos seleccionados":"extra","proyectos":"extra","projects":"extra","referencias":"extra","references":"extra",
};
const monthNames:Record<string,string>={ene:"01",enero:"01",jan:"01",january:"01",feb:"02",febrero:"02",february:"02",mar:"03",marzo:"03",march:"03",abr:"04",abril:"04",apr:"04",april:"04",may:"05",mayo:"05",jun:"06",junio:"06",june:"06",jul:"07",julio:"07",july:"07",ago:"08",agosto:"08",aug:"08",august:"08",sep:"09",sept:"09",septiembre:"09",september:"09",oct:"10",octubre:"10",october:"10",nov:"11",noviembre:"11",november:"11",dic:"12",diciembre:"12",dec:"12",december:"12"};
const dateToken="(?:(?:enero|january|febrero|february|marzo|march|abril|april|mayo|junio|june|julio|july|agosto|august|septiembre|september|octubre|october|noviembre|november|diciembre|december|ene|jan|feb|mar|abr|apr|may|jun|jul|ago|aug|sept|sep|oct|nov|dic|dec)\\.?\\s+(?:de\\s+)?(?:19|20)\\d{2}|(?:19|20)\\d{2}[-/](?:0?[1-9]|1[0-2])|(?:0?[1-9]|1[0-2])[-/](?:19|20)\\d{2}|(?:19|20)\\d{2})";
const rangePattern=new RegExp(`(${dateToken})\\s*(?:[-–—]|\\bto\\b|\\bhasta\\b|\\ba\\b)\\s*(${dateToken}|actualidad|actual|presente|present|current|hoy)`,'i');
function parseDate(value:string){const normalized=fold(value).replace(/\./g,"").trim();const year=normalized.match(/\b((?:19|20)\d{2})\b/)?.[1]||"";if(!year)return "";const named=normalized.match(/^([a-z]+)\s+(?:de\s+)?\d{4}$/);if(named&&monthNames[named[1]])return year+"-"+monthNames[named[1]];const numeric=normalized.match(/^(?:(\d{4})[-/](\d{1,2})|(\d{1,2})[-/](\d{4}))$/);if(numeric)return year+"-"+String(numeric[2]||numeric[3]).padStart(2,"0");return year;}
function dateRange(line:string){const match=line.match(rangePattern);if(!match)return null;const start=parseDate(match[1]);const ongoing=/^(actualidad|actual|presente|present|current|hoy)$/i.test(match[2]);const end=ongoing?"":parseDate(match[2]);if(!start||!ongoing&&!end)return null;return {start,end,ongoing,before:clean(line.slice(0,match.index)),after:clean(line.slice((match.index||0)+match[0].length))};}
const rolePattern=/fundador|founder|responsable|asistente|assistant|asesor|vendedor|sales|analista|analyst|manager|coordinador|director|desarrollador|developer|ingeniero|engineer|especialista|specialist|administrativo|designer|disenador|creacion de|consultor|consultant|tecnico/;
const educationPattern=/secundari|bachiller|licenciatur|licenciad|ingenier|tecnicatur|curso|diplom|certific|fundamentos|master|doctor|bachelor|degree|high school/;
function experiences(lines:string[],warnings:string[]):Experience[]{
 const anchors=lines.map((line,index)=>({line,index,range:dateRange(line)})).filter(row=>row.range&&!/^[•●▪◦*]/.test(row.line));
 const headers=anchors.map(({index,range})=>{
  let role=range!.before,company="",header=index;
  if(role){const split=role.split(/\s+[|•·]\s+/);if(split.length>1){role=split[0];company=split.slice(1).join(" · ");}else if(index>0&&!/^[•●▪◦*]/.test(lines[index-1])&&lines[index-1].length<180){company=clean(lines[index-1]);header=index-1;}}
  else if(index>0){role=clean(lines[index-1]);header=index-1;if(index>1&&!/^[•●▪◦*]/.test(lines[index-2])&&lines[index-2].length<180){company=clean(lines[index-2]);header=index-2;}if(!rolePattern.test(fold(role))&&rolePattern.test(fold(company)))[role,company]=[company,role];}
  if(!company&&range!.after)company=range!.after;
  return {index,header,role:role.slice(0,200),company:company.slice(0,200),range:range!};
 }).filter(row=>row.role);
 if(lines.length&&!headers.length)warnings.push("No se pudieron separar con seguridad los puestos de la experiencia. Revisá esa sección en el texto del PDF y completala manualmente.");
 return headers.slice(0,30).map((row,i)=>{const end=headers[i+1]?.header??lines.length;let description=lines.slice(row.index+1,end).map(clean).join("\n");if(description.length>3000){description=description.slice(0,3000);warnings.push("Una descripción laboral supera el límite; revisá el texto completo del CV.");}if(row.range.start.length===4||row.range.end.length===4)warnings.push("Se conservaron fechas con año solamente. No se inventó el mes; la afinidad no acreditará duración exacta hasta que lo completes.");return {role:row.role,company:row.company,start:row.range.start,end:row.range.end,ongoing:row.range.ongoing,description};});
}
function education(lines:string[],warnings:string[]):Education[]{
 const result:Education[]=[];const used=new Set<number>();
 for(let i=0;i<lines.length;i++){
  if(used.has(i))continue;const line=clean(lines[i]),range=dateRange(line),year=line.match(/\b(?:19|20)\d{2}\b/);
  if(!range&&!year)continue;
  const before=range?range.before:line.slice(0,year!.index).replace(/[\s–—|·,-]+$/,"");
  if(!before)continue;let title="",institution="";
  if(educationPattern.test(fold(before))){title=before;if(i>0&&!used.has(i-1)&&!lines[i-1].match(/\d{4}/)){institution=clean(lines[i-1]);used.add(i-1);}}
  else {institution=before;if(i+1<lines.length&&!dateRange(lines[i+1])&&!/\b(?:19|20)\d{2}\b/.test(lines[i+1])){title=clean(lines[i+1]);used.add(i+1);}}
  if(!title)continue;used.add(i);
  const titles=title.split(/\s+[·•|]\s+/).filter(Boolean);
  for(const value of titles)result.push({title:value.slice(0,200),institution:institution.slice(0,200),start:range?.start||"",end:range?.end||(year?.[0]||""),ongoing:range?.ongoing||false});
 }
 for(let i=0;i<lines.length;i++)if(!used.has(i)&&educationPattern.test(fold(lines[i]))&&!/^\s*[•●▪]/.test(lines[i])){result.push({title:clean(lines[i]).slice(0,200),institution:"",start:"",end:"",ongoing:false});warnings.push("Hay formación sin fechas o institución claras. Revisá esos datos después de importar.");}
 if(result.some(row=>row.start.length===4||row.end.length===4))warnings.push("Los años de educación se conservaron sin agregar meses que no aparecen en el CV.");
 return result.slice(0,30);
}
const languageNames=["Español","Inglés","Portugués","Francés","Italiano","Alemán","Chino","Japonés","Árabe","Ruso","English","Spanish","Portuguese","French","German","Italian"];
function languages(text:string){const aliases:Record<string,string>={english:"Inglés",spanish:"Español",portuguese:"Portugués",french:"Francés",german:"Alemán",italian:"Italiano"};const tokens=text.split(/[\n•·|;,]+/);const result:Profile["languages"]=[];
 for(const token of tokens){for(const name of languageNames){const match=fold(token).match(new RegExp(`\\b${fold(name)}\\b`));if(!match)continue;const level=fold(token.slice(match.index)).match(/\b(nativo|native|basico|basic|intermedio|intermediate|avanzado|advanced|a1|a2|b1|b2|c1|c2)\b/)?.[1];if(!level)continue;const levels:Record<string,string>={nativo:"Nativo",native:"Nativo",basico:"Básico",basic:"Básico",intermedio:"Intermedio",intermediate:"Intermedio",avanzado:"Avanzado",advanced:"Avanzado"};const normalized=aliases[fold(name)]||name;if(!result.some(l=>l.name===normalized))result.push({name:normalized,level:levels[level]||level.toUpperCase()});}}
 return result;
}
export function parseCvText(input:string):CvDraft{
 const text=input.replace(/\r\n?/g,"\n").replace(/\u00ad/g,"").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"").trim();
 if(text.length>80000)throw new Error("El texto del CV supera el límite de esta versión. Usá un PDF de hasta 10 páginas.");
 if((text.match(/[\p{L}]/gu)||[]).length<60)throw new Error("No encontré texto suficiente. Esta versión lee PDFs con texto seleccionable; no procesa fotos ni documentos escaneados.");
 const profile:Profile=structuredClone(emptyProfile),warnings:string[]=[],unmapped:string[]=[];
 const blocks:Record<string,string[]>={header:[],summary:[],experience:[],education:[],skills:[],personal:[],languages:[],combined:[],extra:[]};let current="header";
 for(const raw of text.split("\n").map(s=>s.trim()).filter(Boolean)){
  const normalized=fold(raw).replace(/[:\s]+$/,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();const heading=headings[normalized];
  if(heading){current=heading;continue;}
  const colon=raw.indexOf(":");if(colon>0&&colon<45){const key=headings[fold(raw.slice(0,colon)).trim()];if(key){current=key;if(raw.slice(colon+1).trim())blocks[key].push(raw.slice(colon+1).trim());continue;}}
  blocks[current].push(raw);
 }
 const header=blocks.header.slice(0,12);const contact=header.join("\n");
 const email=contact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]||"";
 profile.email=email;
 const phone=contact.match(/(?:\+\d{1,3}[\s.-]*)?(?:\(?\d{2,4}\)?[\s.-]*)?\d[\d\s().-]{6,}\d/g)?.find(value=>value.replace(/\D/g,"").length>=9&&value.replace(/\D/g,"").length<=15)||"";
 profile.phone=phone.trim();
 const name=header.slice(0,5).find(line=>!/@|\d|[|•·]/.test(line)&&line.length<90&&line.split(/\s+/).length>=2&&line.split(/\s+/).length<=6&&!/curriculum|curr[ií]culo|resume|profesional|developer|fundador|marketing|contacto|sales|ventas/i.test(line));
 if(name){profile.name=name===name.toUpperCase()?name.toLocaleLowerCase("es").replace(/(^|\s)\p{L}/gu,c=>c.toLocaleUpperCase("es")):name;}
 const contactLine=header.find(line=>email&&line.includes(email)||phone&&line.includes(phone));
 if(contactLine){const first=contactLine.split(/[•·|]/)[0].trim();if(first!==profile.name&&first!==name&&!first.includes("@")&&!/\d/.test(first)&&first.length<200)profile.location=first;}
 const explicitLocation=contact.match(/(?:ubicaci[oó]n|location|domicilio)\s*:\s*([^\n•|]+)/i)?.[1];if(explicitLocation)profile.location=explicitLocation.trim().slice(0,250);
 profile.headline=header.find(line=>line!==name&&line!==contactLine&&!line.includes("@")&&!/\+?\d[\d\s()-]{7,}/.test(line)&&line.length<200&&!/curriculum vitae|curr[ií]culo|resume|^cv$/i.test(line))||"";
 profile.summary=blocks.summary.join(" ").slice(0,4000);
 profile.experience=experiences(blocks.experience,warnings);
 profile.education=education(blocks.education,warnings);
 const combined=[...blocks.combined,...blocks.languages].join("\n");profile.languages=languages(combined);
 const langLine=(line:string)=>languages(line).length>0;
 const splitSkills=(lines:string[])=>unique(lines.filter(line=>!langLine(line)).flatMap(line=>line.split(/[•·|;,\n]+/)).map(clean).filter(s=>s.length>1&&s.length<=100)).slice(0,40);
 profile.skills=splitSkills([...blocks.skills,...blocks.combined]);profile.personalSkills=splitSkills(blocks.personal);
 if(!profile.languages.length)profile.languages=languages(text);
 if(!profile.summary&&profile.experience.length){profile.summary="Experiencia en "+unique(profile.experience.map(e=>e.role)).join("; ")+".";warnings.push("No encontré un resumen profesional separado. Preparé una frase con los cargos detectados; podés mejorarla después de guardar.");}
 if(blocks.extra.length){unmapped.push(blocks.extra.join("\n"));warnings.push("Los proyectos, resultados u otras secciones adicionales no se asignan automáticamente a un puesto. Siguen disponibles en el PDF y en el texto de revisión.");}
 if(!profile.name)warnings.push("No pude identificar el nombre con seguridad.");
 if(!profile.experience.length)warnings.push("No se detectaron experiencias separadas. No se completaron puestos por suposición.");
 if(!profile.education.length)warnings.push("No se identificaron estudios separados con suficiente claridad.");
 if(!profile.skills.length)warnings.push("No se identificó una lista de habilidades. Podés agregarla después de guardar.");
 if(!header.length)warnings.push("No encontré un encabezado con datos de contacto.");
 const sections=cvImportSections.filter(section=>hasSection(profile,section));
 if(!sections.length)throw new Error("Pude leer el texto, pero no separar las secciones. Probá un CV con encabezados como Experiencia, Educación y Habilidades.");
 return {profile,sections,warnings:unique(warnings),text,unmapped,version:"cv-rules-v1"};
}
export function hasSection(profile:Profile,section:CvSection){if(section==="contact")return [profile.name,profile.headline,profile.location,profile.email,profile.phone].some(Boolean);if(section==="skills")return !!(profile.skills.length||profile.personalSkills.length);if(section==="summary")return !!profile.summary.trim();return profile[section].length>0;}
export function importPatch(input:unknown,sections:unknown){
 if(!Array.isArray(sections)||!sections.length||sections.length>6||sections.some(s=>!cvImportSections.includes(s as CvSection)))throw new Error("Elegí las secciones del borrador que querés guardar.");
 let patch:Partial<Profile>={};for(const section of new Set(sections as CvSection[])){const normalized=normalizeSection(section as ProfileSection,input);delete normalized.skillEvidence;if(section==="contact")Object.keys(normalized).forEach(key=>{if(!normalized[key as keyof Profile])delete normalized[key as keyof Profile];});if(Object.values(normalized).every(value=>Array.isArray(value)?!value.length:!value))throw new Error("Una sección seleccionada no tiene información para importar.");patch={...patch,...normalized};}return patch;
}
