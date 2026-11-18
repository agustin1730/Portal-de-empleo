"use client";
import {useEffect,useRef,useState} from "react";
import {Building2,Check,ChevronDown,Mail,Search,X} from "lucide-react";
export type ReportOption={value:string;label:string};
export default function ReportProperty({value,options,label,kind,disabled=false,onChange}:{value:string;options:ReportOption[];label:string;kind:"type"|"company";disabled?:boolean;onChange:(value:string)=>void}){
 const ref=useRef<HTMLDetailsElement>(null),input=useRef<HTMLInputElement>(null),[opened,setOpened]=useState(false),[query,setQuery]=useState(""),[position,setPosition]=useState({top:0,left:0});
 useEffect(()=>{if(!opened)return;if(kind==="company")input.current?.focus();const outside=(e:PointerEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))ref.current.open=false;};document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside);},[opened,kind]);
 const text=options.find(o=>o.value===value)?.label||(value?"Empresa no disponible":"Sin empresa"),Icon=kind==="company"?Building2:value==="carta"?Mail:Search;
 const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es");
 function choose(next:string){onChange(next);if(ref.current)ref.current.open=false;ref.current?.querySelector("summary")?.focus();}
 return <details ref={ref} className="report-property" onToggle={e=>{setOpened(e.currentTarget.open);if(e.currentTarget.open){const r=e.currentTarget.querySelector("summary")!.getBoundingClientRect();setPosition({top:Math.max(10,Math.min(r.bottom+6,window.innerHeight-330)),left:Math.max(12,Math.min(r.left,window.innerWidth-282))});}else setQuery("");}} onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();if(ref.current)ref.current.open=false;ref.current?.querySelector("summary")?.focus();}}}>
  <summary className={"report-chip "+(kind==="type"?value:"")} aria-label={label+": "+text} aria-disabled={disabled} onClick={e=>{if(disabled)e.preventDefault();}}><Icon size={14}/><span>{text}</span><ChevronDown size={12}/></summary>
  <div className="report-property-menu" style={position} role="group" aria-label={"Elegir "+label}>
   {kind==="company"&&<label className="report-property-search"><Search size={14}/><input ref={input} aria-label="Buscar empresa" placeholder="Buscar empresa…" value={query} onChange={e=>setQuery(e.target.value)}/></label>}
   <div className="report-property-options">{options.filter(o=>normalize(o.label).includes(normalize(query))).map(o=><button type="button" key={o.value} disabled={disabled} aria-pressed={o.value===value} onClick={()=>choose(o.value)}><span>{o.label}</span>{o.value===value&&<Check size={14}/>}</button>)}{options.filter(o=>normalize(o.label).includes(normalize(query))).length===0&&<p>Sin coincidencias.</p>}</div>
   {kind==="company"&&value&&<button type="button" className="report-clear" disabled={disabled} onClick={()=>choose("")}><X size={13}/>Quitar relación</button>}
  </div>
 </details>;
}
