import React,{useEffect,useRef,useState} from 'react';
import {apiClient} from '@/api/client';
import {useBackAction} from '@/hooks/useNavigationHistory';
import {AcademyHeader,academyDate} from './AcademyViews';
import {QRCode} from './QRCode';

export type IssuedCertificate={id:string;enrollmentId:string;courseId:string;status:string;certificateCode:string;studentName:string;studentDateOfBirth?:string|null;courseTitle:string;issueDate:string;finalGrade?:string;certificatePdfUrl?:string|null;qrVerificationCode?:string|null;revocationReason?:string|null};
const pdfLink=(value?:string|null)=>{
  try{const url=new URL(value||'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:undefined;}
  catch{return undefined;}
};
export function CertificateDetails({certificate}:{certificate:IssuedCertificate}){
  const issued=certificate.status==='ISSUED',pdf=issued?pdfLink(certificate.certificatePdfUrl):undefined;
  return <section className="academy-certificate-details" aria-label="Thông tin giấy chứng nhận">
    <span className="academy-status">{issued?'Đã cấp':'Đã thu hồi'}</span>
    <h2>{certificate.courseTitle}</h2><p>{certificate.studentName}</p>
    {certificate.studentDateOfBirth&&<p>Ngày sinh: {academyDate(certificate.studentDateOfBirth)}</p>}
    <p>Mã giấy chứng nhận: {certificate.certificateCode}</p><p>Ngày cấp: {academyDate(certificate.issueDate)}</p>
    {certificate.finalGrade&&<p>{certificate.finalGrade}</p>}
    {!issued&&certificate.revocationReason&&<p>{certificate.revocationReason}</p>}
    {pdf&&<a href={pdf} target="_blank" rel="noopener noreferrer" className="academy-outline">Mở giấy chứng nhận PDF</a>}
    {issued&&certificate.qrVerificationCode?.trim()&&<div className="academy-certificate-qr"><QRCode value={certificate.qrVerificationCode}/><p>{certificate.qrVerificationCode}</p></div>}
  </section>;
}

export function AcademyCertificates({userId,initialCertificateId,onBack,onRequireLogin}:{userId:string;initialCertificateId?:string;onBack:()=>void;onRequireLogin:()=>void}){
  const [items,setItems]=useState<IssuedCertificate[]>([]),[cursor,setCursor]=useState<string|null>(null),[page,setPage]=useState<string|null>(null),[version,setVersion]=useState(0);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[authRequired,setAuthRequired]=useState(false);
  const [selectedId,setSelectedId]=useState(initialCertificateId||''),[selected,setSelected]=useState<IssuedCertificate|null>(null),[detailLoading,setDetailLoading]=useState(false),[detailError,setDetailError]=useState(''),[detailVersion,setDetailVersion]=useState(0);
  const lock=useRef(false);
  const closeDetail=()=>{setSelectedId('');setPage(null);setVersion(value=>value+1);};
  useBackAction(Boolean(selectedId),closeDetail,2);
  useEffect(()=>{setSelectedId(initialCertificateId||'');},[initialCertificateId]);
  useEffect(()=>{
    let active=true;const controller=new AbortController();lock.current=true;setLoading(true);setError('');setAuthRequired(false);
    if(!userId){setItems([]);setAuthRequired(true);setLoading(false);lock.current=false;return;}
    apiClient.getCertificates(page||undefined,controller.signal).then(result=>{
      if(!active)return;
      if(result?.status===401){setAuthRequired(true);setItems([]);return;}
      if(!Array.isArray(result?.certificates)||(result.nextCursor!==null&&typeof result.nextCursor!=='string')||(result.nextCursor&&result.nextCursor===page)){setError(result?.error||'Không thể tải giấy chứng nhận.');return;}
      setItems(current=>page?[...new Map([...current,...result.certificates].map(item=>[item.id,item])).values()]:result.certificates);
      setCursor(result.nextCursor);
    }).catch(()=>{if(active)setError('Không thể tải giấy chứng nhận. Vui lòng thử lại.');}).finally(()=>{if(active){setLoading(false);lock.current=false;}});
    return()=>{active=false;controller.abort();};
  },[userId,page,version]);
  useEffect(()=>{
    setSelected(current=>current?.id===selectedId?current:null);setDetailError('');setDetailLoading(Boolean(selectedId&&selected?.id!==selectedId));
    if(!selectedId)return;
    let active=true;const controller=new AbortController();
    apiClient.getCertificate(selectedId,controller.signal).then(result=>{
      if(!active)return;
      if(result?.status===401){setAuthRequired(true);setItems([]);return;}
      if(result?.certificate?.id!==selectedId){setDetailError(result?.error||'Giấy chứng nhận không còn khả dụng.');return;}
      setSelected(result.certificate);
    }).catch(()=>{if(active)setDetailError('Không thể tải giấy chứng nhận. Vui lòng thử lại.');}).finally(()=>{if(active)setDetailLoading(false);});
    return()=>{active=false;controller.abort();};
  },[userId,selectedId,detailVersion]);
  useEffect(()=>{
    if(!selectedId)return;
    const refresh=()=>{if(!document.hidden)setDetailVersion(value=>value+1);};
    const timer=window.setInterval(refresh,30000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[selectedId]);
  return <>
    <AcademyHeader title="Giấy chứng nhận" onBack={()=>selectedId?closeDetail():onBack()}/>
    <main className="academy-body academy-certificates">
      {authRequired?<button type="button" className="academy-primary" onClick={onRequireLogin}>Đăng nhập nhân viên</button>:selectedId?<>
        {detailLoading&&<p role="status">Đang tải giấy chứng nhận...</p>}
        {detailError&&<p role="alert">{detailError} <button type="button" className="academy-outline" onClick={()=>setDetailVersion(value=>value+1)}>Thử lại</button></p>}
        {selected?.id===selectedId&&!detailLoading&&!detailError&&<CertificateDetails certificate={selected}/>}
      </>:<>
        {error&&<p role="alert">{error} <button type="button" className="academy-outline" disabled={loading} onClick={()=>setVersion(value=>value+1)}>Thử lại</button></p>}
        {items.map(item=><article className="academy-enrollment" key={item.id}><span className="academy-status">{item.status==='ISSUED'?'Đã cấp':'Đã thu hồi'}</span><h2>{item.courseTitle}</h2><p>{item.certificateCode}</p><p>{academyDate(item.issueDate)}</p><button type="button" className="academy-outline" onClick={()=>setSelectedId(item.id)}>Xem giấy chứng nhận</button></article>)}
        {loading&&<p role="status">Đang tải giấy chứng nhận...</p>}
        {cursor&&!error&&<button type="button" className="academy-outline" disabled={loading} onClick={()=>{if(!lock.current){lock.current=true;setPage(cursor);}}}>Xem thêm</button>}
      </>}
    </main>
  </>;
}
