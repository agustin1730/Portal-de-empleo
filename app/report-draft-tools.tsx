"use client";
import {useEffect,useRef,useState} from 'react';
import {draftEpoch,draftFingerprint,listDrafts,putDraft,removeDraft,logoutEvent,type LocalDraft} from '../lib/report-drafts';
import type {AutosaveState} from '../lib/report-autosave';
import type {ReportInput} from '../lib/reports';
import ReportMarkdown from './report-markdown';
export function useReportBackup(owner:string,state:AutosaveState){
 const [error,setError]=useState(''),[stored,setStored]=useState('');const instance=useRef(''),revision=useRef(0),epoch=useRef<Promise<number>|null>(null),enabled=useRef(true);
 useEffect(()=>{enabled.current=true;const stop=(e:Event)=>{if((e as CustomEvent).detail===owner)enabled.current=false;};window.addEventListener(logoutEvent,stop);return()=>window.removeEventListener(logoutEvent,stop);},[owner]);
 useEffect(()=>{if(!owner||!enabled.current)return;if(!instance.current)instance.current=crypto.randomUUID();if(!epoch.current)epoch.current=draftEpoch(owner);const seq=++revision.current,key=owner+':'+state.draft.id+':'+instance.current,fp=draftFingerprint(state.draft);let mounted=true;
 const persist=async()=>{try{const value=await epoch.current!;if(!enabled.current)return;if(state.dirty||state.needsAcceptance||state.status==='saving'){const ok=await putDraft({key,owner,instance:instance.current,revision:seq,at:Date.now(),draft:state.draft,baseVersion:state.version,needsAcceptance:state.needsAcceptance},value);if(mounted&&ok){setStored(fp);setError('');}}else {await removeDraft(key,owner,seq);if(mounted){setStored('');setError('');}}}catch(e){if(mounted)setError(e instanceof Error?e.message:'No hay copia local disponible.');}};
 const timer=setTimeout(()=>void persist(),200),hide=()=>{if(document.visibilityState==='hidden')void persist();};document.addEventListener('visibilitychange',hide);return()=>{mounted=false;clearTimeout(timer);document.removeEventListener('visibilitychange',hide);if(state.dirty||state.needsAcceptance)void persist();};
 },[owner,state]);return {error,available:!!stored&&stored===draftFingerprint(state.draft)};
}
export default function ReportDraftShelf({owner,onRecover}:{owner:string;onRecover:(draft:LocalDraft)=>Promise<void>}){
 const [rows,setRows]=useState<LocalDraft[]>([]),[error,setError]=useState(''),[review,setReview]=useState<LocalDraft|null>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;if(owner)listDrafts(owner).then(v=>{if(active)setRows(v);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[owner]);
 async function discard(row:LocalDraft){if(!window.confirm('¿Descartar este borrador local?'))return;try{await removeDraft(row.key,owner);setRows(v=>v.filter(r=>r.key!==row.key));setReview(null);}catch(e){setError(e instanceof Error?e.message:'No pudimos descartar.');}}
 return <>{error&&<p role="alert" className="form-error">{error}</p>}{rows.length>0&&<section className="report-recovery"><strong>Borradores en este dispositivo</strong>{rows.map(row=><div key={row.key}><span>{row.draft.title||'Sin título'} · {new Date(row.at).toLocaleString('es-AR')}</span><button className="button" onClick={()=>setReview(review?.key===row.key?null:row)}>Revisar</button><button className="text-button" onClick={()=>void discard(row)}>Descartar</button></div>)}{review&&<div className="report-recovery-preview"><ReportMarkdown content={review.draft.content}/><button className="button primary" disabled={busy} onClick={()=>{setBusy(true);onRecover(review).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Recuperar borrador</button><button className="button" onClick={()=>downloadLocal(review.draft)}>Descargar copia</button></div>}</section>}</>;
}
function downloadLocal(draft:ReportInput){const url=URL.createObjectURL(new Blob([draft.content],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='borrador.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
