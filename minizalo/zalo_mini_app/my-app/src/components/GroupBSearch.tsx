import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import type { Branch, Course, Doctor, MedicalService } from '../../../../backend/src/data/database';
import { ArrowLeftIcon, ClockIcon, CloseIcon, SearchIcon } from './Icons';
import { EntityImage } from './GroupBExtensions';
import '@/css/search.scss';
import { searchText as fold,serviceSearchText } from '@/utils/catalog';

interface GroupBSearchProps {
  services: MedicalService[];
  courses: Course[];
  branches: Branch[];
  doctors: Doctor[];
  userId: string;
  onRequireLogin: () => void;
  isOpen: boolean;
  onClose: () => void;
  onSelectService: (service: MedicalService) => void;
  onSelectCourse: (course: Course) => void;
  onSelectBranch: (branch: Branch) => void;
  onSelectSpecialist: (specialist: Doctor) => void;
  onNavigateCategory: (category: Exclude<Category, 'all'>, query: string) => void;
}
type Category = 'all' | 'service' | 'course' | 'branch' | 'specialist';
type HistoryEntry = { id: string; query: string; lastSearchedAt: string };
const categories: { id: Category; label: string }[] = [
  { id:'all',label:'Tất cả' }, { id:'service',label:'Dịch vụ' }, { id:'course',label:'Khóa học' },
  { id:'branch',label:'Chi nhánh' }, { id:'specialist',label:'Chuyên viên' },
];
const money = (value: number) => Number.isFinite(value) ? `${value.toLocaleString('vi-VN')}đ` : '';

export const GroupBSearch: React.FC<GroupBSearchProps> = ({
  services, courses, branches, doctors, userId, onRequireLogin, isOpen, onClose,
  onSelectService, onSelectCourse, onSelectBranch, onSelectSpecialist, onNavigateCategory,
}) => {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [history, setHistory] = useState<HistoryEntry[]>(() => userId ? apiClient.peek('/search/history')?.history || [] : []);
  const [popular, setPopular] = useState<{query:string}[]>(() => apiClient.peek('/search/popular')?.popularSearches || []);
  const [error, setError] = useState('');
  const [popularError, setPopularError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const generation = useRef(0);
  const revision = useRef(0);
  const queue = useRef(Promise.resolve());
  const lastSaved = useRef('');
  const deferredKeyword = useDeferredValue(keyword);
  const [resultLimit,setResultLimit] = useState(30);
  useEffect(() => setResultLimit(30), [keyword,category]);

  useEffect(() => {
    const current = ++generation.current, version = revision.current;
    setHistory(userId ? apiClient.peek('/search/history')?.history || [] : []); setPopular(apiClient.peek('/search/popular')?.popularSearches || []); setError(''); setPopularError(''); setAuthRequired(false); setBusy(false);
    lastSaved.current = '';
    if (!isOpen) return;
    apiClient.getPopularSearches().then(result => {
      if (current !== generation.current) return;
      if (result?.error || !Array.isArray(result?.popularSearches)) setPopularError('Không thể tải tìm kiếm phổ biến.');
      else setPopular(result.popularSearches);
    });
    if (userId) apiClient.getSearchHistory().then(result => {
      if (current !== generation.current || version !== revision.current) return;
      if (result?.status === 401) setAuthRequired(true);
      else if (result?.error || !Array.isArray(result?.history)) setError(result?.error || 'Không thể tải lịch sử tìm kiếm.');
      else setHistory(result.history);
    });
    return () => { generation.current++; };
  }, [isOpen, userId, refresh]);

  const mutateHistory = (action: () => Promise<any>, savedQuery = '', refreshHistory = true) => {
    if (!userId || authRequired) return Promise.resolve();
    const current = generation.current;
    revision.current++;
    // Start persistence while still mounted. The API queue owns session checks and ordering.
    const mutation = action();
    queue.current = queue.current.then(async () => {
      if (current !== generation.current) return;
      setBusy(true); setError('');
      try {
        const result = await mutation;
        if (current !== generation.current) return;
        if (result?.status === 401) { setAuthRequired(true); setHistory([]); return; }
        if (result?.error || (!result?.entry && result?.deleted !== true)) throw new Error(result?.error || 'Không thể lưu lịch sử tìm kiếm.');
        if (!refreshHistory) { lastSaved.current = savedQuery; return; }
        const updated = await apiClient.getSearchHistory();
        if (current !== generation.current) return;
        if (updated?.status === 401) { setAuthRequired(true); setHistory([]); return; }
        if (updated?.error || !Array.isArray(updated?.history)) throw new Error(updated?.error || 'Không thể tải lịch sử tìm kiếm.');
        setHistory(updated.history);
        lastSaved.current = savedQuery;
        const suggestions = await apiClient.getPopularSearches();
        if (current !== generation.current) return;
        if (suggestions?.error || !Array.isArray(suggestions?.popularSearches)) setPopularError('Không thể tải tìm kiếm phổ biến.');
        else { setPopular(suggestions.popularSearches); setPopularError(''); }
      } catch (failure) {
        if (current === generation.current) setError(failure instanceof Error ? failure.message : 'Không thể lưu lịch sử tìm kiếm.');
      } finally { if (current === generation.current) setBusy(false); }
    });
    return queue.current;
  };
  const commit = (value: string, refreshHistory = true) => {
    const query = value.normalize('NFC').replace(/\s+/g,' ').trim();
    setKeyword(query);
    const key = query.toLocaleLowerCase('vi');
    if (!query || lastSaved.current === key) return Promise.resolve();
    return mutateHistory(() => apiClient.saveSearchHistory(query), key, refreshHistory);
  };

  const items = useMemo(() => [
    ...services.map(record => ({id:record.id,type:'service' as Category,title:record.title,image:record.image,detail:money(record.price),text:serviceSearchText(record),select:()=>onSelectService(record)})),
    ...courses.map(record => ({id:record.id,type:'course' as Category,title:record.title,image:record.image,detail:money(record.price),text:`${record.description || ''} ${record.instructor || ''}`,select:()=>onSelectCourse(record)})),
    ...branches.map(record => ({id:record.id,type:'branch' as Category,title:record.name,image:record.imageUrl,detail:record.address,text:record.address,select:()=>onSelectBranch(record)})),
    ...doctors.map(record => ({id:record.id,type:'specialist' as Category,title:record.name,image:record.avatar,detail:record.title || record.specialty,text:`${record.specialty || ''} ${record.hospital || ''}`,select:()=>onSelectSpecialist(record)})),
  ].map(item => ({...item,search:fold(`${item.title} ${item.text || ''}`)})), [services,courses,branches,doctors,onSelectService,onSelectCourse,onSelectBranch,onSelectSpecialist]);
  const query = fold(deferredKeyword.trim());
  const results = useMemo(() => items.filter(item => (category === 'all' || item.type === category) && item.search.includes(query)), [items,category,query]);
  if (!isOpen) return null;

  return <section className="search-screen" aria-labelledby="search-heading">
    <header className="search-header">
      <button className="search-back" type="button" title="Quay lại" onClick={onClose}><ArrowLeftIcon size={19} /></button>
      <h1 id="search-heading">Bạn đang tìm kiếm điều<br />gì?</h1>
      <form className="search-form" onSubmit={event => { event.preventDefault(); void commit(keyword); }}>
        <button type="submit" className="search-submit" title="Tìm kiếm"><SearchIcon size={19} /></button>
        <input aria-label="Từ khóa tìm kiếm" type="search" enterKeyHint="search" value={keyword} maxLength={160}
          onChange={event => { setKeyword(event.target.value); lastSaved.current = ''; }} placeholder="Tìm dịch vụ, khóa học, chuyên viên..." />
      </form>
      <div className="search-categories" role="group" aria-label="Loại kết quả">
        {categories.map(item => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={async () => {
          if (item.id === 'all') { setCategory('all'); return; }
          void commit(keyword, false);
          onNavigateCategory(item.id, keyword.trim());
        }}>{item.label}</button>)}
      </div>
      <button className="search-clear" type="button" disabled={busy} onClick={() => { setKeyword(''); lastSaved.current = ''; void mutateHistory(() => apiClient.deleteSearchHistory()); }}>Xóa tìm kiếm</button>
    </header>
    <main className="search-content">
      {error && <p className="search-error" role="alert">{error} <button type="button" onClick={() => setRefresh(value => value+1)}>Thử lại</button></p>}
      {(!userId || authRequired) && <button type="button" className="search-login" onClick={onRequireLogin}>Đăng nhập</button>}
      {!query ? <>
        <section aria-labelledby="search-recent-heading"><h2 id="search-recent-heading">Tìm kiếm gần đây</h2>
          <ul className="search-history">{history.map(entry => <li key={entry.id}>
            <button type="button" className="search-history-query" onClick={() => void commit(entry.query)}><ClockIcon size={18} /><span>{entry.query}</span></button>
            <button type="button" className="search-history-remove" title={`Xóa tìm kiếm: ${entry.query}`} disabled={busy} onClick={() => void mutateHistory(() => apiClient.deleteSearchHistory(entry.id))}><CloseIcon size={15} /></button>
          </li>)}</ul>
        </section>
        <section aria-labelledby="search-popular-heading"><h2 id="search-popular-heading">Tìm kiếm phổ biến</h2>
          {popularError && <p className="search-error" role="alert">{popularError} <button type="button" onClick={() => setRefresh(value => value+1)}>Thử lại</button></p>}
          <div className="search-popular">{popular.map(item => <button key={item.query} type="button" onClick={() => void commit(item.query)}>{item.query}</button>)}</div>
        </section>
      </> : <section aria-label="Kết quả tìm kiếm" className="search-results">
        {results.slice(0,resultLimit).map(item => <button key={`${item.type}-${item.id}`} type="button" className="search-result" onClick={() => {
          void commit(keyword, false);
          item.select(); onClose();
        }}>
          <EntityImage src={item.image} alt={item.title} className="search-result-photo" />
          <span className="search-result-copy"><small>{categories.find(value=>value.id===item.type)?.label}</small><strong>{item.title}</strong><span>{item.detail}</span></span>
        </button>)}
        {results.length > resultLimit && <button type="button" className="search-clear" onClick={() => setResultLimit(value => value+30)}>Xem thêm</button>}
      </section>}
    </main>
  </section>;
};
