import React,{useEffect,useRef,useState} from 'react';
import type {PDFDocumentProxy} from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

export default function ReadOnlyPdf({url,title,watermark,onClose}:{url:string;title:string;watermark?:string;onClose:()=>void}){
  const [document,setDocument]=useState<PDFDocumentProxy|null>(null),[page,setPage]=useState(1),[width,setWidth]=useState(300),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const canvas=useRef<HTMLCanvasElement>(null),container=useRef<HTMLDivElement>(null);
  useEffect(()=>{const element=container.current;if(!element)return;const observer=new ResizeObserver(entries=>setWidth(Math.max(100,Math.floor(entries[0].contentRect.width))));observer.observe(element);return()=>observer.disconnect();},[]);
  useEffect(()=>{
    let active=true,task:ReturnType<typeof import('pdfjs-dist/legacy/build/pdf.mjs')['getDocument']>|undefined;
    setError('');setPage(1);setLoading(true);setDocument(null);
    void import('pdfjs-dist/legacy/build/pdf.mjs').then(pdf=>{
      if(!active)return;pdf.GlobalWorkerOptions.workerSrc=workerUrl;
      task=pdf.getDocument({url,enableXfa:false,useSystemFonts:true});
      return task.promise.then(value=>{if(active)setDocument(value);});
    }).catch(()=>{if(active){setError('Không thể đọc PDF. Vui lòng thử lại khi có kết nối.');setLoading(false);}});
    return()=>{active=false;if(task)void task.destroy().catch(()=>{});};
  },[url]);
  useEffect(()=>{
    if(!document||!canvas.current)return;let active=true,render:{cancel:()=>void}|undefined;
    setLoading(true);setError('');
    void document.getPage(page).then(async pdfPage=>{
      if(!active||!canvas.current)return;const element=canvas.current,context=element.getContext('2d');if(!context)throw new Error('Canvas unavailable');
      const ratio=Math.min(window.devicePixelRatio||1,2),base=pdfPage.getViewport({scale:1}),viewport=pdfPage.getViewport({scale:width/base.width*ratio});
      element.width=Math.ceil(viewport.width);element.height=Math.ceil(viewport.height);element.style.width='100%';
      const job=pdfPage.render({canvas:element,canvasContext:context,viewport});render=job;await job.promise;if(!active)return;
      if(watermark){context.save();context.translate(element.width/2,element.height/2);context.rotate(-Math.PI/6);context.globalAlpha=.18;context.fillStyle='#164e63';context.font=`${Math.max(13,element.width/25)}px sans-serif`;context.textAlign='center';context.fillText(watermark.slice(0,150),0,0,element.width*.85);context.restore();}
      setLoading(false);
    }).catch(failure=>{if(active&&failure?.name!=='RenderingCancelledException'){setError('Không thể hiển thị trang PDF.');setLoading(false);}});
    return()=>{active=false;render?.cancel();};
  },[document,page,width,watermark]);
  return <section role="dialog" aria-modal="true" aria-label={title} className="mobile-overlay"><header className="mobile-page-header"><button type="button" onClick={onClose}>Quay lại</button><h2>{title}</h2></header><div className="mobile-body" ref={container} onContextMenu={event=>event.preventDefault()}>{loading&&<p role="status">Đang mở tài liệu...</p>}{error&&<p role="alert">{error}</p>}<canvas ref={canvas} aria-label={`Trang ${page}`} role="img"/>{document&&<nav aria-label="Trang tài liệu" className="flex items-center justify-between gap-3 py-4"><button type="button" disabled={page<=1||loading} onClick={()=>setPage(value=>value-1)}>Trang trước</button><span>{page}/{document.numPages}</span><button type="button" disabled={page>=document.numPages||loading} onClick={()=>setPage(value=>value+1)}>Trang sau</button></nav>}</div></section>;
}
