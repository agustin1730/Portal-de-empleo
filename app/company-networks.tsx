import {Globe} from "lucide-react";
import {companyLinkFields,companyLinkHref,type CompanyLinkKind} from "../lib/company-links";
export function CompanyNetworkIcon({kind,size=18}:{kind:CompanyLinkKind;size?:number}){
 if(kind==="website")return <Globe size={size} aria-hidden="true"/>;
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==="instagram"?<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" stroke="none"/></>:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7.5 10v7M11 17v-7m0 3a3 3 0 0 1 6 0v4"/><circle cx="7.5" cy="7.3" r=".7" fill="currentColor" stroke="none"/></>}</svg>;
}
export default function CompanyNetworks({company}:{company:{name:string;website?:string;linkedin?:string;instagram?:string}}){
 const links=companyLinkFields.map(field=>({...field,href:companyLinkHref(company[field.key],field.key)})).filter(field=>field.href);
 return links.length?<div className="company-network-links company-network-icons-only" aria-label="Enlaces de la empresa">{links.map(link=><a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer" draggable={false} title={link.label} aria-label={"Abrir "+link.label+" de "+(company.name||"empresa sin nombre")+" (otra pestaña)"}><CompanyNetworkIcon kind={link.key}/></a>)}</div>:null;
}
