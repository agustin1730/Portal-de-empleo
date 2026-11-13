export type TextItemLike={str:string;transform:number[];width?:number;hasEOL?:boolean};
export function pageText(items:unknown[]){let text="",previousY:number|null=null,previousEnd:number|null=null;
 for(const raw of items){if(!raw||typeof raw!=="object"||!("str" in raw))continue;const item=raw as TextItemLike;if(typeof item.str!=="string")continue;const y=item.transform?.[5]??0,x=item.transform?.[4]??0;
  if(previousY!==null&&Math.abs(y-previousY)>3&&text&&!text.endsWith("\n"))text+="\n";
  else if(text&&!/[\s]$/.test(text)&&item.str&&!/^\s/.test(item.str)&&(previousEnd===null||x-previousEnd>1))text+=" ";
  text+=item.str;if(item.hasEOL&&!text.endsWith("\n"))text+="\n";previousY=y;previousEnd=x+(item.width||0);
 }
 return text;
}
export async function extractPdfText(file:File,onProgress?:(message:string)=>void,signal?:AbortSignal){
 if(file.size>3*1024*1024)throw new Error("El CV debe pesar hasta 3 MB.");
 const bytes=new Uint8Array(await file.arrayBuffer());if(bytes[0]!==37||bytes[1]!==80||bytes[2]!==68||bytes[3]!==70||bytes[4]!==45)throw new Error("Seleccioná un archivo PDF válido.");
 const pdfjs=await import("pdfjs-dist");pdfjs.GlobalWorkerOptions.workerSrc=`/pdf.worker.${pdfjs.version}.min.mjs`;
 if(signal?.aborted)throw new DOMException("Cancelado","AbortError");
 const task=pdfjs.getDocument({data:bytes,enableXfa:false,useSystemFonts:false,useWasm:false,verbosity:0});
 const abort=()=>{void task.destroy();};signal?.addEventListener("abort",abort,{once:true});
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([(async()=>{const pdf=await task.promise;if(pdf.numPages>10)throw new Error("Esta versión admite CV de hasta 10 páginas.");const pages:string[]=[];let count=0;for(let i=1;i<=pdf.numPages;i++){onProgress?.(`Leyendo página ${i} de ${pdf.numPages}…`);const page=await pdf.getPage(i);const content=await page.getTextContent();if(content.items.length>100000)throw new Error("El PDF es demasiado complejo para esta versión.");const value=pageText(content.items);count+=value.length;if(count>80000)throw new Error("El texto del PDF supera el límite de esta versión.");pages.push(value);page.cleanup();}return pages.join("\n\n");})(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error("La lectura tardó demasiado. Probá un PDF más simple, con texto seleccionable.")),30000);})]);}
 catch(error){if(error instanceof Error&&/password/i.test(error.name))throw new Error("El PDF está protegido con contraseña. Subí una copia sin contraseña.");throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener("abort",abort);await task.destroy();}
}
