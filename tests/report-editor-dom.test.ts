import test from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {Editor} from "@tiptap/core";
import {parseReportDocument,reportEditorExtensions} from "../lib/report-editor-format.ts";
test("real editor commands format text, persist checkbox changes and edit tables without exposing raw HTML",async()=>{
 const dom=new JSDOM('<!doctype html><html><body><div id="editor"></div></body></html>',{url:"https://portal.test",pretendToBeVisual:true});
 const values:Record<string,unknown>={window:dom.window,document:dom.window.document,navigator:dom.window.navigator,Node:dom.window.Node,HTMLElement:dom.window.HTMLElement,DOMParser:dom.window.DOMParser,MutationObserver:dom.window.MutationObserver,getComputedStyle:dom.window.getComputedStyle.bind(dom.window),requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window)};
 const previous=new Map<string,PropertyDescriptor|undefined>();for(const [name,value] of Object.entries(values)){previous.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});}
 let editor:Editor|undefined;
 try{
  editor=new Editor({element:dom.window.document.getElementById("editor")!,extensions:reportEditorExtensions(),content:parseReportDocument("Example").document!});
  editor.commands.setTextSelection({from:1,to:8});assert.equal(editor.commands.toggleBold(),true);assert.match(editor.getMarkdown(),/\*\*Example\*\*/);assert.equal(editor.commands.undo(),true);assert.doesNotMatch(editor.getMarkdown(),/\*\*/);assert.equal(editor.commands.redo(),true);
  editor.commands.setContent('- [ ] Pending',{contentType:"markdown"});const checkbox=dom.window.document.querySelector('input[type="checkbox"]') as HTMLInputElement;assert.ok(checkbox);checkbox.click();assert.match(editor.getMarkdown(),/\[x\]/);
  editor.commands.setContent("",{contentType:"markdown"});assert.equal(editor.commands.insertTable({rows:2,cols:2,withHeaderRow:true}),true);assert.equal(editor.commands.addRowAfter(),true);assert.ok(editor.getHTML().includes("<table"));assert.equal(editor.commands.deleteColumn(),true);const tableMarkdown=editor.getMarkdown();assert.equal(parseReportDocument(tableMarkdown).issue,"");
  editor.commands.setContent('| A | B |\n| --- | --- |\n| First<br>Second | Text |',{contentType:"markdown"});const multiline=editor.getMarkdown();assert.equal(parseReportDocument(multiline).issue,"");assert.match(multiline,/First/);assert.match(multiline,/Second/);
  editor.commands.setContent('<p><a href="javascript:alert(1)" onclick="alert(1)">Unsafe</a><img src="https://example.test/pixel.png"></p><script>alert(1)</script>');assert.doesNotMatch(editor.getHTML(),/javascript:|onclick|<img|<script/);
 }finally{editor?.destroy();dom.window.close();for(const [name,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else Reflect.deleteProperty(globalThis,name);}}
});
