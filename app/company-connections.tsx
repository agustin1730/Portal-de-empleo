"use client";
import {useState} from "react";
import {Plug,Unplug} from "lucide-react";
import "./company-research.css";
type Grant={id:string;name:string;granted_at:string};
export default function CompanyConnections(){
  const [grants,setGrants]=useState<Grant[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function load(){setBusy(true);setError("");try{const r=await fetch("/api/company-connections",{cache:"no-store"}),data=await r.json();if(!r.ok)throw new Error(data.error);setGrants(data.grants);}catch(e){setError(e instanceof Error?e.message:"No pudimos leer las conexiones.");}finally{setBusy(false);}}
  async function revoke(grant:Grant){if(!window.confirm("¿Revocar el acceso de "+grant.name+" a las empresas?"))return;setBusy(true);setError("");try{const r=await fetch("/api/company-connections",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientId:grant.id})}),data=await r.json();if(!r.ok)throw new Error(data.error);setGrants(v=>v?.filter(g=>g.id!==grant.id)||[]);}catch(e){setError(e instanceof Error?e.message:"No pudimos revocar el acceso.");}finally{setBusy(false);}}
  return <section className="settings-card company-connections"><header className="settings-panel-heading"><h2><Plug size={21}/>Conexiones de empresas</h2></header><p>Consultar empresas y guardar investigaciones desde tu asistente.</p><code>/mcp/companies</code><p><button type="button" className="button" disabled={busy} onClick={()=>void load()}>{busy?"Consultando…":"Ver conexiones"}</button></p>{error&&<p role="alert" className="form-error">{error}</p>}{grants?.length===0&&<p>No hay conexiones autorizadas.</p>}{!!grants?.length&&<ul>{grants.map(g=><li key={g.id}><span>{g.name}</span><button type="button" className="button" disabled={busy} onClick={()=>void revoke(g)}><Unplug size={15}/>Revocar</button></li>)}</ul>}</section>;
}
