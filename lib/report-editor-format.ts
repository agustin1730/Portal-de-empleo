import StarterKit from "@tiptap/starter-kit";
import {Markdown,MarkdownManager} from "@tiptap/markdown";
import {TableKit} from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import type {JSONContent} from "@tiptap/core";
export function safeDocumentLink(value:string){try{const url=new URL(value);return ["https:","http:"].includes(url.protocol)&&!url.username&&!url.password?url.href:"";}catch{return "";}}
export function reportEditorExtensions(){return [StarterKit.configure({underline:false,link:{openOnClick:false,autolink:true,isAllowedUri:(url:string)=>!!safeDocumentLink(url),HTMLAttributes:{target:"_blank",rel:"noopener noreferrer"}}}),TableKit.configure({table:{resizable:false}}),TaskList,TaskItem.configure({nested:true}),Markdown.configure({markedOptions:{gfm:true,breaks:false}})];}
export function reportMarkdownManager(){return new MarkdownManager({extensions:reportEditorExtensions(),markedOptions:{gfm:true}});}
export function unsupportedReportContent(content:string,manager=reportMarkdownManager()){
 let unsupported=false;const tokens=manager.instance.lexer(content);manager.instance.walkTokens(tokens,token=>{if(token.type==="image"||token.type==="html"&&!/^<(?:br|hr)\s*\/?>$/i.test(token.raw.trim()))unsupported=true;});
 return unsupported||/^\[\^[^\]]+\]:/m.test(content)?"Este documento contiene HTML, imágenes o notas al pie que el editor visual no puede conservar. Podés cambiar sus propiedades y descargar el original; el contenido se mantiene intacto.":"";
}
export function sanitizeEditorDocument(doc:JSONContent):JSONContent{
 return {...doc,...doc.marks?{marks:doc.marks.filter(mark=>mark.type!=="link"||!!safeDocumentLink(String(mark.attrs?.href||"")))}:{},...doc.content?{content:doc.content.map(sanitizeEditorDocument)}:{}};
}
export function parseReportDocument(content:string){const manager=reportMarkdownManager(),issue=unsupportedReportContent(content,manager);return {issue,document:issue?null:sanitizeEditorDocument(manager.parse(content))};}
