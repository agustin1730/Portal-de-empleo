import {Check,Minus,HelpCircle,Wallet,MapPin,Monitor,Clock3} from "lucide-react";
import type {WorkCondition} from "../lib/work-conditions";
import "./work-conditions.css";
const icons={salary:Wallet,modality:Monitor,location:MapPin,hours:Clock3};
export default function WorkConditions({conditions}:{conditions?:WorkCondition[]}){
 if(!conditions?.length)return null;
 return <section className="work-conditions" aria-label="Condiciones para vos"><h3>Condiciones para vos</h3>{conditions.map(row=>{const Icon=icons[row.key],Status=row.status==="matched"?Check:row.status==="different"?Minus:HelpCircle;return <div className="work-condition" key={row.key}><Icon size={17}/><div><strong>{row.label}</strong><p>Oferta: {row.offer}</p><p>Buscás: {row.preference}</p></div><span className={"work-condition-status "+row.status}><Status size={13}/>{row.status==="matched"?"Coincide":row.status==="different"?"No coincide":"Por confirmar"}</span></div>;})}</section>;
}
