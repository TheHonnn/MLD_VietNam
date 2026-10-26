import React, {useEffect, useState} from 'react';
import {apiClient} from '@/api/client';
import {searchText} from '@/utils/catalog';
import {EntityImage} from './GroupBExtensions';
import {FileTextIcon} from './Icons';

export interface CareDocument {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
  authorName?: string;
  readTimeMinutes?: number;
  createdAt?: string;
  isPublished?: boolean;
  steps?: unknown[];
}

export function CareDocuments({query, selected, onSelect}: {query: string; selected: string; onSelect: (id: string) => void}) {
  const [items, setItems] = useState<CareDocument[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true); setError(''); setItems([]);
    apiClient.getCareGuidelines(controller.signal).then(result => {
      if (!active) return;
      if (result.error || !Array.isArray(result.guidelines)) {
        setError(result.error || 'Không thể tải cẩm nang.'); return;
      }
      setItems(result.guidelines.filter((item: CareDocument) => item && typeof item.id === 'string' && typeof item.title === 'string' && item.isPublished !== false));
    }).catch(() => {if (active) setError('Không thể tải cẩm nang.');})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false; controller.abort();};
  }, [version]);
  const categories = Array.from(new Set(items.map(item => item.category).filter((value): value is string => Boolean(value))));
  const currentCategory = categories.includes(category) ? category : '';
  const visible = items.filter(item => (!currentCategory || item.category === currentCategory) && searchText([item.title, item.summary, item.authorName, item.category].filter(Boolean).join(' ')).includes(searchText(query)));
  const item = items.find(item => item.id === selected);
  return <>
    {loading && <p role="status">Đang tải cẩm nang...</p>}
    {error && <div role="alert">{error}<button type="button" disabled={loading} onClick={() => setVersion(value => value + 1)}>Thử lại</button></div>}
    {!selected && <>
      <label className="care-document-category">Danh mục<select aria-label="Danh mục cẩm nang" value={currentCategory} onChange={event => setCategory(event.target.value)}><option value="">Tất cả</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
      {visible.map(document => <button type="button" className="record-row community-row care-document-row" key={document.id} onClick={() => onSelect(document.id)}>
        {document.imageUrl ? <EntityImage src={document.imageUrl} alt={document.title} className="shared-content-cover"/> : <FileTextIcon size={24}/>}
        <strong>{document.title}</strong>
      </button>)}
    </>}
    {item && <article className="document-reading">
      {item.imageUrl && <EntityImage src={item.imageUrl} alt={item.title} className="shared-content-cover"/>}
      <h2>{item.title}</h2>
      <p>{[item.category, item.authorName, item.readTimeMinutes != null && Number.isFinite(Number(item.readTimeMinutes)) ? `${item.readTimeMinutes} phút đọc` : ''].filter(Boolean).join(' · ')}</p>
      {item.summary && <p className="record-text">{item.summary}</p>}
      {item.content && <div className="record-text">{item.content}</div>}
      {Array.isArray(item.steps) && <ol className="care-document-steps">{item.steps.map((step, index) => {
        if (typeof step === 'string') return <li key={index}>{step}</li>;
        if (!step || typeof step !== 'object') return null;
        const value = step as Record<string, unknown>;
        const title = typeof value.title === 'string' ? value.title : typeof value.name === 'string' ? value.name : '';
        const content = typeof value.description === 'string' ? value.description : typeof value.content === 'string' ? value.content : typeof value.text === 'string' ? value.text : '';
        return title || content ? <li key={index}>{title && <strong>{title}</strong>}{content && <p>{content}</p>}</li> : null;
      })}</ol>}
    </article>}
    {selected && !loading && !error && !item && <div role="alert">Nội dung không còn khả dụng.<button type="button" onClick={() => onSelect('')}>Quay lại danh sách</button></div>}
  </>;
}
