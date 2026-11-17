"use client";
import {useEffect,useState} from "react";
import {Sun,Moon,Monitor,Check} from "lucide-react";
import {validTheme,resolveTheme,themeKey,type ThemePreference} from "../lib/theme";
export default function ThemePicker(){
 const [preference,setPreference]=useState<ThemePreference>("system"),[error,setError]=useState("");
 useEffect(()=>{try{setPreference(validTheme(localStorage.getItem(themeKey)));}catch{setPreference("system");}},[]);
 function choose(value:ThemePreference){setPreference(value);document.documentElement.dataset.theme=resolveTheme(value,matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.themePreference=value;try{localStorage.setItem(themeKey,value);setError("");}catch{setError("La preferencia se aplicó, pero no pudo guardarse en este navegador.");}}
 return <section className="settings-card settings-appearance"><header className="settings-panel-heading"><h2><Moon size={21}/>Apariencia</h2><span className="settings-theme-label">{preference==="light"?"Claro":preference==="dark"?"Oscuro":"Sistema"}</span></header><div className="theme-options" role="group" aria-label="Tema de la aplicación">{([{value:"light",label:"Claro",Icon:Sun},{value:"dark",label:"Oscuro",Icon:Moon},{value:"system",label:"Sistema",Icon:Monitor}] as const).map(({value,label,Icon})=><button key={value} type="button" aria-pressed={preference===value} onClick={()=>choose(value)}><span className="theme-option-title"><Icon size={22}/>{label}{preference===value&&<Check size={18} className="theme-option-check"/>}</span><span className={"theme-option-preview preview-"+value} aria-hidden="true"><span className="preview-top"><i/><i/><i/></span><span className="preview-layout"><span className="preview-nav"><i/><i/><i/></span><span className="preview-content"><i/><i/></span></span></span></button>)}</div>{error&&<p className="form-error" role="status">{error}</p>}</section>;
}
