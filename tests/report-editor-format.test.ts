import test from "node:test";
import assert from "node:assert/strict";
import {reportMarkdownManager,parseReportDocument,safeDocumentLink,unsupportedReportContent,sanitizeEditorDocument} from "../lib/report-editor-format.ts";
const sample='# Título\n\nTexto **importante** y *cursiva* con [fuente](https://example.test).\n\n## Sección\n\n- Elemento\n- Segundo\n\n3. Tercero\n4. Cuarto\n\n- [x] Hecho\n- [ ] Pendiente\n\n> Cita\n\n```js\nconst example = 1;\n```\n\n| Nombre | Área |\n| --- | --- |\n| Ejemplo | Ventas |';
test("visual editor round-trips headings, inline marks, lists, checklists, quotes, code and tables through agent-readable Markdown",()=>{
 const manager=reportMarkdownManager(),parsed=parseReportDocument(sample);assert.equal(parsed.issue,"");assert.ok(parsed.document);
 const json=JSON.stringify(parsed.document);for(const type of ["heading","bold","italic","bulletList","orderedList","taskList","taskItem","blockquote","codeBlock","table"])assert.ok(json.includes('"'+type+'"'),type);
 const output=manager.serialize(parsed.document!);for(const text of ['**importante**','*cursiva*','https://example.test','[x]','[ ]','const example = 1','Ventas'])assert.ok(output.includes(text),text);
 const reparsed=parseReportDocument(output);assert.equal(reparsed.issue,"");assert.deepEqual(reparsed.document,parsed.document);
});
test("unsafe links never become clickable and unsupported source is preserved instead of silently rewritten",()=>{
 for(const url of ["javascript:alert(1)","data:text/html,hi","https://user:secret@example.test","/api/profile"])assert.equal(safeDocumentLink(url),"");assert.equal(safeDocumentLink("https://example.test"),"https://example.test/");
 for(const content of ['<script>alert(1)</script>','![image](https://example.test/pixel.png)','<iframe src="https://example.test"></iframe>','[^1]: Footnote']){const result=parseReportDocument(content);assert.ok(result.issue);assert.equal(result.document,null);}
 assert.equal(unsupportedReportContent('```html\n<img src="example">\n```'),"");
 const result=sanitizeEditorDocument({type:"doc",content:[{type:"text",text:"Safe text",marks:[{type:"link",attrs:{href:"javascript:alert(1)"}},{type:"bold"}]}]});assert.deepEqual(result.content?.[0].marks,[{type:"bold"}]);
 const link=parseReportDocument('[Unsafe](javascript:alert(1))');assert.equal(link.issue,"");assert.doesNotMatch(JSON.stringify(link.document),/javascript/);
});
