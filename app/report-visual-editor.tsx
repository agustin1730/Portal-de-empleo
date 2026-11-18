"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {EditorContent,useEditor} from "@tiptap/react";
import {Bold,Italic,List,ListOrdered,ListChecks,Link,Table2,Quote,Code2,Undo2,Redo2,X,Check} from "lucide-react";
import {parseReportDocument,reportEditorExtensions,safeDocumentLink} from "../lib/report-editor-format";
import type {JSONContent} from "@tiptap/core";
import ReportMarkdown from "./report-markdown";
export default function ReportVisualEditor({initialContent,disabled=false,onChange}:{initialContent:string;disabled?:boolean;onChange:(content:string)=>void}){
 const parsed=useMemo(()=>parseReportDocument(initialContent),[initialContent]);
 if(parsed.issue)return <><p className="report-format-notice" role="status">{parsed.issue}</p><ReportMarkdown content={initialContent}/></>;
 return <EditableReport document={parsed.document!} disabled={disabled} onChange={onChange}/>;
}
function EditableReport({document,disabled,onChange}:{document:JSONContent;disabled:boolean;onChange:(content:string)=>void}){
 const changed=useRef(onChange);changed.current=onChange;
 const [linkOpen,setLinkOpen]=useState(false),[link,setLink]=useState(""),[linkError,setLinkError]=useState("");const linkInput=useRef<HTMLInputElement>(null);
 const editor=useEditor({extensions:reportEditorExtensions(),content:document,immediatelyRender:false,shouldRerenderOnTransaction:true,editable:!disabled,editorProps:{attributes:{class:"report-rich-content",role:"textbox","aria-label":"Contenido del informe","aria-multiline":"true"}},onUpdate:({editor})=>changed.current(editor.getMarkdown())});
 useEffect(()=>{editor?.setEditable(!disabled);},[editor,disabled]);
 useEffect(()=>{if(linkOpen)linkInput.current?.focus();},[linkOpen]);
 if(!editor)return <p role="status" className="report-editor-loading">Preparando editor…</p>;
 const action=(label:string,Icon:typeof Bold,run:()=>void,active=false,unavailable=false)=><button type="button" aria-label={label} title={label} aria-pressed={active} disabled={disabled||unavailable} onMouseDown={e=>e.preventDefault()} onClick={run}><Icon size={16}/></button>;
 const level=[1,2,3,4,5,6].find(v=>editor.isActive("heading",{level:v}))||0;
 function applyLink(){const href=safeDocumentLink(link);if(!href){setLinkError("Usá un enlace http o https sin credenciales.");return;}editor!.chain().focus().extendMarkRange("link").setLink({href}).run();setLinkOpen(false);setLinkError("");}
 return <div className="report-visual-editor">
  <div className="report-format-toolbar" role="toolbar" aria-label="Formato del documento">
   <select aria-label="Estilo de texto" value={level} disabled={disabled} onChange={e=>{const value=Number(e.target.value);if(value===0)editor.chain().focus().setParagraph().run();else editor.chain().focus().toggleHeading({level:value as 1|2|3|4|5|6}).run();}}><option value={0}>Texto</option>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{"Título "+v}</option>)}</select>
   <span className="report-tool-divider"/>
   {action("Negrita",Bold,()=>{editor.chain().focus().toggleBold().run();},editor.isActive("bold"))}
   {action("Cursiva",Italic,()=>{editor.chain().focus().toggleItalic().run();},editor.isActive("italic"))}
   <span className="report-tool-divider"/>
   {action("Lista de viñetas",List,()=>{editor.chain().focus().toggleBulletList().run();},editor.isActive("bulletList"))}
   {action("Lista numerada",ListOrdered,()=>{editor.chain().focus().toggleOrderedList().run();},editor.isActive("orderedList"))}
   {action("Checklist",ListChecks,()=>{editor.chain().focus().toggleTaskList().run();},editor.isActive("taskList"))}
   <span className="report-tool-divider"/>
   {action("Enlace",Link,()=>{setLink(editor.getAttributes("link").href||"");setLinkError("");setLinkOpen(v=>!v);},editor.isActive("link"))}
   {action("Insertar tabla",Table2,()=>{editor.chain().focus().insertTable({rows:3,cols:2,withHeaderRow:true}).run();},editor.isActive("table"))}
   {action("Cita",Quote,()=>{editor.chain().focus().toggleBlockquote().run();},editor.isActive("blockquote"))}
   {action("Bloque de código",Code2,()=>{editor.chain().focus().toggleCodeBlock().run();},editor.isActive("codeBlock"))}
   <span className="report-tool-divider"/>
   {action("Deshacer",Undo2,()=>{editor.chain().focus().undo().run();},false,!editor.can().undo())}
   {action("Rehacer",Redo2,()=>{editor.chain().focus().redo().run();},false,!editor.can().redo())}
  </div>
  {linkOpen&&<div className="report-link-editor"><label>Enlace<input ref={linkInput} type="url" aria-label="Dirección del enlace" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://…" onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();applyLink();}if(e.key==="Escape"){e.stopPropagation();setLinkOpen(false);}}}/></label><button type="button" className="button" disabled={disabled} onClick={applyLink}><Check size={15}/>Aplicar</button><button type="button" className="text-button" disabled={disabled} onClick={()=>{editor.chain().focus().unsetLink().run();setLinkOpen(false);}}>Quitar</button><button type="button" className="report-icon-button" aria-label="Cerrar enlace" onClick={()=>setLinkOpen(false)}><X size={16}/></button>{linkError&&<p role="alert" className="form-error">{linkError}</p>}</div>}
  {editor.isActive("table")&&<div className="report-table-tools" role="toolbar" aria-label="Editar tabla">{[{label:"Agregar fila",run:()=>editor.chain().focus().addRowAfter().run()},{label:"Agregar columna",run:()=>editor.chain().focus().addColumnAfter().run()},{label:"Quitar fila",run:()=>editor.chain().focus().deleteRow().run()},{label:"Quitar columna",run:()=>editor.chain().focus().deleteColumn().run()},{label:"Quitar tabla",run:()=>editor.chain().focus().deleteTable().run()}].map(t=><button key={t.label} type="button" disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={t.run}>{t.label}</button>)}</div>}
  <EditorContent editor={editor}/>
 </div>;
}
