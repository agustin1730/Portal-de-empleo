"use client";
import {useState} from "react";
import {Plus,X} from "lucide-react";
import {preferenceTags,togglePreference,modalityOptions,availabilityOptions,hoursOptions} from "../lib/preference-options";
import type {WorkPreferences} from "../lib/profile-data";
function Tags({label,value,onChange,suggestions=[]}:{label:string;value:string;onChange:(value:string)=>void;suggestions?:string[]}){
 const [input,setInput]=useState("");const tags=preferenceTags(value);
 function add(){const next=[...new Set([...tags,...preferenceTags(input)])];if(next.join(" · ").length>500)return;onChange(next.join(" · "));setInput("");}
 return <div className="preference-tag-field"><label>{label}<div className="preference-tag-input"><input aria-label={label} value={input} maxLength={100} placeholder="Escribí y presioná Enter" onChange={event=>setInput(event.target.value)} onBlur={add} onKeyDown={event=>{if(event.key==="Enter"||event.key===","){event.preventDefault();add();}}}/><button type="button" aria-label={"Agregar etiqueta a "+label.toLowerCase()} onClick={add}><Plus size={17}/></button></div></label><div className="candidate-tags">{tags.map(tag=><span key={tag}>{tag}<button type="button" aria-label={"Quitar "+tag} onClick={()=>onChange(tags.filter(item=>item!==tag).join(" · "))}><X size={12}/></button></span>)}</div>{suggestions.filter(tag=>!tags.includes(tag)).length>0&&<div className="preference-suggestions">{suggestions.filter(tag=>!tags.includes(tag)).map(tag=><button type="button" key={tag} onClick={()=>onChange([...tags,tag].join(" · "))}>+ {tag}</button>)}</div>}</div>;
}
export default function PreferenceFields({value,onChange}:{value:WorkPreferences;onChange:(value:WorkPreferences)=>void}){
 const change=(key:keyof WorkPreferences,next:string)=>onChange({...value,[key]:next});
 function choices(key:"modality"|"hours"|"availability",label:string,options:string[],single=false){const selected=preferenceTags(value[key]);return <fieldset className="preference-choices"><legend>{label}</legend><div>{[...options,...selected.filter(option=>!options.includes(option))].map(option=><label key={option}><input type={single?"radio":"checkbox"} name={key} value={option} checked={single?value[key]===option:selected.includes(option)} onChange={()=>change(key,single?option:togglePreference(value[key],option))}/>{option}</label>)}</div>{single&&value[key]&&<button className="candidate-text-action" type="button" onClick={()=>change(key,"")}>Sin definir</button>}</fieldset>;}
 return <><div className="preference-salary"><label>Sueldo mínimo<input type="number" min="0" step="0.01" value={value.salaryMin} placeholder="Sin separadores de miles" onChange={event=>change("salaryMin",event.target.value)}/></label>{([["currency","Moneda",["ARS","USD","EUR"]],["salaryPeriod","Período",["mes","hora","año"]]] as const).map(([key,label,options])=><label key={key}>{label}<select value={value[key]} onChange={event=>change(key,event.target.value)}>{options.map(option=><option key={option}>{option}</option>)}</select></label>)}</div>
 <Tags label="Puestos buscados" value={value.roles} onChange={next=>change("roles",next)} suggestions={["Ventas","Atención al cliente","Administración","Marketing"]}/>
 <Tags label="Rubros de interés" value={value.industries} onChange={next=>change("industries",next)} suggestions={["Automotriz","Gastronomía","Comercio","Tecnología","Servicios"]}/>
 <label>Ubicación<input type="text" maxLength={500} value={value.location} onChange={event=>change("location",event.target.value)} placeholder="Tu localidad o zona de búsqueda"/></label>
 {choices("modality","Modalidad",modalityOptions)}{choices("hours","Jornada",hoursOptions)}{choices("availability","Disponibilidad",availabilityOptions,true)}</>;
}
