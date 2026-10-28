import React,{useState} from 'react';
import type {Branch} from '../../../../backend/src/data/database';
import {searchText} from '@/utils/catalog';
import {useBackAction} from '@/hooks/useNavigationHistory';
export function BranchChooser({branches,value,onChange}:{branches:Branch[];value:string;onChange:(id:string)=>void}){
  const [open,setOpen]=useState(false),[query,setQuery]=useState('');
  useBackAction(open,()=>setOpen(false),2);
  return <><button type="button" className="mobile-branch-button" aria-haspopup="dialog" onClick={()=>setOpen(true)}><span>Chi nhánh trị liệu hiện tại</span><strong>{branches.find(b=>b.id===value)?.name}</strong></button>{open&&<div className="mobile-sheet-backdrop" onClick={()=>setOpen(false)}><section role="dialog" aria-modal="true" aria-label="Chọn chi nhánh" className="mobile-sheet" onClick={e=>e.stopPropagation()}><header className="mobile-section-heading"><h2>Chọn chi nhánh</h2><button type="button" onClick={()=>setOpen(false)}>Đóng</button></header><label className="mobile-field">Tìm chi nhánh<input autoFocus value={query} maxLength={150} onChange={e=>setQuery(e.target.value)}/></label>{branches.filter(b=>searchText(b.name+' '+b.address).includes(searchText(query))).map(b=><button type="button" key={b.id} aria-pressed={b.id===value} className="mobile-list-card" onClick={()=>{onChange(b.id);setOpen(false);}}><span><strong>{b.name}</strong><small>{b.address}</small></span></button>)}</section></div>}</>;
}
