import {createClient} from "./supabase/server";
import {companyId, normalizeResearch, type ResearchRecord} from "./company-research";
export async function readConnectorCompanies(id?: string) {
  const db = await createClient();
  const {data,error} = await db.rpc("crm_company_data", {p_id: id === undefined ? null : companyId(id)});
  if (error) throw new Error("No pudimos leer las empresas. Comprobá la migración y el acceso de la conexión.");
  return data as Record<string, unknown>[];
}
export async function readResearch(id: string): Promise<ResearchRecord|null> {
  const db = await createClient();
  const {data,error} = await db.rpc("crm_read_research", {p_id: companyId(id)});
  if (error) throw new Error("No pudimos leer el informe. Comprobá la migración y el acceso de la conexión.");
  return data ? {report:normalizeResearch(data.report),updated_at:data.updated_at} : null;
}
export async function saveResearch(id: string, report: unknown, expectedVersion: unknown): Promise<ResearchRecord> {
  if (expectedVersion !== null && (typeof expectedVersion !== "string" || expectedVersion.length > 50 || !Number.isFinite(Date.parse(expectedVersion)))) throw new Error("Leé el informe actual antes de guardar.");
  const normalized = normalizeResearch(report), db = await createClient();
  const {data,error} = await db.rpc("crm_save_research", {p_id: companyId(id),p_report: normalized,p_expected_version: expectedVersion});
  if (error) throw new Error(error.code === "40001" ? "El informe cambió. Leelo de nuevo antes de guardar." : "No pudimos guardar el informe. Comprobá que la empresa exista y la conexión siga autorizada.");
  return data as ResearchRecord;
}
