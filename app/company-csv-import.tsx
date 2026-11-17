"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {Upload,X} from "lucide-react";
import {csvFields,detectCsvColumns,parseCompanyCsv,prepareCompanyCsv,type CsvField,type CsvTable} from "../lib/company-csv";
import type {CompanyLead} from "../lib/company-pipeline-data";

export default function CompanyCsvImport({existing,disabled,onImport}:{existing:CompanyLead[];disabled:boolean;onImport:(companies:CompanyLead[])=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null),file=useRef<HTMLInputElement>(null);
 const [opened,setOpened]=useState(false),[table,setTable]=useState<CsvTable|null>(null),[mapping,setMapping]=useState<Partial<Record<CsvField,number>>>({}),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{if(opened)dialog.current?.showModal();else dialog.current?.close();},[opened]);
 const {preview,previewError}=useMemo(()=>{if(!table)return {preview:null,previewError:""};try{return {preview:prepareCompanyCsv(table,mapping,existing),previewError:""};}catch(e){return {preview:null,previewError:e instanceof Error?e.message:"Revisá las columnas."};}},[table,mapping,existing]);
 const tooMany=!!preview&&existing.length+preview.companies.length>200;
 function close(){if(!busy)setOpened(false);}
 return <><button type="button" className="button" disabled={disabled} onClick={()=>{setTable(null);setError("");setOpened(true);}}><Upload size={15}/>Importar CSV</button>
 <dialog ref={dialog} className="crm-dialog company-dialog company-csv-dialog" aria-labelledby="company-csv-title" onCancel={e=>{e.preventDefault();close();}}><header className="company-csv-header"><h2 id="company-csv-title">Importar empresas</h2><button type="button" className="icon-button" aria-label="Cerrar importación" disabled={busy} onClick={close}><X size={20}/></button></header><div className="crm-dialog-body">
 <p className="company-entry-hint">Todos los campos son opcionales. Las empresas existentes se conservan.</p>
 <input ref={file} type="file" accept=".csv,text/csv" disabled={busy} aria-label="Archivo CSV de empresas" onChange={async e=>{const selected=e.target.files?.[0];setError("");setTable(null);if(!selected)return;setBusy(true);try{if(selected.size>1_000_000)throw new Error("El CSV debe pesar menos de 1 MB.");const text=await selected.text(),parsed=parseCompanyCsv(text);setTable(parsed);setMapping(detectCsvColumns(parsed.headers));}catch(e){setError(e instanceof Error?e.message:"No se pudo leer el archivo.");}finally{setBusy(false);}}}/>
 <p className="company-entry-hint">CSV UTF-8 · coma, punto y coma o tabulación · hasta 200 filas.</p>
 <details className="company-entry-section"><summary>Columnas sugeridas</summary><p className="company-entry-hint">{csvFields.map(([,label])=>label).join(" · ")}. Fechas: AAAA-MM-DD.</p></details>
 {table&&<><div className="crm-form-grid company-csv-mapping">{csvFields.map(([field,label])=><label key={field}>{label}<select disabled={busy} value={mapping[field]??""} onChange={e=>setMapping({...mapping,[field]:e.target.value===""?undefined:Number(e.target.value)})}><option value="">No importar</option>{table.headers.map((h,i)=><option key={i} value={i}>{h||"Columna "+(i+1)}</option>)}</select></label>)}</div>
 {preview&&<><p className="company-csv-count">{preview.companies.length} nuevas · {preview.duplicates} duplicadas · {preview.issues.length} con errores</p><div className="crm-table-wrap company-table"><table className="crm-table"><caption>Vista previa · primeras 5 empresas</caption><thead><tr><th>Empresa</th><th>Rubro</th><th>Ubicación</th></tr></thead><tbody>{preview.companies.slice(0,5).map(c=><tr key={c.id}><td>{c.name}</td><td>{c.industry||"—"}</td><td>{c.country||"—"}</td></tr>)}</tbody></table></div>{preview.issues.length>0&&<div role="alert" className="form-error">Corregí estas filas en el archivo y volvé a cargarlo.<ul>{preview.issues.slice(0,10).map(issue=><li key={issue.row}>Fila {issue.row}: {issue.message}</li>)}</ul>{preview.issues.length>10&&<p>Y {preview.issues.length-10} filas más.</p>}</div>}{tooMany&&<p className="form-error" role="alert">El CRM admite 200 empresas. Quedan {Math.max(0,200-existing.length)} lugares.</p>}</>}
 </>}{(error||previewError)&&<p className="form-error" role="alert">{error||previewError}</p>}
 </div><footer className="company-csv-footer"><button type="button" className="button" disabled={busy} onClick={close}>Cancelar</button><button type="button" className="button primary" disabled={busy||disabled||!preview?.companies.length||!!preview.issues.length||tooMany||!!previewError} onClick={async()=>{if(!preview)return;setBusy(true);setError("");try{await onImport(preview.companies.map(c=>({...c,id:crypto.randomUUID()})));setOpened(false);}catch(e){setError(e instanceof Error?e.message:"No se pudo importar.");}finally{setBusy(false);}}}>{busy?"Importando…":"Importar"+(preview?" "+preview.companies.length:"")}</button></footer></dialog></>;
}

