export const companyLinkFields=[{key:"website",label:"Sitio web",placeholder:"https://empresa.com"},{key:"linkedin",label:"LinkedIn",placeholder:"https://linkedin.com/company/empresa"},{key:"instagram",label:"Instagram",placeholder:"https://instagram.com/empresa"}] as const;
export type CompanyLinkKind=typeof companyLinkFields[number]["key"];
export function normalizeCompanyLink(value:string,kind:CompanyLinkKind){
 if(!value.trim())return "";
 let url:URL;try{url=new URL(/^[a-z][a-z\d+.-]*:/i.test(value)?value.trim():"https://"+value.trim());}catch{throw new Error("Revisá el enlace de "+kind+".");}
 if(!["https:","http:"].includes(url.protocol)||url.username||url.password)throw new Error("Usá una URL http/https sin credenciales.");
 const host=url.hostname.toLowerCase(),domain=kind==="linkedin"?"linkedin.com":kind==="instagram"?"instagram.com":null;
 if(domain&&host!==domain&&!host.endsWith("."+domain))throw new Error("Usá un enlace válido de "+(kind==="linkedin"?"LinkedIn":"Instagram")+".");
 return url.href;
}
export function companyLinkHref(value:string|undefined,kind:CompanyLinkKind){try{return normalizeCompanyLink(value||"",kind);}catch{return "";}}
