export type ThemePreference="light"|"dark"|"system";
export const themeKey="mi-busqueda:theme";
export function validTheme(value:unknown):ThemePreference{return value==="light"||value==="dark"?value:"system";}
export function resolveTheme(value:ThemePreference,darkSystem:boolean){return value==="system"?(darkSystem?"dark":"light"):value;}
