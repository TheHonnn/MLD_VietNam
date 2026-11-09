import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Package,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../admin/api';
import { toast } from '../components/common';
import { portalService } from '../services/portal.service';
import { compressImageFile } from '../utils/imageCompressor';

type ProductGroup = 'Dụng cụ tập luyện' | 'Băng ép' | 'Chăm sóc da' | 'Tài liệu';

interface HomeProduct {
  id: string;
  name: string;
  category: ProductGroup;
  price_min: number;
  price_max: number;
  unit: string;
  details: string[];
  sort_order: number;
  image_url?: string | null;
  image_urls?: string[];
}

const groups = ['Tất cả', 'Dụng cụ tập luyện', 'Băng ép', 'Chăm sóc da', 'Tài liệu'] as const;
const money = new Intl.NumberFormat('vi-VN');

const emptyForm = {
  name: '',
  category: 'Dụng cụ tập luyện' as ProductGroup,
  price_min: '',
  price_max: '',
  unit: '',
  details: '',
  sort_order: '100',
  image_url: '',
};

const formatPrice = (product: HomeProduct) => {
  if (product.price_min === product.price_max) {
    return `${money.format(product.price_min)} đ`;
  }
  return `${money.format(product.price_min)} - ${money.format(product.price_max)} đ`;
};

/**
 * Phân tích dòng chi tiết / xuất xứ thương hiệu để hiển thị chip thông minh
 */
const parseBrandDetail = (detail: string) => {
  const trimmed = detail.trim();
  const lower = trimmed.toLowerCase();

  let flag = '🏷️';
  if (lower.includes('đức') || lower.includes('germany')) flag = '🇩🇪';
  else if (lower.includes('thụy sĩ') || lower.includes('switzerland')) flag = '🇨🇭';
  else if (lower.includes('mỹ') || lower.includes('usa') || lower.includes('hoa kỳ')) flag = '🇺🇸';
  else if (lower.includes('nhật') || lower.includes('japan')) flag = '🇯🇵';
  else if (lower.includes('hàn') || lower.includes('korea')) flag = '🇰🇷';
  else if (lower.includes('việt nam') || lower.includes('vietnam')) flag = '🇻🇳';
  else if (lower.includes('pháp') || lower.includes('france')) flag = '🇫🇷';
  else if (lower.includes('ý') || lower.includes('italy')) flag = '🇮🇹';
  else if (lower.includes('combo') || lower.includes('cuốn') || lower.includes('cẩm nang')) flag = '📚';

  return { text: trimmed, flag };
};

const getCategoryStyle = (cat: ProductGroup) => {
  switch (cat) {
    case 'Băng ép':
      return {
        bg: 'bg-[#FFF7ED]',
        text: 'text-[#C2410C]',
        border: 'border-[#FFEDD5]',
        dot: 'bg-[#EA580C]',
      };
    case 'Dụng cụ tập luyện':
      return {
        bg: 'bg-[#EFF6FF]',
        text: 'text-[#1D4ED8]',
        border: 'border-[#DBEAFE]',
        dot: 'bg-[#2563EB]',
      };
    case 'Chăm sóc da':
      return {
        bg: 'bg-[#FDF2F8]',
        text: 'text-[#BE185D]',
        border: 'border-[#FCE7F3]',
        dot: 'bg-[#DB2777]',
      };
    case 'Tài liệu':
      return {
        bg: 'bg-[#FAF5FF]',
        text: 'text-[#7E22CE]',
        border: 'border-[#F3E8FF]',
        dot: 'bg-[#9333EA]',
      };
    default:
      return {
        bg: 'bg-[#F4EFEA]',
        text: 'text-[#8A4F23]',
        border: 'border-[#E8DFD8]',
        dot: 'bg-[#985018]',
      };
  }
};

export const W19_HomeProducts: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [group, setGroup] = useState<(typeof groups)[number]>('Tất cả');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [editing, setEditing] = useState<HomeProduct | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [gallery, setGallery] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; title: string; allUrls: string[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const data = await adminApi<any>('home_products?limit=200&page=1&sort=sort_order&direction=asc');
      setProducts(
        (data?.rows || []).map((row: any) => ({
          ...row,
          price_min: Number(row.price_min),
          price_max: Number(row.price_max),
          details: Array.isArray(row.details) ? row.details : [],
          image_url: row.image_url || null,
          image_urls: Array.isArray(row.image_urls) ? row.image_urls : (row.image_url ? [row.image_url] : []),
        }))
      );
    } catch (error: any) {
      toast.error('Không tải được danh mục sản phẩm', error?.message || 'Hãy kiểm tra kết nối CSDL.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Filtered products list
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return products.filter((product) => {
      const matchesGroup = group === 'Tất cả' || product.category === group;
      if (!matchesGroup) return false;
      if (!query) return true;
      const haystack = [product.name, product.category, product.unit, ...product.details].join(' ').toLocaleLowerCase('vi');
      return haystack.includes(query);
    });
  }, [products, group, search]);

  // Quick stats metrics
  const stats = useMemo(() => {
    const total = products.length;
    const withImages = products.filter((p) => p.image_url || (p.image_urls && p.image_urls.length > 0)).length;
    const minPrice = products.length ? Math.min(...products.map((p) => p.price_min)) : 0;
    const maxPrice = products.length ? Math.max(...products.map((p) => p.price_max)) : 0;
    return {
      total,
      withImages,
      categoriesCount: 4,
      minPrice,
      maxPrice,
    };
  }, [products]);

  // Counts per category for pills
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Tất cả': products.length };
    for (const g of groups) {
      if (g !== 'Tất cả') {
        counts[g] = products.filter((p) => p.category === g).length;
      }
    }
    return counts;
  }, [products]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setGallery([]);
    setShowForm(true);
  };

  const openEdit = (product: HomeProduct) => {
    setEditing(product);
    setForm({
      name: product.name,
      category: product.category,
      price_min: String(product.price_min),
      price_max: String(product.price_max),
      unit: product.unit,
      details: product.details.join('\n'),
      sort_order: String(product.sort_order),
      image_url: product.image_url || '',
    });
    setGallery(product.image_urls?.length ? product.image_urls : (product.image_url ? [product.image_url] : []));
    setShowForm(true);
  };

  const update = (key: keyof typeof emptyForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const syncPriceMaxWithMin = () => {
    if (form.price_min) {
      update('price_max', form.price_min);
    }
  };

  /**
   * Xử lý tệp hình ảnh: Tự động nén và tối ưu hóa kích thước trước khi tải lên
   * Tránh lỗi HTTP 413 "Request entity too large" khi người dùng tải ảnh dung lượng lớn
   */
  const handleProcessImageFile = async (file: File | Blob, nameHint?: string) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Định dạng không hợp lệ', 'Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP, GIF).');
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setGallery((current) => [...current, localPreviewUrl]);
    setForm((current) => ({ ...current, image_url: current.image_url || localPreviewUrl }));
    setUploadingImage(true);

    try {
      // 1. Tự động nén và tối ưu hóa kích thước ảnh (giảm từ 3-10MB xuống còn ~60-120KB)
      const compressed = await compressImageFile(file, 1200, 0.82);
      const processedFile = compressed.file;
      const optimizedDataUrl = compressed.dataUrl;

      const fileName = nameHint || (file as File).name || `homeproduct_${Date.now()}.jpg`;

      try {
        const publicUrl = await portalService.uploadFileToStorage(processedFile, fileName);
        setGallery((current) => current.map((url) => (url === localPreviewUrl ? publicUrl : url)));
        setForm((current) => ({
          ...current,
          image_url: current.image_url === localPreviewUrl ? publicUrl : current.image_url,
        }));
        toast.success('Tải ảnh thành công', 'Ảnh sản phẩm đã được đồng bộ vào kho lưu trữ.');
      } catch (uploadErr) {
        console.warn('Lỗi tải ảnh lên Storage, chuyển sang lưu ảnh đã nén tối ưu:', uploadErr);
        // Lưu dataUrl đã nén (chỉ ~80KB, tuyệt đối an toàn và không gây lỗi 413)
        setGallery((current) => current.map((url) => (url === localPreviewUrl ? optimizedDataUrl : url)));
        setForm((current) => ({
          ...current,
          image_url: current.image_url === localPreviewUrl ? optimizedDataUrl : current.image_url,
        }));
        toast.success('Đã nạp ảnh', 'Ảnh đã được nén tối ưu cho sản phẩm.');
      }
    } catch (err: any) {
      console.error('Lỗi xử lý nén ảnh:', err);
      toast.error('Lỗi xử lý ảnh', err?.message || 'Không thể đọc tệp ảnh.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    for (const file of Array.from(event.target.files || [])) {
      void handleProcessImageFile(file);
    }
  };

  const handleFormPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const ext = item.type.split('/')[1] || 'png';
          await handleProcessImageFile(file, `pasted_${Date.now()}.${ext}`);
          return;
        }
      }
    }
  };

  const handleClipboardButtonClick = async () => {
    if (!navigator.clipboard) {
      toast.warning('Bộ nhớ tạm', 'Nhấn phím Ctrl + V để dán ảnh trực tiếp vào form!');
      return;
    }

    try {
      setUploadingImage(true);
      if (navigator.clipboard.read) {
        try {
          const clipboardItems = await navigator.clipboard.read();
          for (const item of clipboardItems) {
            const imgType = item.types.find((t) => t.startsWith('image/'));
            if (imgType) {
              const blob = await item.getType(imgType);
              const ext = imgType.split('/')[1] || 'png';
              await handleProcessImageFile(blob, `pasted_${Date.now()}.${ext}`);
              return;
            }
          }
        } catch (_) {}
      }

      const text = await navigator.clipboard.readText();
      const trimmed = text ? text.trim() : '';
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        setGallery((current) => [...current, trimmed]);
        setForm((current) => ({ ...current, image_url: current.image_url || trimmed }));
        toast.success('Dán link ảnh thành công');
        return;
      }
      if (trimmed.startsWith('data:image/')) {
        const res = await fetch(trimmed);
        const blob = await res.blob();
        await handleProcessImageFile(blob, `pasted_${Date.now()}.jpg`);
        return;
      }

      toast.warning('Bộ nhớ tạm', 'Hãy chụp màn hình (PrintScreen / Snipping Tool) hoặc sao chép ảnh rồi dán (Ctrl+V)!');
    } catch {
      toast.warning('Bộ nhớ tạm', 'Hãy dùng tổ hợp phím Ctrl + V trên bàn phím để dán ảnh!');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    const remaining = gallery.filter((image) => image !== url);
    setGallery(remaining);
    setForm((current) => ({
      ...current,
      image_url: current.image_url === url ? remaining[0] || '' : current.image_url,
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info('Đã xóa ảnh khỏi danh sách xem trước');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const min = Number(form.price_min);
    const max = Number(form.price_max || form.price_min);

    if (!form.name.trim() || !form.unit.trim() || !Number.isFinite(min) || min < 0 || !Number.isFinite(max) || max < min) {
      toast.error('Thông tin sản phẩm chưa hợp lệ', 'Vui lòng kiểm tra tên, đơn vị và khoảng giá hợp lệ.');
      return;
    }

    setBusy(true);
    try {
      const values = {
        name: form.name.trim(),
        category: form.category,
        price_min: min,
        price_max: max,
        unit: form.unit.trim(),
        details: form.details.split('\n').map((item) => item.trim()).filter(Boolean),
        sort_order: Number(form.sort_order) || 100,
        image_url: form.image_url ? form.image_url.trim() : null,
        image_urls: gallery.filter((url) => !url.startsWith('blob:')),
      };

      if (editing) {
        await adminApi('home_products/update', { key: { id: editing.id }, values });
      } else {
        await adminApi('home_products/create', { values });
      }

      toast.success(editing ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm thành công');
      setShowForm(false);
      await load();
    } catch (error: any) {
      toast.error('Không thể lưu sản phẩm', error?.message || 'Lỗi lưu trữ dữ liệu.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (product: HomeProduct) => {
    if (!window.confirm(`Xác nhận xóa sản phẩm “${product.name}”?`)) return;
    try {
      await adminApi('home_products/delete', { key: { id: product.id } });
      toast.success('Đã xóa sản phẩm');
      await load();
    } catch (error: any) {
      toast.error('Không thể xóa sản phẩm', error?.message);
    }
  };

  const openPOSWithProduct = (product: HomeProduct) => {
    navigate(`/cashier-pos?tab=pos&productId=${product.id}`);
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
      {/* 1. BREADCRUMB & HEADER */}
      <header className="flex flex-col gap-4 border-b border-[#EFE4D9] pb-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <nav className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8C7E72] uppercase tracking-wider">
            <span>Quản trị</span>
            <ChevronRight className="h-3 w-3" />
            <span>Vận hành Dịch vụ Spa</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#985018]">Sản phẩm mang về</span>
          </nav>
          <div className="mt-1 flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#3E200C] tracking-tight">
              Sản phẩm bổ trợ & Băng ép tại nhà
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF0E4] border border-[#E8DFD8] px-2.5 py-0.5 text-[11px] font-bold text-[#8A4F23]">
              <Sparkles className="h-3 w-3 text-[#985018]" />
              {products.length} mặt hàng
            </span>
          </div>
          <p className="mt-1 text-xs text-[#73675F] max-w-2xl leading-relaxed">
            Quản lý bảng giá niêm yết, đơn vị quy cách, hình ảnh thực tế và thương hiệu sản phẩm bổ trợ hỗ trợ chăm sóc & phục hồi mô tế bào tại nhà
          </p>
        </div>

        {/* TOP ACTIONS */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-9.5 items-center gap-1.5 rounded-xl bg-[#985018] px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#854412] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm sản phẩm</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-[#D7BBA6] bg-white px-3 text-xs font-bold text-[#73675F] shadow-2xs transition hover:bg-[#FAF8F5] hover:text-[#3E200C] cursor-pointer"
            title="In bảng giá tiêu chuẩn A4"
          >
            <Printer className="h-4 w-4 text-[#985018]" />
            <span>In bảng giá</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/cashier-pos?tab=pos')}
            className="inline-flex h-9.5 items-center gap-1.5 rounded-xl border border-[#D7BBA6] bg-[#FAF8F5] px-3 text-xs font-bold text-[#8A4F23] shadow-2xs transition hover:bg-[#FAF0E4] cursor-pointer"
            title="Mở giao diện Thu ngân POS để lập hóa đơn bán hàng"
          >
            <ShoppingBag className="h-4 w-4 text-[#985018]" />
            <span>Thu ngân POS</span>
          </button>
        </div>
      </header>

      {/* 2. STATS / KPI ROW */}
      <section aria-label="Thống kê sản phẩm" className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
        {/* KPI 1 */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#EFE4D9] bg-white p-3.5 shadow-xs transition hover:border-[#D7BBA6]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#8C7E72] uppercase tracking-wider">Tổng mặt hàng</p>
            <p className="text-base sm:text-lg font-black text-[#2C241E] leading-tight">
              {stats.total} <span className="text-xs font-semibold text-[#8C7E72]">sản phẩm</span>
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#EFE4D9] bg-white p-3.5 shadow-xs transition hover:border-[#D7BBA6]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1D4ED8] border border-[#DBEAFE]">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#8C7E72] uppercase tracking-wider">Phân nhóm</p>
            <p className="text-base sm:text-lg font-black text-[#2C241E] leading-tight">
              {stats.categoriesCount} <span className="text-xs font-semibold text-[#8C7E72]">danh mục</span>
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#EFE4D9] bg-white p-3.5 shadow-xs transition hover:border-[#D7BBA6]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
            <Tag className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#8C7E72] uppercase tracking-wider">Khoảng giá</p>
            <p className="text-xs sm:text-sm font-black text-[#985018] truncate leading-tight">
              {money.format(stats.minPrice)}đ - {money.format(stats.maxPrice)}đ
            </p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#EFE4D9] bg-white p-3.5 shadow-xs transition hover:border-[#D7BBA6]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#8C7E72] uppercase tracking-wider">Hình ảnh minh họa</p>
            <p className="text-base sm:text-lg font-black text-[#15803D] leading-tight">
              {stats.withImages}/{stats.total} <span className="text-xs font-semibold text-[#8C7E72]">mẫu</span>
            </p>
          </div>
        </div>
      </section>

      {/* 3. FILTER, SEARCH & VIEW TOGGLE BAR */}
      <section aria-label="Bộ lọc và tìm kiếm" className="space-y-3 print:hidden">
        {/* CATEGORY PILL TABS */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 border-b border-[#EFE4D9]">
          <div className="flex items-center gap-1.5 shrink-0">
            {groups.map((item) => {
              const active = group === item;
              const count = categoryCounts[item] || 0;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setGroup(item)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                    active
                      ? 'bg-[#985018] text-white shadow-xs'
                      : 'bg-white text-[#73675F] border border-[#EFE4D9] hover:bg-[#FAF8F5] hover:text-[#3E200C]'
                  }`}
                >
                  <span>{item}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                      active ? 'bg-white/20 text-white' : 'bg-[#FAF0E4] text-[#8A4F23]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* VIEW SWITCHER */}
          <div className="flex items-center gap-1 rounded-xl border border-[#EFE4D9] bg-white p-1 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex h-7.5 items-center gap-1.5 rounded-lg px-2 text-xs font-bold transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#FAF0E4] text-[#8A4F23] shadow-2xs'
                  : 'text-[#8C7E72] hover:text-[#3E200C]'
              }`}
              title="Xem dạng lưới thẻ"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lưới thẻ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex h-7.5 items-center gap-1.5 rounded-lg px-2 text-xs font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#FAF0E4] text-[#8A4F23] shadow-2xs'
                  : 'text-[#8C7E72] hover:text-[#3E200C]'
              }`}
              title="Xem dạng danh sách bảng"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Danh sách</span>
            </button>
          </div>
        </div>

        {/* SEARCH AND VAT NOTICE ROW */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7E72]" />
            <input
              type="search"
              aria-label="Tìm sản phẩm"
              placeholder="Tìm theo tên sản phẩm, thương hiệu (Medi, Anita...), quy cách..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 w-full rounded-xl border border-[#D7BBA6] bg-white pl-9 pr-8 text-xs font-medium text-[#2C241E] placeholder:text-[#A69588] outline-none transition focus:border-[#985018] focus:ring-2 focus:ring-[#985018]/15 shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A69588] hover:text-[#3E200C] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* VAT GUARANTEE BADGE */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs font-bold text-[#15803D] shadow-2xs self-start sm:self-auto">
            <ShieldCheck className="h-4 w-4 text-[#16A34A] shrink-0" />
            <span>Giá niêm yết đã bao gồm 10% VAT theo tiêu chuẩn MLD</span>
          </div>
        </div>
      </section>

      {/* 4. MAIN CONTENT AREA: GRID VIEW OR TABLE VIEW */}
      {viewMode === 'grid' ? (
        /* GRID VIEW (Thẻ sản phẩm) */
        <section aria-label="Danh sách sản phẩm dạng lưới" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => {
            const catStyle = getCategoryStyle(product.category);
            const mainImg = product.image_url || product.image_urls?.[0];
            const extraCount = (product.image_urls?.length || (product.image_url ? 1 : 0)) - 1;

            return (
              <article
                key={product.id}
                className="group flex flex-col justify-between rounded-2xl border border-[#EFE4D9] bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-[#D7BBA6] hover:shadow-md"
              >
                <div>
                  {/* PRODUCT IMAGE & BADGES */}
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-[#EFE4D9] bg-[#FAF8F5] flex items-center justify-center">
                    {mainImg ? (
                      <>
                        <img
                          src={mainImg}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setLightbox({
                              url: mainImg,
                              title: product.name,
                              allUrls: product.image_urls?.length ? product.image_urls : [mainImg],
                            })
                          }
                          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 text-white cursor-pointer"
                          title="Bấm để xem ảnh to sắc nét"
                        >
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-bold backdrop-blur-xs">
                            <Eye className="h-3.5 w-3.5" /> Xem ảnh to
                          </span>
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#B49C89] gap-1.5 p-4 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF0E4] text-[#985018]">
                          <Package className="h-6 w-6" />
                        </div>
                        <span className="text-[11px] font-semibold text-[#8C7E72]">Chưa có ảnh</span>
                      </div>
                    )}

                    {/* TOP BADGE: CATEGORY */}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10.5px] font-bold border shadow-2xs backdrop-blur-xs ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${catStyle.dot}`} />
                        {product.category}
                      </span>
                    </div>

                    {/* MULTI IMAGES BADGE */}
                    {extraCount > 0 && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                        +{extraCount} ảnh
                      </span>
                    )}
                  </div>

                  {/* PRODUCT NAME & DETAILS */}
                  <div className="mt-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-extrabold text-[#2C241E] leading-snug line-clamp-2 group-hover:text-[#985018] transition-colors">
                        {product.name}
                      </h2>
                    </div>

                    {/* BRAND & METADATA CHIPS */}
                    {product.details.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {product.details.map((detail, idx) => {
                          const parsed = parseBrandDetail(detail);
                          return (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md border border-[#E8DFD8] bg-[#FAF8F5] px-2 py-0.5 text-[10.5px] font-semibold text-[#5C4A3E]"
                            >
                              <span>{parsed.flag}</span>
                              <span className="truncate max-w-[190px]">{parsed.text}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* FOOTER: PRICE, UNIT & ACTIONS */}
                <div className="mt-4 border-t border-[#EFE4D9] pt-3 space-y-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-[#8C7E72] uppercase block">Giá niêm yết</span>
                      <span className="text-base font-black text-[#985018] tabular-nums">
                        {formatPrice(product)}
                      </span>
                    </div>
                    <span className="rounded-lg bg-[#FAF0E4] border border-[#E8DFD8] px-2 py-0.5 text-[10.5px] font-bold text-[#8A4F23]">
                      {product.unit}
                    </span>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => openPOSWithProduct(product)}
                      className="flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-[#FAF0E4] border border-[#E8DFD8] text-[11px] font-bold text-[#8A4F23] hover:bg-[#985018] hover:text-white hover:border-[#985018] transition shadow-2xs cursor-pointer"
                      title="Lập đơn bán sản phẩm này tại POS"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Bán tại POS</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Sửa ${product.name}`}
                      title="Sửa thông tin sản phẩm"
                      onClick={() => openEdit(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#EFE4D9] bg-white text-[#73675F] hover:bg-[#FAF8F5] hover:text-[#985018] hover:border-[#D7BBA6] transition cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Xóa ${product.name}`}
                      title="Xóa sản phẩm"
                      onClick={() => void remove(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#FEE2E2] bg-white text-[#DC2626] hover:bg-[#FEF2F2] hover:border-[#FCA5A5] transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        /* TABLE VIEW (Danh sách bảng chuẩn chỉnh) */
        <section aria-label="Bảng giá sản phẩm" className="overflow-hidden rounded-2xl border border-[#EFE4D9] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF0E4] text-[#8A4F23] border-b border-[#E8DFD8] text-[11px] font-black uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-[42%]">Sản phẩm & Thông số</th>
                  <th className="py-3.5 px-4 text-center w-[16%]">Phân loại</th>
                  <th className="py-3.5 px-4 text-center w-[12%]">Đơn vị</th>
                  <th className="py-3.5 px-4 text-right w-[18%]">Giá bán niêm yết</th>
                  <th className="py-3.5 px-4 text-center w-[12%] print:hidden">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE4D9]">
                {visibleProducts.map((product) => {
                  const catStyle = getCategoryStyle(product.category);
                  const mainImg = product.image_url || product.image_urls?.[0];

                  return (
                    <tr key={product.id} className="transition hover:bg-[#FAF8F5]/80">
                      {/* Cột 1: Hình ảnh & Tên */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-start gap-3">
                          {mainImg ? (
                            <button
                              type="button"
                              onClick={() =>
                                setLightbox({
                                  url: mainImg,
                                  title: product.name,
                                  allUrls: product.image_urls?.length ? product.image_urls : [mainImg],
                                })
                              }
                              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] cursor-pointer group shadow-2xs"
                              title="Bấm để xem ảnh to"
                            >
                              <img src={mainImg} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 text-white transition">
                                <Eye className="h-4 w-4" />
                              </div>
                            </button>
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#D7BBA6] bg-[#FAF8F5] text-[#985018]">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0 space-y-1">
                            <h2 className="text-sm font-bold text-[#2C241E] leading-snug">
                              {product.name}
                            </h2>
                            {product.details.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {product.details.map((detail, idx) => {
                                  const parsed = parseBrandDetail(detail);
                                  return (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 rounded-md border border-[#E8DFD8] bg-[#FAF8F5] px-1.5 py-0.5 text-[10px] font-semibold text-[#5C4A3E]"
                                    >
                                      <span>{parsed.flag}</span>
                                      <span>{parsed.text}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Phân loại */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${catStyle.dot}`} />
                          {product.category}
                        </span>
                      </td>

                      {/* Cột 3: Đơn vị */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <span className="font-bold text-[#2C241E] bg-[#FAF8F5] border border-[#EFE4D9] rounded-lg px-2.5 py-1 text-xs">
                          {product.unit}
                        </span>
                      </td>

                      {/* Cột 4: Giá niêm yết */}
                      <td className="py-3.5 px-4 text-right align-middle">
                        <span className="text-sm font-black text-[#985018] tabular-nums block">
                          {formatPrice(product)}
                        </span>
                        <span className="text-[10px] text-[#8C7E72] font-semibold">Đã gồm 10% VAT</span>
                      </td>

                      {/* Cột 5: Thao tác */}
                      <td className="py-3.5 px-4 text-center align-middle print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPOSWithProduct(product)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#FAF0E4] border border-[#E8DFD8] px-2 text-[11px] font-bold text-[#8A4F23] hover:bg-[#985018] hover:text-white hover:border-[#985018] transition cursor-pointer"
                            title="Bán tại POS"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Bán</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EFE4D9] bg-white text-[#73675F] hover:bg-[#FAF8F5] hover:text-[#985018] hover:border-[#D7BBA6] transition cursor-pointer"
                            title="Sửa sản phẩm"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(product)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#FEE2E2] bg-white text-[#DC2626] hover:bg-[#FEF2F2] hover:border-[#FCA5A5] transition cursor-pointer"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* EMPTY STATE */}
      {visibleProducts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#D7BBA6] bg-white p-12 text-center shadow-2xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF0E4] text-[#985018] mb-3">
            <Package className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-[#3E200C]">Không tìm thấy sản phẩm phù hợp</h3>
          <p className="mt-1 text-xs text-[#73675F] max-w-sm mx-auto">
            Không có kết quả nào cho tiêu chí tìm kiếm hoặc phân nhóm hiện tại. Hãy thử chọn nhóm khác hoặc xóa bộ lọc.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setGroup('Tất cả');
                setSearch('');
              }}
              className="rounded-xl border border-[#D7BBA6] bg-white px-3.5 py-2 text-xs font-bold text-[#8A4F23] hover:bg-[#FAF8F5]"
            >
              Xem tất cả sản phẩm
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-[#985018] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#854412]"
            >
              Thêm sản phẩm mới
            </button>
          </div>
        </div>
      )}

      {/* FOOTER NOTICE */}
      <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8C7E72] border-t border-[#EFE4D9] pt-4 print:hidden">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-[#15803D]" />
          Đơn vị tiền tệ niêm yết: Đồng Việt Nam (VND) · Áp dụng thống nhất trên toàn hệ thống MLD
        </span>
        <span>* Găng nén y khoa có nhiều thương hiệu (Medi, Anita, Venosan) tương ứng với từng kích cỡ và xuất xứ.</span>
      </footer>

      {/* 5. MODAL FORM: THÊM / SỬA SẢN PHẨM */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={save}
            onPaste={handleFormPaste}
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto space-y-5 rounded-3xl bg-white p-6 shadow-2xl border border-[#EFE4D9]"
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-[#EFE4D9] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[#3E200C]">
                    {editing ? 'Chỉnh sửa sản phẩm bổ trợ' : 'Thêm sản phẩm bổ trợ mới'}
                  </h2>
                  <p className="text-xs text-[#73675F]">
                    Cập nhật thông số giá, đơn vị tính, hình ảnh và thương hiệu
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setShowForm(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#73675F] hover:bg-[#FAF8F5] hover:text-[#3E200C] transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Tên sản phẩm */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[#3E200C] flex items-center gap-1">
                  <span>Tên sản phẩm</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  placeholder="Ví dụ: Găng nén ngón tay - cổ tay, Tạ tay 1.5kg..."
                  className="h-10 w-full rounded-xl border border-[#D7BBA6] px-3 text-xs font-medium text-[#2C241E] placeholder:text-[#A69588] outline-none focus:border-[#985018] focus:ring-2 focus:ring-[#985018]/15"
                />
              </div>

              {/* Nhóm sản phẩm */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#3E200C]">Nhóm sản phẩm</label>
                <select
                  value={form.category}
                  onChange={(event) => update('category', event.target.value as ProductGroup)}
                  className="h-10 w-full rounded-xl border border-[#D7BBA6] bg-white px-3 text-xs font-medium text-[#2C241E] outline-none focus:border-[#985018] focus:ring-2 focus:ring-[#985018]/15"
                >
                  {groups.slice(1).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {/* Đơn vị tính */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#3E200C] flex items-center gap-1">
                  <span>Đơn vị tính</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.unit}
                  onChange={(event) => update('unit', event.target.value)}
                  placeholder="Ví dụ: 1 chiếc, 1 đôi, 1 combo, 1 chai..."
                  className="h-10 w-full rounded-xl border border-[#D7BBA6] px-3 text-xs font-medium text-[#2C241E] placeholder:text-[#A69588] outline-none focus:border-[#985018] focus:ring-2 focus:ring-[#985018]/15"
                />
              </div>

              {/* Giá từ - Giá đến */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#3E200C] flex items-center gap-1">
                    <span>Giá từ (VND)</span>
                    <span className="text-red-500">*</span>
                  </label>
                </div>
                <input
                  required
                  type="number"
                  min="0"
                  step="1000"
                  value={form.price_min}
                  onChange={(event) => update('price_min', event.target.value)}
                  placeholder="Ví dụ: 150000"
                  className="h-10 w-full rounded-xl border border-[#D7BBA6] px-3 text-xs font-bold text-[#985018] placeholder:font-normal placeholder:text-[#A69588] outline-none focus:border-[#985018] focus:ring-2 focus:ring-[#985018]/15"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#3E200C] flex items-center gap-1">
                    <span>Giá đến (VND)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={syncPriceMaxWithMin}
                    className="text-[10.5px] font-bold text-[#985018] hover:underline cursor-pointer"
                    title="Sao chép giá từ sang giá đến khi giá cố định"
                  >
                    Bằng giá từ (Cố định)
                  </button>
                </div>
                <input
                  required
                  type="number"
                  min="0"
                  step="1000"
                  value={form.price_max}
                  onChange={(event) => update('price_max', event.target.value)}
                  placeholder="Ví dụ: 150000"
                  className="h-10 w-full rounded-xl border border-[#D7BBA6] px-3 text-xs font-bold text-[#985018] placeholder:font-normal placeholder:text-[#A69588] outline-none focus:border-[#985018] focus:ring-2 focus:ring-[#985018]/15"
                />
              </div>

              {/* HÌNH ẢNH SẢN PHẨM */}
              <div className="space-y-2 sm:col-span-2 border-t border-[#EFE4D9] pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#3E200C] flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-[#985018]" />
                    <span>Bộ sưu tập hình ảnh sản phẩm</span>
                  </label>
                  <span className="text-[11px] text-[#8C7E72]">
                    Kéo thả, chọn tệp hoặc dán (Ctrl+V)
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                {/* DROP ZONE */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    for (const file of Array.from(e.dataTransfer.files || [])) {
                      void handleProcessImageFile(file);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#985018] bg-[#FAF0E4]/60 scale-[0.99]'
                      : 'border-[#D7BBA6] bg-[#FAF8F5]/80 hover:border-[#985018] hover:bg-[#FAF0E4]/40'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF0E4] text-[#985018] group-hover:scale-110 transition-transform mb-1.5 border border-[#E8DFD8]">
                    {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  </div>
                  <p className="text-xs font-bold text-[#2C241E]">
                    {uploadingImage ? 'Đang nạp ảnh vào hệ thống...' : 'Bấm để tải ảnh từ thiết bị hoặc kéo thả ảnh vào đây'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#8C7E72]">
                    Hoặc chụp màn hình / copy ảnh rồi nhấn{' '}
                    <kbd className="rounded border border-[#D7BBA6] bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#73675F] shadow-2xs">
                      Ctrl + V
                    </kbd>{' '}
                    để dán ngay
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-lg bg-white border border-[#D7BBA6] px-2.5 py-1 text-[11px] font-bold text-[#73675F] hover:bg-[#FAF8F5] shadow-2xs"
                    >
                      <Upload className="h-3 w-3 text-[#985018]" />
                      <span>Chọn file từ máy</span>
                    </button>
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={handleClipboardButtonClick}
                      className="inline-flex items-center gap-1 rounded-lg bg-white border border-[#D7BBA6] px-2.5 py-1 text-[11px] font-bold text-[#73675F] hover:bg-[#FAF8F5] shadow-2xs"
                    >
                      <Clipboard className="h-3 w-3 text-[#985018]" />
                      <span>Dán từ bộ nhớ tạm</span>
                    </button>
                  </div>
                </div>

                {/* THUMBNAIL GALLERY */}
                {gallery.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[11px] font-bold text-[#8C7E72] uppercase tracking-wider">
                      Ảnh đã nạp ({gallery.length}): Click ảnh để chọn làm ảnh đại diện
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {gallery.map((url, index) => {
                        const isPrimary = form.image_url === url || (!form.image_url && index === 0);
                        return (
                          <div
                            key={`${url}-${index}`}
                            className={`relative rounded-xl border p-1 bg-white shadow-2xs transition ${
                              isPrimary ? 'border-[#985018] ring-2 ring-[#985018]/20 bg-[#FAF0E4]/30' : 'border-[#EFE4D9]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => update('image_url', url)}
                              className="block cursor-pointer overflow-hidden rounded-lg"
                              title={isPrimary ? 'Đang là ảnh đại diện' : 'Bấm để đặt làm ảnh đại diện'}
                            >
                              <img src={url} alt={`Ảnh ${index + 1}`} className="h-16 w-16 object-cover" />
                            </button>
                            {isPrimary && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#985018] px-1.5 py-0.2 text-[9px] font-black text-white shadow-xs">
                                Đại diện
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(url)}
                              aria-label={`Xóa ảnh ${index + 1}`}
                              title="Xóa ảnh này"
                              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-red-600 border border-red-200 shadow-xs hover:bg-red-50 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Thương hiệu / Quy cách chi tiết */}
              <div className="space-y-1 sm:col-span-2 border-t border-[#EFE4D9] pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#3E200C]">
                    Thương hiệu & Quy cách chi tiết (Mỗi dòng một mục)
                  </label>
                  <span className="text-[11px] text-[#8C7E72]">Tự động tạo nhãn xuất xứ</span>
                </div>
                <textarea
                  rows={3}
                  value={form.details}
                  onChange={(event) => update('details', event.target.value)}
                  placeholder={`Ví dụ:\nMedi - xuất xứ: Đức\nAnita - xuất xứ: Đức\nVenosan - xuất xứ: Thụy Sĩ`}
                  className="w-full rounded-xl border border-[#D7BBA6] px-3 py-2 text-xs font-medium text-[#2C241E] placeholder:text-[#A69588] outline-none focus:border-[#985018] focus:ring-2 focus:ring-[#985018]/15"
                />
              </div>

              {/* Thứ tự hiển thị */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#3E200C]">Thứ tự ưu tiên</label>
                <input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(event) => update('sort_order', event.target.value)}
                  className="h-10 w-full rounded-xl border border-[#D7BBA6] px-3 text-xs font-medium text-[#2C241E] outline-none focus:border-[#985018] focus:ring-2 focus:ring-[#985018]/15"
                />
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex items-center justify-end gap-2.5 border-t border-[#EFE4D9] pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-[#D7BBA6] px-4 py-2 text-xs font-bold text-[#73675F] hover:bg-[#FAF8F5] transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={busy || uploadingImage}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#985018] px-5 py-2 text-xs font-bold text-white hover:bg-[#854412] disabled:opacity-50 transition shadow-xs cursor-pointer"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>{editing ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm mới'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. LIGHTBOX MODAL: XEM ẢNH TO */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EFE4D9] px-4 py-2.5">
              <span className="text-xs font-bold text-[#3E200C] truncate max-w-md">{lightbox.title}</span>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#73675F] hover:bg-[#FAF8F5] hover:text-[#3E200C] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-[#FAF8F5] rounded-xl mt-2 max-h-[72vh]">
              <img src={lightbox.url} alt={lightbox.title} className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-md" />
            </div>
            {lightbox.allUrls && lightbox.allUrls.length > 1 && (
              <div className="flex items-center justify-center gap-2 p-2 overflow-x-auto">
                {lightbox.allUrls.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox({ ...lightbox, url: img })}
                    className={`h-12 w-12 rounded-lg overflow-hidden border-2 cursor-pointer transition ${
                      lightbox.url === img ? 'border-[#985018] scale-105' : 'border-[#EFE4D9] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. PRINT TEMPLATE: BẢN IN BẢNG GIÁ A4 CHO CƠ SỞ */}
      <div className="hidden print:block font-sans text-black">
        <div className="flex items-center justify-between border-b-2 border-[#985018] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <img src="/logo_mld.png" alt="MLD Vietnam" className="h-16 w-16 object-contain" />
            <div>
              <h1 className="text-lg font-black uppercase text-[#3E200C] tracking-wide">
                MLD VIETNAM MEDICAL HEALTHCARE & SPA
              </h1>
              <p className="text-xs font-semibold text-[#8A4F23]">
                Hệ thống Phục hồi & Dẫn lưu bạch huyết chuẩn Y khoa Quốc tế
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Hotline: 0394 316 963 · Website: mld-vietnam.vercel.app</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block border border-gray-300 rounded px-2 py-1 text-[10px] font-bold text-gray-700">
              BẢNG GIÁ NIÊM YẾT NỘI BỘ & KHÁCH HÀNG
            </span>
            <p className="text-[10px] text-gray-500 mt-1">Ngày in: {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
        </div>

        <div className="text-center my-4">
          <h2 className="text-base font-black uppercase text-[#2C241E] tracking-wider">
            DANH MỤC SẢN PHẨM BỔ TRỢ & VẬT TƯ CHĂM SÓC TẠI NHÀ
          </h2>
          <p className="text-xs text-gray-600 mt-0.5 italic">
            (Giá niêm yết đã bao gồm 10% thuế giá trị gia tăng VAT)
          </p>
        </div>

        <table className="w-full border-collapse border border-gray-300 text-xs mt-3">
          <thead>
            <tr className="bg-gray-100 text-gray-800 font-bold">
              <th className="border border-gray-300 py-2 px-2 text-center w-10">STT</th>
              <th className="border border-gray-300 py-2 px-3 text-left">Tên sản phẩm & Thương hiệu</th>
              <th className="border border-gray-300 py-2 px-3 text-center w-28">Phân nhóm</th>
              <th className="border border-gray-300 py-2 px-3 text-center w-20">Đơn vị</th>
              <th className="border border-gray-300 py-2 px-3 text-right w-36">Giá niêm yết (VND)</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((p, idx) => (
              <tr key={p.id} className="border-b border-gray-300">
                <td className="border border-gray-300 py-2 px-2 text-center font-medium">{idx + 1}</td>
                <td className="border border-gray-300 py-2 px-3">
                  <div className="font-bold text-gray-900">{p.name}</div>
                  {p.details.length > 0 && (
                    <div className="text-[11px] text-gray-600 mt-0.5">
                      {p.details.join(' • ')}
                    </div>
                  )}
                </td>
                <td className="border border-gray-300 py-2 px-3 text-center font-medium">{p.category}</td>
                <td className="border border-gray-300 py-2 px-3 text-center font-medium">{p.unit}</td>
                <td className="border border-gray-300 py-2 px-3 text-right font-black text-gray-900">
                  {formatPrice(p)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex justify-between text-xs px-6">
          <div className="text-center">
            <p className="font-bold">ĐẠI DIỆN KINH DOANH / THU NGÂN</p>
            <p className="text-[10px] text-gray-500 mt-0.5">(Ký và ghi rõ họ tên)</p>
          </div>
          <div className="text-center">
            <p className="font-bold">BAN QUẢN LÝ CƠ SỞ MLD VIỆT NAM</p>
            <p className="text-[10px] text-gray-500 mt-0.5">(Ký duyệt và đóng dấu)</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { background: white !important; }
          .admin-sidebar, .admin-header, .admin-mobile-only { display: none !important; }
        }
      `}</style>
    </main>
  );
};

export default W19_HomeProducts;
