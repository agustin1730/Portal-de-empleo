import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
export function safeReportUrl(value:string){try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password?u.href:"";}catch{return "";}}
export default function ReportMarkdown({content}:{content:string}){
 return <div className="report-markdown"><Markdown remarkPlugins={[remarkGfm]} skipHtml urlTransform={safeReportUrl} components={{a:({href,children})=>href?<a href={href} target="_blank" rel="noopener noreferrer">{children}</a>:<span>{children}</span>,img:({alt})=><span>{alt||"Imagen"}</span>}}>{content||"Sin contenido."}</Markdown></div>;
}
