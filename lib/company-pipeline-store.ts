import {createClient} from "./supabase/server";
import {changeCompany,type CompanyLead} from "./company-pipeline-data";
import {importCompanyBatch} from "./company-csv";
export async function readCompanyPipeline(owner:string){const db=await createClient();const {data,error}=await db.from("candidate_profiles").select("data,updated_at").eq("owner_id",owner).maybeSingle();if(error)throw new Error("No pudimos leer las empresas.");return {db,row:data};}
export function companyRows(data:Record<string,unknown>|undefined|null):CompanyLead[]{const rows=data?.crm_prospects;return Array.isArray(rows)?rows:[];}
export async function saveCompanyPipeline(owner:string,input:unknown){
 if(!input||typeof input!=="object")throw new Error("Solicitud inválida.");const body=input as Record<string,unknown>,{db,row}=await readCompanyPipeline(owner);
 if(body.version!==(row?.updated_at||null))throw new Error("Los datos cambiaron en otra ventana. Recargá las empresas antes de guardar.");
 const batch=body.action==="import"?importCompanyBatch(companyRows(row?.data),body.companies):null;
 const companies=batch?.companies??changeCompany(companyRows(row?.data),body),updated_at=new Date().toISOString();
 let version:string;
 if(row){const {data,error}=await db.from("candidate_profiles").update({data:{...row.data,crm_prospects:companies},updated_at}).eq("owner_id",owner).eq("updated_at",row.updated_at).select("owner_id,updated_at");if(error)throw new Error("No pudimos guardar.");if(!data?.length)throw new Error("Los datos cambiaron. Recargá antes de guardar.");version=data[0].updated_at;}
 else{const {data,error}=await db.from("candidate_profiles").insert({owner_id:owner,data:{crm_prospects:companies},updated_at}).select("updated_at").single();if(error||!data)throw new Error("No pudimos guardar. Recargá antes de reintentar.");version=data.updated_at;}
 return {companies,version,...(batch?{imported:batch.imported,duplicates:batch.duplicates}:{})};
}
