import React,{useEffect,useState} from 'react';
import {apiClient} from '@/api/client';

const numberText=(value:unknown)=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value).toLocaleString('vi-VN'):'';
const dateText=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'';

// Read-only account records; this screen never creates a payment.
export function AccountActivity({tab,entityId,onBack}:{tab:'points'|'payments';entityId?:string;onBack:()=>void}){
  const [items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true;const epoch=apiClient.sessionVersion();setLoading(true);setError('');setItems([]);
    apiClient.invalidateReadPaths(['/transactions']);
    void apiClient.getTransactions().then(result=>{
      if(!active||epoch!==apiClient.sessionVersion())return;
      const rows=tab==='points'?result?.pointTransactions:result?.invoices;
      if(Array.isArray(rows))setItems(rows);else setError(result?.error||'Không thể tải dữ liệu. Vui lòng thử lại.');
    }).finally(()=>{if(active&&epoch===apiClient.sessionVersion())setLoading(false);});
    return()=>{active=false;};
  },[tab,revision]);
  useEffect(()=>{const refresh=()=>setRevision(v=>v+1);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);};},[]);
  useEffect(()=>{if(!loading&&entityId)document.getElementById(`account-record-${entityId}`)?.scrollIntoView({block:'center'});},[loading,entityId,items]);
  return <section><header className="mobile-page-header"><button type="button" onClick={onBack}>Quay lại</button><h1>{tab==='points'?'Điểm thưởng':'Hóa đơn'}</h1></header><main className="mobile-body" aria-busy={loading}>{loading&&<p role="status">Đang tải...</p>}{error&&<p role="alert">{error}<button type="button" onClick={()=>setRevision(v=>v+1)}>Thử lại</button></p>}{items.map(item=><article id={`account-record-${item.id}`} key={item.id} className="mobile-card p-4" aria-current={item.id===entityId?'true':undefined}><h2>{tab==='points'?item.description:item.title}</h2>{tab==='points'?<p>{numberText(item.points)}</p>:<><p>{item.code}</p><p>{numberText(item.finalAmount)}{numberText(item.finalAmount)&&'đ'}</p><p>{item.branchName}</p></>}<p>{dateText(item.createdAt)}</p></article>)}</main></section>;
}
