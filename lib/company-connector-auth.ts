export function connectorClientAllowed(clientId: unknown, configured = process.env.MCP_COMPANY_CLIENT_IDS || ""): boolean {
  return typeof clientId === "string" && configured.split(",").map(v=>v.trim()).filter(Boolean).includes(clientId);
}
export function authorizationId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}
export function connectorOriginAllowed(origin: string|null, site: string, extra = process.env.MCP_ALLOWED_ORIGINS || ""): boolean {
  return origin === null || [site,...extra.split(",").map(v=>v.trim()).filter(Boolean)].includes(origin);
}

export function connectorResourceAllowed(resource:unknown,site:string):boolean {return resource===site+"/mcp/companies";}
