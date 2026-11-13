import {test} from "node:test";
import assert from "node:assert/strict";
import {compareWorkConditions} from "../lib/work-conditions.ts";
import {emptyPreferences} from "../lib/profile-data.ts";
const prefs={...emptyPreferences,salaryMin:"1000000",location:"CABA",modality:"Remoto · Híbrido",hours:"Tiempo completo"};
const status=(salary_label:string)=>compareWorkConditions({salary_label},prefs)[0].status;
test("salary compares only known currency and period, preserving unknown ranges",()=>{
 assert.equal(status("1.200.000 ARS / mes"),"matched");
 assert.equal(status("900.000 ARS mensuales"),"different");
 assert.equal(status("Entre 900.000 y 1.200.000 ARS / mes"),"unknown");
 assert.equal(status("1.000.000 - 1.200.000 ARS / mes"),"matched");
 assert.equal(status("Desde 900.000 ARS / mes"),"unknown");
 assert.equal(status("Hasta 900.000 ARS / mes"),"different");
 for(const value of ["Sueldo a confirmar","$ 1.200.000 / mes","1.200.000 ARS","1000 USD / mes","5000 ARS / hora","1.200.000 ARS / mes más comisiones"])assert.equal(status(value),"unknown",value);
});
test("modality and hours compare multiple preferences and preserve unknowns",()=>{
 const rows=compareWorkConditions({mode:"Presencial",hours:"Tiempo completo",location_label:"Capital Federal"},prefs);
 assert.deepEqual(rows.slice(1).map(row=>row.status),["different","matched","matched"]);
 assert.equal(compareWorkConditions({mode:"Remoto"},{...prefs,modality:"Remoto o híbrido"})[1].status,"matched");
 assert.equal(compareWorkConditions({mode:"Híbrido con dos días presenciales"},prefs)[1].status,"matched");
 assert.equal(compareWorkConditions({mode:"A confirmar"},prefs)[1].status,"unknown");
 assert.equal(compareWorkConditions({description:"Modalidad: híbrida. Jornada completa."},prefs)[3].status,"matched");
 assert.equal(compareWorkConditions({description:"No se ofrece jornada completa."},prefs)[3].status,"unknown");
});
test("location uses explicit aliases without inventing geographic equivalence",()=>{
 assert.equal(compareWorkConditions({location_label:"Ciudad Autónoma de Buenos Aires, Argentina"},prefs)[2].status,"matched");
 assert.equal(compareWorkConditions({location_label:"Córdoba"},prefs)[2].status,"different");
 assert.equal(compareWorkConditions({location_label:"Buenos Aires"},prefs)[2].status,"unknown");
 assert.equal(compareWorkConditions({location_label:"Ubicación a confirmar"},prefs)[2].status,"unknown");
});
test("missing profile preferences never yield a match",()=>{
 assert.ok(compareWorkConditions({mode:"Remoto",salary_label:"1.200.000 ARS / mes"},null).every(row=>row.status==="unknown"));
 assert.ok(compareWorkConditions({mode:"Remoto"},emptyPreferences).every(row=>row.status==="unknown"));
});
