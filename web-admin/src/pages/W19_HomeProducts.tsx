import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clipboard,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { adminApi } from '../admin/api';
import { toast } from '../components/common';
import { portalService } from '../services/portal.service';

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

const formatPrice = (product: HomeProduct) =>
  product.price_min === product.price_max
    ? `${money.format(product.price_min)} đ`
    : `${money.format(product.price_min)} - ${money.format(product.price_max)} đ`;

export const W19_HomeProducts: React.FC = () => {
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [group, setGroup] = useState<(typeof groups)[number]>('Tất cả');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<HomeProduct | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
        }))
      );
    } catch (error: any) {
      toast.error('Không tải được danh mục sản phẩm', error?.message || 'Hãy kiểm tra migration home_products đã được áp dụng.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return products.filter(
      (product) =>
        (group === 'Tất cả' || product.category === group) &&
        (!query || [product.name, product.category, ...product.details].join(' ').toLocaleLowerCase('vi').includes(query))
    );
  }, [products, group, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
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
    setShowForm(true);
  };

  const update = (key: keyof typeof emptyForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  /**
   * Xử lý tệp hình ảnh (từ file picker, kéo thả hoặc dán từ clipboard)
   */
  const handleProcessImageFile = async (file: File | Blob, nameHint?: string) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Định dạng không hợp lệ', 'Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP, GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Tệp quá lớn', 'Dung lượng ảnh tối đa là 5MB.');
      return;
    }

    // Hiển thị xem trước ngay lập tức bằng Object URL
    const localPreviewUrl = URL.createObjectURL(file);
    update('image_url', localPreviewUrl);
    setUploadingImage(true);

    try {
      const fileName = nameHint || (file as File).name || `product_${Date.now()}.png`;
      const publicUrl = await portalService.uploadFileToStorage(file, fileName);
      update('image_url', publicUrl);
      toast.success('Tải ảnh thành công', 'Ảnh sản phẩm đã được nạp và hiển thị xem trước.');
    } catch (err: any) {
      console.warn('Lỗi tải ảnh lên đám mây, chuyển sang lưu Base64 Data URL:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          update('image_url', String(reader.result));
          toast.success('Dán ảnh thành công', 'Ảnh đã được lưu tạm dạng Base64.');
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleProcessImageFile(file);
    }
  };

  /**
   * Lắng nghe sự kiện Paste (Ctrl+V) trong phạm vi form / modal
   */
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

  /**
   * Hỗ trợ nút bấm Dán từ clipboard
   */
  const handleClipboardButtonClick = async () => {
    if (!navigator.clipboard) {
      toast.warning('Bộ nhớ tạm', 'Nhấn phím Ctrl + V để dán ảnh vào form!');
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
        } catch (_) {
          // Trình duyệt có thể yêu cầu quyền clipboard
        }
      }

      const text = await navigator.clipboard.readText();
      const trimmed = text ? text.trim() : '';
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
        update('image_url', trimmed);
        toast.success('Dán link thành công', 'Đã lưu đường dẫn hình ảnh.');
        return;
      }

      toast.warning('Chưa có ảnh trong bộ nhớ tạm', 'Hãy chụp màn hình (PrintScreen / Snipping Tool) hoặc sao chép ảnh rồi bấm lại!');
    } catch {
      toast.warning('Bộ nhớ tạm', 'Hãy nhấn tổ hợp phím Ctrl + V trên bàn phím để dán ảnh!');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleProcessImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    update('image_url', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info('Đã xóa ảnh sản phẩm');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const min = Number(form.price_min);
    const max = Number(form.price_max || form.price_min);

    if (!form.name.trim() || !form.unit.trim() || !Number.isFinite(min) || min < 0 || !Number.isFinite(max) || max < min) {
      toast.error('Thông tin sản phẩm chưa hợp lệ', 'Nhập tên, đơn vị và khoảng giá hợp lệ.');
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
      toast.error('Không thể lưu sản phẩm', error?.message || 'Database chưa xác nhận thay đổi.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (product: HomeProduct) => {
    if (!window.confirm(`Xóa sản phẩm “${product.name}”?`)) return;
    try {
      await adminApi('home_products/delete', { key: { id: product.id } });
      toast.success('Đã xóa sản phẩm');
      await load();
    } catch (error: any) {
      toast.error('Không thể xóa sản phẩm', error?.message);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200 pb-5">
        <div className="flex min-w-0 items-center gap-4">
          <img src="/logo_mld.png" alt="MLD Việt Nam" className="h-14 w-14 shrink-0 object-contain" />
          <div>
            <p className="text-xs font-bold uppercase text-rose-700">MLD Việt Nam</p>
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900">Sản phẩm bổ trợ tại nhà</h1>
            <p className="mt-1 text-sm text-gray-600">Quản lý bảng giá, đơn vị, hình ảnh và thương hiệu sản phẩm</p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-rose-700 px-3 text-sm font-semibold text-white hover:bg-rose-800"
          >
            <Plus className="h-4 w-4" />
            Thêm sản phẩm
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" />
            In bảng giá
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4" />
          Giá niêm yết đã bao gồm 10% VAT
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
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold ${
              group === item ? 'border-rose-600 text-rose-700' : 'border-transparent text-gray-500'
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      <section aria-label="Bảng giá sản phẩm" className="overflow-hidden border border-rose-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_76px_58px_58px] gap-2 bg-rose-50 px-3 py-3 text-[10px] font-extrabold uppercase text-rose-700 sm:grid-cols-[minmax(0,1fr)_minmax(125px,190px)_minmax(95px,145px)_80px] sm:px-6 sm:text-xs">
          <span>Tên sản phẩm</span>
          <span className="text-right sm:text-center">Giá bán</span>
          <span className="text-right sm:text-center">Đơn vị</span>
          <span className="print:hidden" />
        </div>
        {visibleProducts.map((product) => (
          <article
            key={product.id}
            className="grid grid-cols-[minmax(0,1fr)_76px_58px_58px] items-center gap-2 border-t border-dotted border-rose-200 px-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(125px,190px)_minmax(95px,145px)_80px] sm:gap-3 sm:px-6"
          >
            <div className="flex items-start gap-3 min-w-0">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-12 w-12 shrink-0 rounded-lg border border-rose-200 object-cover bg-white shadow-2xs"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-rose-200 bg-rose-50/50 text-rose-300">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-bold leading-relaxed text-gray-900">{product.name}</h2>
                {product.details.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed text-gray-700">
                    {product.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="text-right text-[11px] font-semibold leading-snug tabular-nums text-gray-900 sm:text-center sm:text-sm">
              {formatPrice(product)}
            </div>
            <div className="text-right text-xs leading-snug text-gray-700 sm:text-center sm:text-sm">
              {product.unit}
            </div>
            <div className="flex justify-end gap-1 print:hidden">
              <button
                type="button"
                aria-label={`Sửa ${product.name}`}
                title="Sửa sản phẩm"
                onClick={() => openEdit(product)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-rose-700"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Xóa ${product.name}`}
                title="Xóa sản phẩm"
                onClick={() => void remove(product)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
        {visibleProducts.length === 0 && (
          <div className="border-t border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
            Chưa có sản phẩm phù hợp.
          </div>
        )}
      </section>

      <footer className="flex flex-wrap justify-between gap-2 text-xs text-gray-500">
        <span>Giá tính bằng đồng Việt Nam (VND).</span>
        <span>* Găng nén có nhiều thương hiệu và mức giá theo mẫu.</span>
      </footer>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={save}
            onPaste={handleFormPaste}
            className="w-full max-w-xl max-h-[92vh] overflow-y-auto space-y-4 rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setShowForm(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Tên sản phẩm */}
              <label className="space-y-1 text-sm font-semibold sm:col-span-2">
                Tên sản phẩm
                <input
                  required
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  placeholder="Nhập tên sản phẩm..."
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 font-normal outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                />
              </label>

              {/* Hình ảnh sản phẩm (Tải lên / Dán / Kéo thả & Xem trước) */}
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-rose-700" />
                    <span>Hình ảnh sản phẩm</span>
                  </label>
                  <span className="text-xs text-gray-500 font-normal">Tải tệp, kéo thả hoặc dán ảnh (Ctrl+V)</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                {form.image_url ? (
                  /* BẢN XEM TRƯỚC HÌNH ẢNH */
                  <div className="relative flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-rose-200 bg-rose-50/40 p-3.5">
                    <div className="relative shrink-0">
                      <img
                        src={form.image_url}
                        alt="Bản xem trước sản phẩm"
                        className="h-28 w-28 rounded-lg border border-rose-300 object-cover bg-white shadow-2xs"
                      />
                      {uploadingImage && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/50 text-white text-xs">
                          <Loader2 className="h-6 w-6 animate-spin mb-1" />
                          <span>Đang tải...</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Ảnh xem trước đã nạp</span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 break-all">
                        {form.image_url.startsWith('data:') ? 'Ảnh từ bộ nhớ tạm (Base64)' : form.image_url}
                      </p>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Đổi ảnh khác</span>
                        </button>
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={handleClipboardButtonClick}
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
                        >
                          <Clipboard className="h-3.5 w-3.5" />
                          <span>Dán ảnh mới (Ctrl+V)</span>
                        </button>
                        <button
                          type="button"
                          disabled={uploadingImage}
                          onClick={handleRemoveImage}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 shadow-2xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Xóa ảnh</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* KHUNG TẢI / KÉO THẢ / DÁN ẢNH KHI CHƯA CÓ ẢNH */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-rose-600 bg-rose-50/70 scale-[0.99]'
                        : 'border-gray-300 bg-gray-50/60 hover:border-rose-400 hover:bg-rose-50/30'
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700 group-hover:scale-110 transition-transform mb-2">
                      {uploadingImage ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Upload className="h-6 w-6" />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      {uploadingImage ? 'Đang xử lý tải ảnh lên...' : 'Nhấn để chọn ảnh từ máy hoặc kéo thả vào đây'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Hoặc chụp màn hình / copy ảnh rồi nhấn{' '}
                      <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-gray-700 shadow-2xs">
                        Ctrl + V
                      </kbd>{' '}
                      để dán ảnh ngay
                    </p>
                    <div
                      className="mt-3 flex flex-wrap items-center justify-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-md bg-white border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
                      >
                        <Upload className="h-3.5 w-3.5 text-rose-700" />
                        <span>Chọn tệp ảnh từ máy</span>
                      </button>
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={handleClipboardButtonClick}
                        className="inline-flex items-center gap-1.5 rounded-md bg-white border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
                      >
                        <Clipboard className="h-3.5 w-3.5 text-rose-700" />
                        <span>Dán từ bộ nhớ tạm (Ctrl+V)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Nhóm */}
              <label className="space-y-1 text-sm font-semibold">
                Nhóm
                <select
                  value={form.category}
                  onChange={(event) => update('category', event.target.value as ProductGroup)}
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 font-normal outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                >
                  {groups.slice(1).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              {/* Đơn vị */}
              <label className="space-y-1 text-sm font-semibold">
                Đơn vị
                <input
                  required
                  value={form.unit}
                  onChange={(event) => update('unit', event.target.value)}
                  placeholder="1 chai"
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 font-normal outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                />
              </label>

              {/* Giá từ */}
              <label className="space-y-1 text-sm font-semibold">
                Giá từ
                <input
                  required
                  type="number"
                  min="0"
                  value={form.price_min}
                  onChange={(event) => update('price_min', event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 font-normal outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                />
              </label>

              {/* Giá đến */}
              <label className="space-y-1 text-sm font-semibold">
                Giá đến
                <input
                  required
                  type="number"
                  min="0"
                  value={form.price_max}
                  onChange={(event) => update('price_max', event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 font-normal outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                />
              </label>

              {/* Thương hiệu / chi tiết */}
              <label className="space-y-1 text-sm font-semibold sm:col-span-2">
                Thương hiệu / chi tiết
                <textarea
                  rows={3}
                  value={form.details}
                  onChange={(event) => update('details', event.target.value)}
                  placeholder="Mỗi dòng một chi tiết"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                />
              </label>

              {/* Thứ tự */}
              <label className="space-y-1 text-sm font-semibold">
                Thứ tự
                <input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(event) => update('sort_order', event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 font-normal outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={busy || uploadingImage}
                className="inline-flex items-center gap-1.5 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu sản phẩm</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } body { background: white !important; } .admin-sidebar, .admin-header, .admin-mobile-only { display: none !important; } }`}</style>
    </main>
  );
};

export default W19_HomeProducts;
