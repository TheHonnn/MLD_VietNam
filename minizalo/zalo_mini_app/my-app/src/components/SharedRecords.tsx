import React,{useEffect,useRef,useState} from 'react';
import {apiClient} from '@/api/client';
import {useBackAction} from '@/hooks/useNavigationHistory';
import {ArrowLeftIcon,FileTextIcon,SearchIcon} from './Icons';
import {EntityImage} from './GroupBExtensions';
import '@/css/shared-records.scss';

export type StaffRecordCustomer={id:string;fullName:string;phone:string|null;dateOfBirth?:string|null};
type Customer=StaffRecordCustomer;
type Document={id:string;title:string;courseTitle?:string;chapterTitle?:string;summary?:string;imageUrl?:string;authorName?:string;publishedAt?:string;contentText?:string;attachments?:{url:string;name:string}[]};
type RecordEntry={id:string;title?:string;serviceId?:string;bookingCode?:string;date?:string;startTime?:string;endTime?:string;status?:string;branchName?:string;technicianName?:string;recipientName?:string;treatmentNotes?:string;conditionBefore?:string;conditionAfter?:string;specialistAdvice?:string;totalSessions?:number;completedSessions?:number;reservedSessions?:number;remainingSessions?:number;expiresAt?:string};
type BookPackage=(customer:Customer,serviceId:string,ownedPackage:{id:string;name:string})=>void;
const date=(value?:string|null)=>value?new Date(value).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'';
const status=(value?:string)=>({PENDING:'Chờ xác nhận',CONFIRMED:'Đã xác nhận',CHECKED_IN:'Đã đến',IN_SERVICE:'Đang trị liệu',COMPLETED:'Hoàn thành',CANCELLED:'Đã hủy',NO_SHOW:'Không đến',ACTIVE:'Đang sử dụng',EXPIRED:'Hết hạn',USED_UP:'Đã dùng hết'}[value||'']||value||'');
function Header({title,onBack}:{title:string;onBack:()=>void}){return <header className="shared-records-header"><button type="button" title="Quay lại" onClick={onBack}><ArrowLeftIcon size={20}/></button><h1>{title}</h1></header>;}
function useSearch(){
  const [value,setValue]=useState(''),[query,setQuery]=useState('');
  useEffect(()=>{const timer=window.setTimeout(()=>setQuery(value.trim()),300);return()=>clearTimeout(timer);},[value]);
  return {value,setValue,query};
}
function usePages<T extends {id:string}>(read:(cursor:string|undefined,signal:AbortSignal)=>Promise<any>,field:string){
  const [items,setItems]=useState<T[]>([]),[cursor,setCursor]=useState<string|null>(null),[page,setPage]=useState<string|null>(null),[version,setVersion]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const lock=useRef(false);
  useEffect(()=>{
    let active=true;const controller=new AbortController();lock.current=true;setLoading(true);setError('');
    read(page||undefined,controller.signal).then(result=>{
      if(!active)return;
      if([401,403,404].includes(result?.status)){setItems([]);setCursor(null);}
      if(!Array.isArray(result?.[field])||(result.nextCursor!==null&&typeof result.nextCursor!=='string')||(result.nextCursor&&result.nextCursor===page)){setError(result?.error||'Không thể tải dữ liệu.');return;}
      setItems(current=>page?[...new Map([...current,...result[field]].map(item=>[item.id,item])).values()]:result[field]);setCursor(result.nextCursor);
    }).catch(()=>{if(active)setError('Không thể tải dữ liệu. Vui lòng thử lại.');}).finally(()=>{if(active){lock.current=false;setLoading(false);}});
    return()=>{active=false;controller.abort();};
  },[page,version]);
  useEffect(()=>{
    const refresh=()=>{if(!document.hidden){setItems([]);setCursor(null);setPage(null);setVersion(value=>value+1);}};
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  return {items,loading,error,cursor,retry:()=>setVersion(value=>value+1),more:()=>{if(!lock.current&&cursor){lock.current=true;setPage(cursor);}}};
}
function PageState({state}:{state:ReturnType<typeof usePages>}){return <>
  {state.loading&&<p role="status">Đang tải...</p>}
  {state.error&&<div role="alert">{state.error}<button type="button" disabled={state.loading} onClick={state.retry}>Thử lại</button></div>}
  {!state.error&&state.cursor&&<button className="records-more" type="button" disabled={state.loading} onClick={state.more}>Xem thêm</button>}
</>;}
function DocumentsList({query,onSelect,kind}:{query:string;onSelect:(id:string)=>void;kind?:'COMMUNITY'|'DOCUMENT'}){
  const state=usePages<Document>((cursor,signal)=>kind?apiClient.getSharedContent(kind,query,cursor,signal):apiClient.getDocuments(query,cursor,signal),kind?'items':'documents');
  return <>{state.items.map(item=><button key={item.id} className={`record-row ${kind==='COMMUNITY'?'community-row':''}`} type="button" onClick={()=>onSelect(item.id)}>{item.imageUrl?<EntityImage src={item.imageUrl} alt={item.title} className="shared-content-cover"/>:<FileTextIcon size={22}/>}<span><strong>{item.title}</strong><small>{[item.courseTitle,item.chapterTitle,item.summary].filter(Boolean).join(' · ')}</small>{item.authorName&&<small>{item.authorName} · {date(item.publishedAt)}</small>}</span></button>)}<PageState state={state}/></>;
}
function DocumentDetail({id,shared=false}:{id:string;shared?:boolean}){
  const [item,setItem]=useState<Document|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0);
  useEffect(()=>{
    let active=true;const controller=new AbortController();setLoading(true);setItem(null);setError('');
    (shared?apiClient.getSharedContentItem(id,controller.signal):apiClient.getDocument(id,controller.signal)).then(result=>{if(!active)return;const record=shared?result?.item:result?.document;if(record?.id===id)setItem(record);else setError(result?.error||'Không thể mở nội dung.');}).catch(()=>{if(active)setError('Không thể mở nội dung.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;controller.abort();};
  },[id,version,shared]);
  useEffect(()=>{
    const refresh=()=>{if(!document.hidden)setVersion(value=>value+1);};
    const timer=window.setInterval(refresh,30000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  return <>{loading&&<p role="status">Đang mở nội dung...</p>}{error&&<div role="alert">{error}<button type="button" onClick={()=>setVersion(value=>value+1)}>Thử lại</button></div>}{item&&<article className="document-reading">{item.imageUrl&&<EntityImage src={item.imageUrl} alt={item.title} className="shared-content-cover"/>}<h2>{item.title}</h2><p>{[item.courseTitle,item.chapterTitle,item.summary].filter(Boolean).join(' · ')}</p>{item.authorName&&<p>{item.authorName} · {date(item.publishedAt)}</p>}<div className="record-text">{item.contentText}</div>{item.attachments?.map((file,index)=><a key={file.url+index} href={file.url} target="_blank" rel="noopener noreferrer"><FileTextIcon size={18}/>{file.name}</a>)}</article>}</>;
}
export function DocumentLibrary({onBack}:{onBack:()=>void}){
  const {value,setValue,query}=useSearch(),[selected,setSelected]=useState(''),[source,setSource]=useState<'course'|'shared'>('course');
  useBackAction(Boolean(selected),()=>setSelected(''),2);
  return <section className="shared-records document-library"><Header title="Tài liệu" onBack={()=>selected?setSelected(''):onBack()}/>{selected?<DocumentDetail key={source+selected} id={selected} shared={source==='shared'}/>:<><div className="records-tabs records-tabs--two" role="tablist" aria-label="Nguồn tài liệu">{[['course','Khóa học'],['shared','Được chia sẻ']].map(([key,label])=><button key={key} type="button" role="tab" aria-selected={source===key} onClick={()=>setSource(key as typeof source)}>{label}</button>)}</div><label className="records-search"><SearchIcon size={20}/><input aria-label="Tìm tài liệu" value={value} maxLength={150} placeholder="Tìm tài liệu, khóa học..." onChange={event=>setValue(event.target.value)}/></label><DocumentsList key={source+query} query={query} onSelect={setSelected} kind={source==='shared'?'DOCUMENT':undefined}/></>}</section>;
}
export function Community({onBack}:{onBack:()=>void}){
  const {value,setValue,query}=useSearch(),[selected,setSelected]=useState('');
  useBackAction(Boolean(selected),()=>setSelected(''),2);
  return <section className="shared-records community"><Header title="Cộng đồng" onBack={()=>selected?setSelected(''):onBack()}/>{selected?<DocumentDetail key={selected} id={selected} shared/>:<><label className="records-search"><SearchIcon size={20}/><input aria-label="Tìm bài viết" value={value} maxLength={150} placeholder="Tìm bài viết..." onChange={event=>setValue(event.target.value)}/></label><DocumentsList key={query} query={query} onSelect={setSelected} kind="COMMUNITY"/></>}</section>;
}
function CustomerHistory({customer,section,onAppointment,onBookPackage}:{customer:Customer;section:string;onAppointment:(id:string)=>void;onBookPackage:BookPackage}){
  const state=usePages<RecordEntry>((cursor,signal)=>apiClient.getStaffCustomerRecords(customer.id,section,cursor,signal),'records');
  return <>{state.items.map(item=><article className="customer-record" key={item.id}>
    {item.title&&<h2>{item.title}</h2>}{item.bookingCode&&<h2>{item.bookingCode}</h2>}
    {item.date&&<p>{date(item.date)}{item.startTime&&` · ${item.startTime}–${item.endTime}`}</p>}
    {item.recipientName&&<p>Người trị liệu / đại diện nhóm: {item.recipientName}</p>}{item.branchName&&<p>{item.branchName}</p>}{item.technicianName&&<p>{item.technicianName}</p>}{item.status&&<p>{status(item.status)}</p>}
    {section==='appointments'&&<button type="button" onClick={()=>onAppointment(item.id)}>Xem lịch hẹn</button>}
    {section==='treatments'&&<dl>{[['Trước trị liệu',item.conditionBefore],['Nội dung trị liệu',item.treatmentNotes],['Sau trị liệu',item.conditionAfter],['Lời dặn',item.specialistAdvice]].map(([label,value])=>value?<React.Fragment key={label}><dt>{label}</dt><dd>{value}</dd></React.Fragment>:null)}</dl>}
    {section==='packages'&&<><p>{item.completedSessions}/{item.totalSessions} buổi đã dùng · {item.reservedSessions} buổi đã đặt</p><p>Còn {item.remainingSessions} buổi · Hạn dùng {date(item.expiresAt)}</p><button type="button" disabled={item.status!=='ACTIVE'||!item.serviceId||!item.remainingSessions||!item.expiresAt||Date.parse(item.expiresAt)<=Date.now()} onClick={()=>onBookPackage(customer,item.serviceId!,{id:item.id,name:item.title||''})}>Đặt buổi tiếp theo</button></>}
  </article>)}<PageState state={state}/></>;
}
export function StaffCustomers({onBack,onAppointment,onBookPackage}:{onBack:()=>void;onAppointment:(id:string)=>void;onBookPackage:BookPackage}){
  const {value,setValue,query}=useSearch(),[items,setItems]=useState<Customer[]>([]),[selected,setSelected]=useState<Customer|null>(null),[section,setSection]=useState('appointments'),[loading,setLoading]=useState(false),[error,setError]=useState(''),[version,setVersion]=useState(0);
  useBackAction(Boolean(selected),()=>setSelected(null),2);
  useEffect(()=>{
    setItems([]);setError('');setLoading(false);if(query.length<2||selected)return;
    let active=true;const controller=new AbortController();setLoading(true);
    apiClient.getStaffCustomers(query,controller.signal).then(result=>{if(!active)return;if(Array.isArray(result?.customers))setItems(result.customers);else setError(result?.error||'Không thể tìm khách.');}).catch(()=>{if(active)setError('Không thể tìm khách.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;controller.abort();};
  },[query,selected,version]);
  return <section className="shared-records staff-customers"><Header title={selected?selected.fullName:'Hồ sơ khách hàng'} onBack={()=>selected?setSelected(null):onBack()}/>{selected?<><p>{selected.phone}</p><div className="records-tabs" role="tablist" aria-label="Hồ sơ khách hàng">{[['appointments','Lịch hẹn'],['treatments','Trị liệu'],['packages','Liệu trình']].map(([key,label])=><button key={key} role="tab" aria-selected={section===key} type="button" onClick={()=>setSection(key)}>{label}</button>)}</div><CustomerHistory key={selected.id+section} customer={selected} section={section} onAppointment={onAppointment} onBookPackage={onBookPackage}/></>:<><label className="records-search"><SearchIcon size={20}/><input aria-label="Tìm hồ sơ khách" value={value} maxLength={150} placeholder="Số điện thoại hoặc họ tên đầy đủ" onChange={event=>setValue(event.target.value)}/></label>{items.map(item=><button className="record-row" type="button" key={item.id} onClick={()=>{setSelected(item);setSection('appointments');}}><span><strong>{item.fullName}</strong><small>{item.phone}</small></span></button>)}{loading&&<p role="status">Đang tìm khách...</p>}{error&&<div role="alert">{error}<button type="button" onClick={()=>setVersion(value=>value+1)}>Thử lại</button></div>}</>}</section>;
}
