import {test} from "node:test";
import assert from "node:assert/strict";
import {preferenceTags,togglePreference} from "../lib/preference-options.ts";
test("preferences retain existing custom tags and toggle independently",()=>{
 assert.deepEqual(preferenceTags("Ventas, Automotriz · Ventas; Otros"),["Ventas","Automotriz","Otros"]);
 assert.equal(togglePreference("Remoto · Valor anterior","Híbrido"),"Remoto · Valor anterior · Híbrido");
 assert.equal(togglePreference("Remoto · Presencial","Remoto"),"Presencial");
 assert.deepEqual(preferenceTags(""),[]);
});
