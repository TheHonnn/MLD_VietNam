import React, { useMemo, useState } from 'react';
import { PackageCheck, Printer, Search, ShieldCheck } from 'lucide-react';

type ProductGroup = 'Dụng cụ tập luyện' | 'Băng ép' | 'Chăm sóc da' | 'Tài liệu';

interface HomeProduct {
  name: string;
  price: number | [number, number];
  unit: string;
  group: ProductGroup;
  details?: string[];
}

const products: HomeProduct[] = [
  { name: 'Vòng cao su kháng lực', price: 150000, unit: '2 chiếc', group: 'Dụng cụ tập luyện' },
  { name: 'Tạ tay 1.5kg', price: 150000, unit: '1 đôi', group: 'Dụng cụ tập luyện' },
  {
    name: 'Combo 3 cuốn: Cẩm nang phù bạch huyết + Hướng dẫn dinh dưỡng + Tập luyện cho phù bạch huyết',
    price: 200000,
    unit: '1 combo',
    group: 'Tài liệu',
  },
  {
    name: 'Găng nén ngón tay - cổ tay',
    price: [1600000, 1800000],
    unit: '1 chiếc',
    group: 'Băng ép',
    details: ['Medi - xuất xứ: Đức', 'Anita - xuất xứ: Đức', 'Venosan - xuất xứ: Thụy Sĩ'],
  },
  {
    name: 'Găng nén cẳng tay - bắp tay',
    price: [1100000, 1300000],
    unit: '1 chiếc',
    group: 'Băng ép',
    details: ['Medi - xuất xứ: Đức', 'Anita - xuất xứ: Đức', 'Venosan - xuất xứ: Thụy Sĩ'],
  },
  { name: 'Kem dưỡng ẩm dành cho da nhạy cảm 400ml', price: 300000, unit: '1 chai', group: 'Chăm sóc da' },
  { name: 'Kem chống nắng dành cho da nhạy cảm 100ml', price: 595000, unit: '1 tuýp', group: 'Chăm sóc da' },
  { name: 'Sữa tắm dành cho da nhạy cảm 400ml', price: 260000, unit: '1 chai', group: 'Chăm sóc da' },
];

const groups = ['Tất cả', 'Dụng cụ tập luyện', 'Băng ép', 'Chăm sóc da', 'Tài liệu'] as const;
const money = new Intl.NumberFormat('vi-VN');

const formatPrice = (price: HomeProduct['price']) =>
  Array.isArray(price)
    ? `${money.format(price[0])} - ${money.format(price[1])} đ`
    : `${money.format(price)} đ`;

export const W19_HomeProducts: React.FC = () => {
  const [group, setGroup] = useState<(typeof groups)[number]>('Tất cả');
  const [search, setSearch] = useState('');

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return products.filter((product) => {
      const matchesGroup = group === 'Tất cả' || product.group === group;
      const searchable = [product.name, product.group, ...(product.details || [])].join(' ').toLocaleLowerCase('vi');
      return matchesGroup && (!query || searchable.includes(query));
    });
  }, [group, search]);

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200 pb-5">
        <div className="flex min-w-0 items-center gap-4">
          <img src="/logo_mld.png" alt="MLD Việt Nam" className="h-14 w-14 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-rose-700">MLD Việt Nam</p>
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900">Sản phẩm bổ trợ tại nhà</h1>
            <p className="mt-1 text-sm text-gray-600">Dụng cụ tập luyện, băng ép, tài liệu và sản phẩm chăm sóc da</p>
          </div>
        </div>
        <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 print:hidden">
          <Printer className="h-4 w-4" /> In bảng giá
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4" /> Giá niêm yết đã bao gồm 10% VAT
        </div>
        <div className="relative w-full sm:max-w-xs print:hidden">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            aria-label="Tìm sản phẩm"
            placeholder="Tìm sản phẩm hoặc thương hiệu..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
          />
        </div>
      </div>

      <nav aria-label="Nhóm sản phẩm" className="flex gap-2 overflow-x-auto border-b border-gray-200 print:hidden">
        {groups.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={group === item}
            onClick={() => setGroup(item)}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${group === item ? 'border-rose-600 text-rose-700' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            {item}
          </button>
        ))}
      </nav>

      <section aria-label="Bảng giá sản phẩm" className="overflow-hidden border border-rose-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_76px_58px] gap-2 bg-rose-50 px-3 py-3 text-[10px] font-extrabold uppercase text-rose-700 sm:grid-cols-[minmax(0,1fr)_minmax(125px,190px)_minmax(95px,145px)] sm:px-6 sm:text-xs">
          <span>Tên sản phẩm</span><span className="text-right sm:text-center">Giá bán</span><span className="text-right sm:text-center">Đơn vị</span>
        </div>
        {visibleProducts.map((product) => (
          <article key={product.name} className="grid grid-cols-[minmax(0,1fr)_76px_58px] items-center gap-2 border-t border-dotted border-rose-200 px-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(125px,190px)_minmax(95px,145px)] sm:gap-3 sm:px-6">
            <div className="min-w-0">
              <h2 className="font-bold leading-relaxed text-gray-900">{product.name}</h2>
              {product.details && (
                <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed text-gray-700">
                  {product.details.map((detail) => <li key={detail}>{detail}</li>)}
                </ul>
              )}
              <span className="mt-1 hidden text-xs text-gray-500 print:block">{product.group}</span>
            </div>
            <div className="text-right text-[11px] font-semibold leading-snug tabular-nums text-gray-900 sm:text-center sm:text-sm">{formatPrice(product.price)}</div>
            <div className="text-right text-xs leading-snug text-gray-700 sm:text-center sm:text-sm">{product.unit}</div>
          </article>
        ))}
        {visibleProducts.length === 0 && (
          <div className="flex flex-col items-center gap-2 border-t border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
            <PackageCheck className="h-6 w-6 text-gray-400" />
            Không tìm thấy sản phẩm phù hợp.
          </div>
        )}
      </section>

      <footer className="flex flex-wrap items-start justify-between gap-2 text-xs leading-relaxed text-gray-500">
        <span>Giá tính bằng đồng Việt Nam (VND).</span>
        <span>* Găng nén có nhiều thương hiệu và mức giá theo mẫu.</span>
      </footer>
      <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } body { background: white !important; } .admin-sidebar, .admin-header, .admin-mobile-only { display: none !important; } }`}</style>
    </main>
  );
};

export default W19_HomeProducts;
