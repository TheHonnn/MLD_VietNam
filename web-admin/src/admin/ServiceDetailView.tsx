import React, { useState, useEffect } from 'react';
import {
  Clock,
  Printer,
  Sparkles,
  CreditCard,
  Calendar,
  Pencil,
  CheckCircle2,
  Tag,
  DollarSign,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Check,
  X,
  Share2,
  Eye,
  BadgePercent,
  ListOrdered,
  Leaf,
} from 'lucide-react';
import { Row } from './api';
import { toast } from '../components/common';

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wstvwushpwcdsmhpunvh.supabase.co';
const VALID_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjAxOTQyMCwiZXhwIjoyMTA3NTk1NDIwfQ.lQOiSFP71jtoE6i8NdgEh3G65XTPPDgYvuIzh9R5zBE';

interface RelatedPackage {
  id: string;
  name: string;
  total_sessions: number;
  validity_months: number;
  price: number;
  discount_price?: number;
  is_active: boolean;
}

interface ServiceDetailSheetProps {
  row: Row;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
}

export const ServiceDetailSheet: React.FC<ServiceDetailSheetProps> = ({
  row,
  onClose,
  onEdit,
  onRefresh,
}) => {
  const [isActive, setIsActive] = useState<boolean>(Boolean(row.is_active));
  const [isFeatured, setIsFeatured] = useState<boolean>(Boolean(row.is_featured));
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);
  const [packages, setPackages] = useState<RelatedPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(true);

  const serviceId = row.id;
  const serviceName = row.name || 'Dịch vụ MLD';
  const categoryName = row.category_name || row.service_categories?.name || 'Chăm sóc sức khỏe';
  const categoryCode = row.category_code || row.service_categories?.code || '';
  const slug = row.slug || '';
  const price = Number(row.price || 0);
  const discountPrice = Number(row.discount_price || 0);
  const hasDiscount = discountPrice > 0 && discountPrice < price;
  const discountPercent = hasDiscount ? Math.round(((price - discountPrice) / price) * 100) : 0;
  const duration = Number(row.duration_minutes || 60);
  const imageUrl = row.image_url;
  const shortDesc = row.short_description || '';
  const fullDesc = row.full_description || '';

  // Parse steps (json array of strings)
  const steps: string[] = Array.isArray(row.steps)
    ? row.steps
    : typeof row.steps === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(row.steps);
            return Array.isArray(parsed) ? parsed : [row.steps];
          } catch {
            return row.steps.split('\n').filter(Boolean);
          }
        })()
      : [];

  // Parse benefits (json array of strings)
  const benefits: string[] = Array.isArray(row.benefits)
    ? row.benefits
    : typeof row.benefits === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(row.benefits);
            return Array.isArray(parsed) ? parsed : [row.benefits];
          } catch {
            return row.benefits.split('\n').filter(Boolean);
          }
        })()
      : [];

  // Fetch related packages from Supabase
  useEffect(() => {
    let isMounted = true;
    if (!serviceId) {
      setLoadingPackages(false);
      return;
    }
    setLoadingPackages(true);
    fetch(
      `${SUPABASE_URL}/rest/v1/treatment_packages?service_id=eq.${encodeURIComponent(serviceId)}&select=id,name,total_sessions,validity_months,price,discount_price,is_active`,
      {
        headers: {
          apikey: VALID_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${VALID_SERVICE_ROLE_KEY}`,
        },
      }
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted) {
          setPackages(data || []);
          setLoadingPackages(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingPackages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [serviceId]);

  // Toggle active status
  const handleToggleActive = async () => {
    if (!serviceId) return;
    setIsTogglingStatus(true);
    const nextStatus = !isActive;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/services?id=eq.${encodeURIComponent(serviceId)}`, {
        method: 'PATCH',
        headers: {
          apikey: VALID_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${VALID_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      if (res.ok) {
        setIsActive(nextStatus);
        toast.success(
          nextStatus ? 'Đã bật kinh doanh' : 'Đã tạm ngừng phục vụ',
          `Dịch vụ "${serviceName}" hiện ${nextStatus ? 'sẵn sàng tiếp nhận đặt lịch' : 'tạm dừng nhận khách'}.`
        );
        onRefresh?.();
      } else {
        toast.error('Lỗi cập nhật', 'Không thể thay đổi trạng thái dịch vụ.');
      }
    } catch {
      toast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ Supabase.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Toggle featured status
  const handleToggleFeatured = async () => {
    if (!serviceId) return;
    const nextFeatured = !isFeatured;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/services?id=eq.${encodeURIComponent(serviceId)}`, {
        method: 'PATCH',
        headers: {
          apikey: VALID_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${VALID_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_featured: nextFeatured }),
      });
      if (res.ok) {
        setIsFeatured(nextFeatured);
        toast.success(
          nextFeatured ? 'Đã ghim nổi bật' : 'Đã bỏ ghim nổi bật',
          `Dịch vụ sẽ ${nextFeatured ? 'hiển thị đầu tiên' : 'hiển thị thông thường'} trên danh mục khách hàng.`
        );
        onRefresh?.();
      }
    } catch {
      toast.error('Lỗi', 'Không thể thay đổi trạng thái nổi bật.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* Print-only Header (Hidden on screen) */}
      <div className="hidden print:block pb-4 mb-4 border-b border-[#D8C4B2]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider text-[#8A4F23]">MLD VIỆT NAM · QUY TRÌNH KỸ THUẬT DỊCH VỤ</h1>
            <p className="text-xs text-[#73675F] mt-1">Tài liệu chuẩn hóa kỹ thuật lâm sàng & hướng dẫn quy trình buồng phòng</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-[#2C241E]">{serviceName}</p>
            <p className="text-[#73675F]">Thời lượng: {duration} phút · Danh mục: {categoryName}</p>
          </div>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FAF7F2] via-white to-[#F5ECE3] border border-[#EFE4D9] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Service Thumbnail / Image */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#FAF0E4] border border-[#E8DFD8] shrink-0 shadow-sm">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={serviceName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#985018] gap-1">
                <Leaf className="w-8 h-8 stroke-[1.8]" />
                <span className="text-[10px] font-bold uppercase">MLD SPA</span>
              </div>
            )}
            {isFeatured && (
              <div className="absolute top-1.5 right-1.5 bg-[#FEF9C3] text-[#854D0E] text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-xs border border-[#FEF08A] flex items-center gap-0.5">
                <span>⭐</span>
              </div>
            )}
          </div>

          {/* Service Basic Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                {categoryName}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isActive
                    ? 'bg-[#E8F6ED] text-[#0D6832] border-[#BDE8CD]'
                    : 'bg-[#F5F5F5] text-[#73675F] border-[#E5E5E5]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#0D6832]' : 'bg-[#A3A3A3]'}`} />
                {isActive ? 'Đang kinh doanh' : 'Tạm dừng phục vụ'}
              </span>
              {isFeatured && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF9C3] text-[#854D0E] border border-[#FEF08A] flex items-center gap-1">
                  <span>⭐</span> Dịch vụ nổi bật
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#2C241E] leading-snug">
              {serviceName}
            </h2>

            {slug && (
              <p className="text-xs text-[#8C7A6B] font-mono">
                Mã định danh (Slug): <span className="text-[#985018]">{slug}</span>
              </p>
            )}

            <div className="flex flex-wrap items-baseline gap-3 pt-1">
              {hasDiscount ? (
                <>
                  <span className="text-xl sm:text-2xl font-extrabold text-[#985018]">
                    {discountPrice.toLocaleString('vi-VN')} ₫
                  </span>
                  <span className="text-sm font-medium text-[#A69788] line-through">
                    {price.toLocaleString('vi-VN')} ₫
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
                    Tiết kiệm {discountPercent}% ({ (price - discountPrice).toLocaleString('vi-VN') } ₫)
                  </span>
                </>
              ) : (
                <span className="text-xl sm:text-2xl font-extrabold text-[#2C241E]">
                  {price.toLocaleString('vi-VN')} ₫
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white text-[#73675F] border border-[#E8DFD8]">
                <Clock className="w-3.5 h-3.5 text-[#985018]" />
                Thời lượng: <strong className="text-[#2C241E]">{duration} phút</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Short description quote */}
        {shortDesc && (
          <div className="mt-4 p-3.5 rounded-xl bg-white/80 border border-[#EFE4D9] text-xs text-[#5C4D41] italic leading-relaxed">
            "{shortDesc}"
          </div>
        )}
      </div>

      {/* Main Grid: Clinical Protocol & Benefits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Steps (Quy trình kỹ thuật viên) (8 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F0E6DC]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF0E4] text-[#985018] flex items-center justify-center">
                  <ListOrdered className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2C241E]">
                    Quy Trình Chuẩn Kỹ Thuật Viên ({steps.length} bước)
                  </h3>
                  <p className="text-[11px] text-[#8C7A6B]">
                    Tiêu chuẩn kỹ thuật SOP bắt buộc tại buồng phòng MLD
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#73675F] hover:text-[#2C241E] hover:bg-[#FAF7F2] border border-[#E8DFD8] transition-colors cursor-pointer"
                title="In quy trình dán buồng phòng"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">In SOP</span>
              </button>
            </div>

            {steps.length > 0 ? (
              <div className="mt-4 space-y-3">
                {steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] hover:border-[#D8BDA7] transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#BA7E4C] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#2C241E] leading-relaxed">
                        {step}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#8C7A6B]">
                Chưa có quy trình các bước cho dịch vụ này.
              </div>
            )}
          </div>

          {/* Full description */}
          {fullDesc && (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs">
              <h3 className="text-sm font-bold text-[#2C241E] mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#BA7E4C]" />
                Mô Tả Chi Tiết Liệu Trình
              </h3>
              <p className="text-xs text-[#5C4D41] leading-relaxed whitespace-pre-line">
                {fullDesc}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Benefits & Related Packages (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Benefits Card */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3.5 border-b border-[#F0E6DC]">
              <div className="w-8 h-8 rounded-xl bg-[#E8F6ED] text-[#0D6832] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">
                  Hiệu Quả & Lợi Ích Trị Liệu
                </h3>
                <p className="text-[11px] text-[#8C7A6B]">Cam kết lâm sàng với khách hàng</p>
              </div>
            </div>

            {benefits.length > 0 ? (
              <div className="mt-4 space-y-2">
                {benefits.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9]"
                  >
                    <Check className="w-4 h-4 text-[#0D6832] shrink-0 mt-0.5 stroke-[2.5]" />
                    <span className="text-xs font-medium text-[#2C241E] leading-relaxed">
                      {b}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#8C7A6B]">
                Chưa cập nhật danh sách lợi ích.
              </div>
            )}
          </div>

          {/* Related Combo Treatment Packages */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F0E6DC]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EAF2FA] text-[#1E5D9B] flex items-center justify-center">
                  <Layers className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2C241E]">Gói Liệu Trình Combo</h3>
                  <p className="text-[11px] text-[#8C7A6B]">Gói dài hạn gắn liền với dịch vụ</p>
                </div>
              </div>
              <a
                href={`/manage/treatment_packages?search=${encodeURIComponent(serviceName)}`}
                className="text-xs font-bold text-[#985018] hover:underline inline-flex items-center gap-0.5"
              >
                <span>Xem tất cả</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {loadingPackages ? (
              <div className="py-6 text-center text-xs text-[#8C7A6B]">Đang tìm gói combo...</div>
            ) : packages.length > 0 ? (
              <div className="mt-4 space-y-3">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] hover:border-[#BA7E4C] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#2C241E] leading-snug">
                        {pkg.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF2FA] text-[#1E5D9B] shrink-0">
                        {pkg.total_sessions} buổi
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#EFE4D9]/60 text-xs">
                      <span className="text-[#73675F] text-[11px]">
                        Hạn dùng: <strong>{pkg.validity_months} tháng</strong>
                      </span>
                      <div className="text-right">
                        {pkg.discount_price ? (
                          <div className="font-extrabold text-[#985018]">
                            {pkg.discount_price.toLocaleString('vi-VN')} ₫
                          </div>
                        ) : (
                          <div className="font-extrabold text-[#2C241E]">
                            {pkg.price.toLocaleString('vi-VN')} ₫
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-[#8C7A6B]">Chưa tạo gói combo cho dịch vụ này.</p>
                <a
                  href={`/manage/treatment_packages`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] hover:bg-[#F3E2CE] transition-colors"
                >
                  <span>+ Tạo gói liệu trình mới</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="pt-4 border-t border-[#EFE4D9] flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick toggle Active button */}
          <button
            type="button"
            disabled={isTogglingStatus}
            onClick={handleToggleActive}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              isActive
                ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] hover:bg-[#FEE2E2]'
                : 'bg-[#E8F6ED] text-[#0D6832] border-[#BDE8CD] hover:bg-[#D1F2DE]'
            }`}
          >
            {isActive ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Tạm dừng kinh doanh</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Kích hoạt kinh doanh</span>
              </>
            )}
          </button>

          {/* Quick toggle Featured button */}
          <button
            type="button"
            onClick={handleToggleFeatured}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isFeatured
                ? 'bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]'
                : 'bg-white text-[#73675F] border-[#E8DFD8] hover:bg-[#FAF8F5]'
            }`}
          >
            <span>⭐</span>
            <span>{isFeatured ? 'Bỏ ghim nổi bật' : 'Ghim nổi bật'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Jump to POS */}
          <a
            href={`/cashier-pos?serviceName=${encodeURIComponent(serviceName)}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] hover:bg-[#F3E2CE] transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Tạo đơn tại POS</span>
          </a>

          {/* Jump to Schedule */}
          <a
            href="/staff-schedule"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] hover:bg-[#F3E2CE] transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Xem lịch KTV</span>
          </a>

          {/* Edit button */}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#BA7E4C] text-white hover:bg-[#A36B3D] transition-colors shadow-xs cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Chỉnh sửa dịch vụ</span>
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#73675F] bg-[#FAF8F5] border border-[#E8DFD8] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
