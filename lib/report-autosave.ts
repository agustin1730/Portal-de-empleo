import {normalizeReport,type Report,type ReportInput} from "./reports.ts";
export type SaveStatus="draft"|"pending"|"saving"|"saved"|"error";
export type AutosaveState={draft:ReportInput;status:SaveStatus;error:string;dirty:boolean;version:string|null;needsAcceptance:boolean};
type IO={save:(draft:ReportInput,version:string|null)=>Promise<Report>;load:(id:string)=>Promise<Report|null>;saved:(report:Report)=>void;changed:(state:AutosaveState)=>void};
const inputOf=(r:Report):ReportInput=>({id:r.id,title:r.title,kind:r.kind,company_id:r.company_id,content:r.content});
const fingerprint=(r:ReportInput)=>JSON.stringify({...r,title:r.title.trim()});
export class ReportAutosave{
 private draft:ReportInput;private acknowledged:string;private version:string|null;private status:SaveStatus;private error="";private blocked=false;private active=true;private accepted:boolean;private attempted:ReportInput|null=null;private timer:ReturnType<typeof setTimeout>|null=null;private running:Promise<boolean>|null=null;
 private io:IO;private delay:number;
 constructor(initial:ReportInput,version:string|null,io:IO,delay=700,needsAcceptance=false){this.io=io;this.delay=delay;this.draft={...initial};this.version=version;this.acknowledged=fingerprint(initial);this.status=version?"saved":"draft";this.accepted=!needsAcceptance;}
 state():AutosaveState{return {draft:{...this.draft},status:this.status,error:this.error,dirty:fingerprint(this.draft)!==this.acknowledged,version:this.version,needsAcceptance:!this.accepted};}
 private emit(){if(this.active)this.io.changed(this.state());}
 private cancel(){if(this.timer!==null)clearTimeout(this.timer);this.timer=null;}
 resume(){this.active=true;this.emit();if(this.state().dirty&&!this.blocked)this.schedule();}
 suspend(){this.active=false;this.cancel();}
 update(patch:Partial<Pick<ReportInput,"title"|"kind"|"company_id"|"content">>){this.draft={...this.draft,...patch};this.cancel();if(!this.blocked){this.status=this.running?"saving":this.state().dirty?"pending":this.version?"saved":"draft";this.error="";}this.emit();this.schedule();}
 private schedule(){this.cancel();if(!this.active||!this.accepted||this.blocked||!this.state().dirty||!this.draft.title.trim())return;this.timer=setTimeout(()=>{this.timer=null;void this.saveOnce();},this.delay);}
 private saveOnce():Promise<boolean>{
  if(this.running)return this.running;
  if(this.blocked||!this.active||!this.accepted)return Promise.resolve(false);
  if(!this.state().dirty)return Promise.resolve(true);
  let snapshot:ReportInput;
  try{snapshot=normalizeReport(this.draft);if(new TextEncoder().encode(JSON.stringify({report:snapshot,expected_version:this.version})).length>60000)throw new Error("El documento supera el tamaño permitido. Descargá una copia para dividirlo.");}
  catch(e){this.blocked=true;this.error=e instanceof Error?e.message:"Revisá el documento.";this.status="error";this.emit();return Promise.resolve(false);}
  const version=this.version;this.attempted=snapshot;this.status="saving";this.error="";
  this.running=Promise.resolve().then(()=>this.io.save(snapshot,version)).then(saved=>{this.version=saved.updated_at;this.acknowledged=fingerprint(inputOf(saved));this.status=this.state().dirty?"pending":"saved";if(this.active)this.io.saved(saved);return true;}).catch(e=>{this.blocked=true;this.status="error";this.error=e instanceof Error?e.message:"No pudimos guardar. Tu texto sigue disponible en esta ventana.";return false;}).finally(()=>{this.running=null;this.emit();if(!this.blocked&&this.state().dirty)this.schedule();});
  this.emit();return this.running;
 }
 async flush():Promise<boolean>{this.cancel();if(this.running){if(!await this.running)return false;}if(this.blocked||!this.accepted)return false;if(!this.state().dirty)return true;const ok=await this.saveOnce();if(!ok)return false;return this.state().dirty?this.flush():true;}
 replace(saved:Report){if(this.running||this.state().dirty)throw Error("Hay cambios pendientes.");this.cancel();this.draft=inputOf(saved);this.version=saved.updated_at;this.acknowledged=fingerprint(this.draft);this.accepted=true;this.attempted=null;this.blocked=false;this.error="";this.status="saved";this.emit();}
 async accept(){this.accepted=true;if(!this.version)this.acknowledged="";return this.flush();}
 async retry():Promise<boolean>{
  if(this.running)return this.flush();
  try{const remote=await this.io.load(this.draft.id);
   if(remote){const mark=fingerprint(inputOf(remote));if(mark!==this.acknowledged&&(!this.attempted||mark!==fingerprint(this.attempted)))throw new Error("Otra ventana cambió este informe. Descargá tu copia antes de volver a abrirlo.");this.version=remote.updated_at;this.acknowledged=mark;if(this.active)this.io.saved(remote);}
   else if(this.version)throw new Error("El informe ya no está disponible. Descargá tu copia.");
   this.blocked=false;this.error="";this.status=this.state().dirty?"pending":this.version?"saved":"draft";this.emit();return this.flush();
  }catch(e){this.status="error";this.error=e instanceof Error?e.message:"No pudimos comprobar el guardado.";this.blocked=true;this.emit();return false;}
 }
}
