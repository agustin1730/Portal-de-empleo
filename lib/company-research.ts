export type CompanyResearch = {
  summary: string;
  facts: {text: string; source: number}[];
  hypotheses: string[];
  unknowns: string[];
  nextSteps: string[];
  sources: {title: string; url: string; consultedAt: string}[];
};
export type ResearchRecord = {report: CompanyResearch; updated_at: string};
export function companyId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) throw new Error("Identificador de empresa inválido.");
  return value;
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Texto vacío o demasiado extenso.");
  return value.trim();
}
function list<T>(value: unknown, max: number, convert: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) throw new Error("Lista inválida o demasiado extensa.");
  return value.map(convert);
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Informe inválido.");
  return value as Record<string, unknown>;
}
export function normalizeResearch(value: unknown, now = new Date()): CompanyResearch {
  const r = object(value);
  const sources = list(r.sources, 20, item => {
    const s = object(item), url = new URL(text(s.url, 2000));
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("Fuente inválida.");
    const consultedAt = text(s.consultedAt, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(consultedAt) || !Number.isFinite(Date.parse(consultedAt)) || new Date(consultedAt).toISOString().slice(0,10) !== consultedAt || consultedAt > now.toISOString().slice(0,10)) throw new Error("Fecha de consulta inválida.");
    return {title: text(s.title, 200), url: url.href, consultedAt};
  });
  const facts = list(r.facts, 30, item => {
    const fact = object(item);
    if (!Number.isInteger(fact.source) || Number(fact.source) < 0 || Number(fact.source) >= sources.length) throw new Error("Cada dato debe referenciar una fuente del informe.");
    return {text: text(fact.text, 600), source: Number(fact.source)};
  });
  const result = {summary: text(r.summary, 2000), facts, sources, hypotheses: list(r.hypotheses, 15, v => text(v,600)), unknowns: list(r.unknowns,15,v=>text(v,600)), nextSteps: list(r.nextSteps,15,v=>text(v,600))};
  if (new TextEncoder().encode(JSON.stringify(result)).length > 40000) throw new Error("Informe demasiado extenso.");
  return result;
}
