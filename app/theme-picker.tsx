"use client";
import {useEffect,useState} from "react";
import {Sun,Moon,Monitor} from "lucide-react";
import {validTheme,resolveTheme,themeKey,type ThemePreference} from "../lib/theme";
export default function ThemePicker(){
 const [preference,setPreference]=useState<ThemePreference>("system"),[error,setError]=useState("");
 useEffect(()=>{try{setPreference(validTheme(localStorage.getItem(themeKey)));}catch{setPreference("system");}},[]);
 function choose(value:ThemePreference){setPreference(value);document.documentElement.dataset.theme=resolveTheme(value,matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.themePreference=value;try{localStorage.setItem(themeKey,value);setError("");}catch{setError("La preferencia se aplicó, pero no pudo guardarse en este navegador.");}}
 return <section className="settings-card"><h2><Moon size={19}/>Apariencia</h2><div className="theme-options" role="group" aria-label="Tema de la aplicación">{([{value:"light",label:"Claro",Icon:Sun},{value:"dark",label:"Oscuro",Icon:Moon},{value:"system",label:"Sistema",Icon:Monitor}] as const).map(({value,label,Icon})=><button key={value} type="button" aria-pressed={preference===value} onClick={()=>choose(value)}><Icon size={18}/>{label}</button>)}</div>{error&&<p className="form-error" role="status">{error}</p>}</section>;
}
