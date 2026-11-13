export const modalityOptions=["Remoto","Presencial","Híbrido"];
export const availabilityOptions=["Inmediata","En 15 días","En 30 días","A convenir"];
export const hoursOptions=["Tiempo completo","Tiempo parcial","Por horas","Freelance"];
export function preferenceTags(value:string){return [...new Set(value.split(/[,;·\n]+/).map(item=>item.trim()).filter(Boolean))];}
export function togglePreference(value:string,option:string){const tags=preferenceTags(value);return (tags.includes(option)?tags.filter(tag=>tag!==option):[...tags,option]).join(" · ");}
