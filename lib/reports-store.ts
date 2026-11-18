import {createClient} from "./supabase/server";
import {normalizeReport,reportId,reportPagination,reportVersion,ReportError,type Report,type ReportPage,type ReportSummary} from "./reports";
export async function listReports(offset=0,limit=100):Promise<ReportPage>{
 const page=reportPagination(offset,limit),db=await createClient();
 const {data,error}=await db.from("reports").select("id,title,kind,company_id,created_at,updated_at").order("updated_at",{ascending:false}).order("id").range(page.offset,page.offset+page.limit);
 if(error)throw new ReportError("No pudimos cargar los informes.",500);
 const rows=(data||[]) as ReportSummary[];return {reports:rows.slice(0,page.limit),next_offset:rows.length>page.limit?page.offset+page.limit:null};
}
export async function getReport(id:unknown):Promise<Report>{
 const db=await createClient(),{data,error}=await db.from("reports").select("id,title,kind,company_id,content,created_at,updated_at").eq("id",reportId(id)).maybeSingle();
 if(error)throw new ReportError("No pudimos leer el informe.",500);if(!data)throw new ReportError("Informe no encontrado o acceso desactivado.",404);return data as Report;
}
export async function saveReport(input:unknown,version:unknown):Promise<Report>{
 const r=normalizeReport(input),expected=reportVersion(version),db=await createClient();
 const {data,error}=await db.rpc("reports_save",{p_id:r.id,p_title:r.title,p_kind:r.kind,p_company_id:r.company_id,p_content:r.content,p_expected_version:expected});
 if(error)throw new ReportError(error.code==="40001"?"El informe cambió en otra ventana. Cerrá y volvé a abrirlo antes de guardar.":error.code==="23503"?"La empresa ya no existe. Quitá la relación o elegí otra.":error.code==="42501"?"Acceso a informes desactivado.":"No pudimos guardar el informe.",error.code==="40001"?409:error.code==="42501"?403:400);
 return data as Report;
}
