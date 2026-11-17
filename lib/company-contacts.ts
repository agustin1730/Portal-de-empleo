import {normalizeCompany,changeCompany,type CompanyLead,type CompanyContact} from "./company-pipeline-data.ts";
export function contactRows(companies:CompanyLead[]){return companies.flatMap(company=>company.contacts.map((contact,index)=>({companyId:company.id,companyName:company.name,contact,index})));}
export function changeContact(rows:CompanyLead[],input:Record<string,unknown>){
 const source=rows.find(c=>c.id===input.sourceCompanyId),index=input.index;
 const editing=input.sourceCompanyId!==null&&input.sourceCompanyId!==undefined;
 if(editing&&(!source||!Number.isInteger(index)||Number(index)<0||Number(index)>=source.contacts.length))throw new Error("El contacto cambió o ya no existe. Recargá los datos.");
 if(input.action==="contact_delete"){
  if(!editing||!source)throw new Error("Contacto no válido.");return changeCompany(rows,{action:"save",company:{...source,contacts:source.contacts.filter((_,i)=>i!==index)}});
 }
 if(input.action!=="contact_save")throw new Error("Acción no válida.");
 const target=rows.find(c=>c.id===input.companyId);if(!target)throw new Error("Elegí una empresa para el contacto.");
 const contact=normalizeCompany({id:"contact-validation",contacts:[input.contact]}).contacts[0];if(!contact)throw new Error("Agregá al menos un dato del contacto.");
 let result=rows;
 if(editing&&source){if(source.id===target.id)return changeCompany(rows,{action:"save",company:{...target,contacts:target.contacts.map((c,i)=>i===index?contact:c)}});result=changeCompany(rows,{action:"save",company:{...source,contacts:source.contacts.filter((_,i)=>i!==index)}});}
 return changeCompany(result,{action:"save",company:{...target,contacts:[...target.contacts,contact]}});
}
export const emptyContact=():CompanyContact=>({name:"",role:"",email:"",phone:"",linkedin:""});
