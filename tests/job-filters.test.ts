import {test} from "node:test";
import assert from "node:assert/strict";
import {marketFor,matchesJob,type JobFilters} from "../lib/job-filters.ts";
const filters:JobFilters={section:"todos",search:"",portal:"todos",mode:"todos",market:"todos",status:"todos",period:"todos"};
test("discarded jobs appear only in trash and can return without losing notes",()=>{
 const job={status:"descartado",title:"Vendedor",notes:"Preservar contacto",applied_at:"2026-11-10"};
 assert.equal(matchesJob(job,filters),false);
 assert.equal(matchesJob(job,{...filters,section:"basura"}),true);
 const restored={...job,status:"postulado"};
 assert.equal(matchesJob(restored,filters),true);
 assert.equal(matchesJob(restored,{...filters,section:"basura"}),false);
 assert.equal(restored.notes,job.notes);
});
test("market uses company industry rather than guessing from the job title",()=>{
 assert.equal(marketFor({industry:"Concesionaria de vehículos"}),"Automotriz");
 assert.equal(marketFor({industry:"Gastronomía y restaurantes"}),"Gastronomía");
 assert.equal(marketFor({industry:"Sector a confirmar",title:"Vendedor de autos"}),"Sin clasificar");
 assert.equal(marketFor({industry:"Agropecuario"}),"Agropecuario");
});
test("all five filters combine and missing dates do not pass a date filter",()=>{
 const job={status:"entrevista",title:"Asesor comercial",company:"Empresa",industry:"Automotriz",mode:"Presencial",portal:"Indeed",received_at:"2026-11-10T12:00:00Z"};
 const selected={...filters,market:"Automotriz",mode:"Presencial",status:"entrevista",portal:"Indeed",period:"7"};
 const now=new Date("2026-11-12T12:00:00Z");
 assert.equal(matchesJob(job,selected,now),true);
 assert.equal(matchesJob(job,{...selected,portal:"Bumeran"},now),false);
 assert.equal(matchesJob({...job,received_at:""},selected,now),false);
 assert.equal(matchesJob({...job,received_at:"2026-10-01"},selected,now),false);
});
