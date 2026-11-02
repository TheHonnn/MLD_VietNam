import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Printer, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { adminApi } from '../admin/api';
import { toast } from '../components/common';

type ProductGroup = 'Dụng cụ tập luyện' | 'Băng ép' | 'Chăm sóc da' | 'Tài liệu';
interface HomeProduct { id: string; name: string; category: ProductGroup; price_min: number; price_max: number; unit: string; details: string[]; sort_order: number; }
const groups = ['Tất cả', 'Dụng cụ tập luyện', 'Băng ép', 'Chăm sóc da', 'Tài liệu'] as const;
const money = new Intl.NumberFormat('vi-VN');
const emptyForm = { name: '', category: 'Dụng cụ tập luyện' as ProductGroup, price_min: '', price_max: '', unit: '', details: '', sort_order: '100' };
const formatPrice = (product: HomeProduct) => product.price_min === product.price_max ? `${money.format(product.price_min)} đ` : `${money.format(product.price_min)} - ${money.format(product.price_max)} đ`;

export const W19_HomeProducts: React.FC = () => {
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [group, setGroup] = useState<(typeof groups)[number]>('Tất cả');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<HomeProduct | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const data = await adminApi<any>('home_products?limit=200&page=1&sort=sort_order&direction=asc');
      setProducts((data?.rows || []).map((row: any) => ({ ...row, price_min: Number(row.price_min), price_max: Number(row.price_max), details: Array.isArray(row.details) ? row.details : [] })));
    } catch (error: any) { toast.error('Không tải được danh mục sản phẩm', error?.message || 'Hãy kiểm tra migration home_products đã được áp dụng.'); }
  };
  useEffect(() => { void load(); }, []);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return products.filter((product) => (group === 'Tất cả' || product.category === group) && (!query || [product.name, product.category, ...product.details].join(' ').toLocaleLowerCase('vi').includes(query)));
  }, [products, group, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (product: HomeProduct) => { setEditing(product); setForm({ name: product.name, category: product.category, price_min: String(product.price_min), price_max: String(product.price_max), unit: product.unit, details: product.details.join('\n'), sort_order: String(product.sort_order) }); setShowForm(true); };
  const update = (key: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const min = Number(form.price_min), max = Number(form.price_max || form.price_min);
    if (!form.name.trim() || !form.unit.trim() || !Number.isFinite(min) || min < 0 || !Number.isFinite(max) || max < min) { toast.error('Thông tin sản phẩm chưa hợp lệ', 'Nhập tên, đơn vị và khoảng giá hợp lệ.'); return; }
    setBusy(true);
    try {
      const values = { name: form.name.trim(), category: form.category, price_min: min, price_max: max, unit: form.unit.trim(), details: form.details.split('\n').map((item) => item.trim()).filter(Boolean), sort_order: Number(form.sort_order) || 100 };
      if (editing) await adminApi('home_products/update', { key: { id: editing.id }, values });
      else await adminApi('home_products/create', { values });
      toast.success(editing ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm'); setShowForm(false); await load();
    } catch (error: any) { toast.error('Không thể lưu sản phẩm', error?.message || 'Database chưa xác nhận thay đổi.'); } finally { setBusy(false); }
  };
  const remove = async (product: HomeProduct) => {
    if (!window.confirm(`Xóa sản phẩm “${product.name}”?`)) return;
    try { await adminApi('home_products/delete', { key: { id: product.id } }); toast.success('Đã xóa sản phẩm'); await load(); } catch (error: any) { toast.error('Không thể xóa sản phẩm', error?.message); }
  };

  return <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200 pb-5">
      <div className="flex min-w-0 items-center gap-4"><img src="/logo_mld.png" alt="MLD Việt Nam" className="h-14 w-14 shrink-0 object-contain" /><div><p className="text-xs font-bold uppercase text-rose-700">MLD Việt Nam</p><h1 className="mt-1 text-2xl font-extrabold text-gray-900">Sản phẩm bổ trợ tại nhà</h1><p className="mt-1 text-sm text-gray-600">Quản lý bảng giá, đơn vị và thương hiệu sản phẩm</p></div></div>
      <div className="flex gap-2 print:hidden"><button type="button" onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-md bg-rose-700 px-3 text-sm font-semibold text-white hover:bg-rose-800"><Plus className="h-4 w-4" />Thêm sản phẩm</button><button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Printer className="h-4 w-4" />In bảng giá</button></div>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4" />Giá niêm yết đã bao gồm 10% VAT</div><div className="relative w-full sm:max-w-xs print:hidden"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="search" aria-label="Tìm sản phẩm" placeholder="Tìm sản phẩm hoặc thương hiệu..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" /></div></div>
    <nav aria-label="Nhóm sản phẩm" className="flex gap-2 overflow-x-auto border-b border-gray-200 print:hidden">{groups.map((item) => <button key={item} type="button" aria-pressed={group === item} onClick={() => setGroup(item)} className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold ${group === item ? 'border-rose-600 text-rose-700' : 'border-transparent text-gray-500'}`}>{item}</button>)}</nav>
    <section aria-label="Bảng giá sản phẩm" className="overflow-hidden border border-rose-200 bg-white"><div className="grid grid-cols-[minmax(0,1fr)_76px_58px_58px] gap-2 bg-rose-50 px-3 py-3 text-[10px] font-extrabold uppercase text-rose-700 sm:grid-cols-[minmax(0,1fr)_minmax(125px,190px)_minmax(95px,145px)_80px] sm:px-6 sm:text-xs"><span>Tên sản phẩm</span><span className="text-right sm:text-center">Giá bán</span><span className="text-right sm:text-center">Đơn vị</span><span className="print:hidden" /></div>
      {visibleProducts.map((product) => <article key={product.id} className="grid grid-cols-[minmax(0,1fr)_76px_58px_58px] items-center gap-2 border-t border-dotted border-rose-200 px-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(125px,190px)_minmax(95px,145px)_80px] sm:gap-3 sm:px-6"><div className="min-w-0"><h2 className="font-bold leading-relaxed text-gray-900">{product.name}</h2>{product.details.length > 0 && <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed text-gray-700">{product.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}</div><div className="text-right text-[11px] font-semibold leading-snug tabular-nums text-gray-900 sm:text-center sm:text-sm">{formatPrice(product)}</div><div className="text-right text-xs leading-snug text-gray-700 sm:text-center sm:text-sm">{product.unit}</div><div className="flex justify-end gap-1 print:hidden"><button type="button" aria-label={`Sửa ${product.name}`} title="Sửa sản phẩm" onClick={() => openEdit(product)} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-rose-700"><Pencil className="h-4 w-4" /></button><button type="button" aria-label={`Xóa ${product.name}`} title="Xóa sản phẩm" onClick={() => void remove(product)} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div></article>)}
      {visibleProducts.length === 0 && <div className="border-t border-gray-200 px-4 py-12 text-center text-sm text-gray-500">Chưa có sản phẩm phù hợp.</div>}
    </section>
    <footer className="flex flex-wrap justify-between gap-2 text-xs text-gray-500"><span>Giá tính bằng đồng Việt Nam (VND).</span><span>* Găng nén có nhiều thương hiệu và mức giá theo mẫu.</span></footer>
    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={save} className="w-full max-w-xl space-y-4 rounded-xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2><button type="button" aria-label="Đóng" onClick={() => setShowForm(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm font-semibold sm:col-span-2">Tên sản phẩm<input required value={form.name} onChange={(event) => update('name', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 font-normal" /></label><label className="space-y-1 text-sm font-semibold">Nhóm<select value={form.category} onChange={(event) => update('category', event.target.value as ProductGroup)} className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 font-normal">{groups.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label><label className="space-y-1 text-sm font-semibold">Đơn vị<input required value={form.unit} onChange={(event) => update('unit', event.target.value)} placeholder="1 chai" className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 font-normal" /></label><label className="space-y-1 text-sm font-semibold">Giá từ<input required type="number" min="0" value={form.price_min} onChange={(event) => update('price_min', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 font-normal" /></label><label className="space-y-1 text-sm font-semibold">Giá đến<input required type="number" min="0" value={form.price_max} onChange={(event) => update('price_max', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 font-normal" /></label><label className="space-y-1 text-sm font-semibold sm:col-span-2">Thương hiệu / chi tiết<textarea rows={3} value={form.details} onChange={(event) => update('details', event.target.value)} placeholder="Mỗi dòng một chi tiết" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label><label className="space-y-1 text-sm font-semibold">Thứ tự<input type="number" min="0" value={form.sort_order} onChange={(event) => update('sort_order', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 font-normal" /></label></div><div className="flex justify-end gap-2 border-t border-gray-200 pt-4"><button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Hủy</button><button type="submit" disabled={busy} className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : 'Lưu sản phẩm'}</button></div></form></div>}
    <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } body { background: white !important; } .admin-sidebar, .admin-header, .admin-mobile-only { display: none !important; } }`}</style>
  </main>;
};
export default W19_HomeProducts;
