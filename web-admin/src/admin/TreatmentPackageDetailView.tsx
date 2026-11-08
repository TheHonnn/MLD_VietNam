import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Pencil,
  CheckCircle2,
  Tag,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Check,
  X,
  BadgePercent,
  ListOrdered,
  Leaf,
  Users,
  Ban,
  Printer,
  ShoppingBag,
} from 'lucide-react';
import { Row } from './api';
import { adminApi } from './api';
import { toast } from '../components/common';
import { supabase } from '../services/supabaseClient';

interface ClientPackageHolder {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_avatar?: string;
  total_sessions: number;
  completed_sessions: number;
  status: string;
  purchased_at: string;
  expires_at?: string;
}

interface LinkedServiceInfo {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  steps: string[];
  benefits: string[];
  category_name?: string;
}

interface TreatmentPackageDetailSheetProps {
  row: Row;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
}

export const TreatmentPackageDetailSheet: React.FC<TreatmentPackageDetailSheetProps> = ({
  row,
  onClose,
  onEdit,
  onRefresh,
}) => {
  const [isActive, setIsActive] = useState<boolean>(Boolean(row.is_active));
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);
  const [holders, setHolders] = useState<ClientPackageHolder[]>([]);
  const [loadingHolders, setLoadingHolders] = useState<boolean>(true);
  const [linkedService, setLinkedService] = useState<LinkedServiceInfo | null>(null);
  const [loadingService, setLoadingService] = useState<boolean>(true);

  const packageId = String(row.id || '');
  const packageName = String(row.name || 'Gói Liệu Trình MLD');
  const serviceId = String(row.service_id || '');
  const totalSessions = Number(row.total_sessions || 0);
  const price = Number(row.price || 0);
  const discountPrice = Number(row.discount_price || 0);
  const validityMonths = Number(row.validity_months || 0);
  const description = String(row.description || '');
  const imageUrl = String(row.image_url || '/spa_massage_banner.png');

  // Giá mỗi buổi thực tế
  const effectivePrice = discountPrice > 0 && discountPrice < price ? discountPrice : price;
  const pricePerSession = totalSessions > 0 ? Math.round(effectivePrice / totalSessions) : 0;

  // So sánh tiết kiệm
  const savingsAmount = discountPrice > 0 && discountPrice < price ? price - discountPrice : 0;
  const savingsPercent = savingsAmount > 0 ? Math.round((savingsAmount / price) * 100) : 0;

  // 1. Tải danh sách khách hàng đang sở hữu gói này
  useEffect(() => {
    let isSubscribed = true;

    async function fetchHolders() {
      setLoadingHolders(true);
      try {
        const { data, error } = await supabase
          .from('user_packages')
          .select(`
            id,
            customer_id,
            total_sessions,
            completed_sessions,
            status,
            purchased_at,
            expires_at,
            customer:users!customer_id (
              id,
              full_name,
              phone,
              avatar_url
            )
          `)
          .eq('package_id', packageId)
          .order('purchased_at', { ascending: false })
          .limit(10);

        if (!error && data && isSubscribed) {
          const mapped: ClientPackageHolder[] = data.map((d: any) => ({
            id: d.id,
            customer_id: d.customer_id,
            customer_name: d.customer?.full_name || d.users?.full_name || 'Khách hàng MLD',
            customer_phone: d.customer?.phone || d.users?.phone || '--',
            customer_avatar: d.customer?.avatar_url || d.users?.avatar_url,
            total_sessions: Number(d.total_sessions || 0),
            completed_sessions: Number(d.completed_sessions || 0),
            status: d.status || 'ACTIVE',
            purchased_at: d.purchased_at,
            expires_at: d.expires_at,
          }));
          setHolders(mapped);
        } else if (isSubscribed) {
          setHolders([]);
        }
      } catch (err) {
        console.warn('Lỗi tải khách hàng gói liệu trình:', err);
      } finally {
        if (isSubscribed) setLoadingHolders(false);
      }
    }

    // 2. Tải thông tin chi tiết dịch vụ đi kèm
    async function fetchLinkedService() {
      if (!serviceId) {
        setLoadingService(false);
        return;
      }
      setLoadingService(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, name, duration_minutes, price, steps, benefits')
          .eq('id', serviceId)
          .single();

        if (!error && data && isSubscribed) {
          const rawSteps = data.steps;
          const parsedSteps = Array.isArray(rawSteps)
            ? rawSteps
            : typeof rawSteps === 'string'
            ? (() => {
                try {
                  const p = JSON.parse(rawSteps);
                  return Array.isArray(p) ? p : [rawSteps];
                } catch {
                  return rawSteps.split('\n').filter(Boolean);
                }
              })()
            : [];

          const rawBenefits = data.benefits;
          const parsedBenefits = Array.isArray(rawBenefits)
            ? rawBenefits
            : typeof rawBenefits === 'string'
            ? (() => {
                try {
                  const p = JSON.parse(rawBenefits);
                  return Array.isArray(p) ? p : [rawBenefits];
                } catch {
                  return rawBenefits.split('\n').filter(Boolean);
                }
              })()
            : [];

          setLinkedService({
            id: data.id,
            name: data.name,
            duration_minutes: Number(data.duration_minutes || 60),
            price: Number(data.price || 0),
            steps: parsedSteps,
            benefits: parsedBenefits,
          });
        }
      } catch (err) {
        console.warn('Lỗi tải dịch vụ đi kèm:', err);
      } finally {
        if (isSubscribed) setLoadingService(false);
      }
    }

    fetchHolders();
    fetchLinkedService();

    return () => {
      isSubscribed = false;
    };
  }, [packageId, serviceId, totalSessions]);

  // Bật / Tắt trạng thái kinh doanh của gói
  const handleToggleActive = async () => {
    setIsTogglingStatus(true);
    const nextState = !isActive;
    try {
      await adminApi('treatment_packages/update', {
        values: { is_active: nextState },
        key: { id: packageId },
        ...(row.updated_at ? { expectedUpdatedAt: row.updated_at } : {}),
      });
      setIsActive(nextState);
      toast.success(
        nextState ? 'Kích hoạt mở bán gói' : 'Tạm ngưng áp dụng gói',
        nextState
          ? `Đã mở bán gói "${packageName}" trên toàn hệ thống.`
          : `Đã tạm ngưng áp dụng gói "${packageName}".`
      );
      onRefresh?.();
    } catch (err: any) {
      console.error('Lỗi cập nhật trạng thái gói:', err);
      toast.error('Lỗi thao tác', err.message || 'Không thể cập nhật trạng thái gói.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Điều hướng mở bán trực tiếp tại POS
  const handleOpenPOS = () => {
    window.location.href = `/cashier-pos?packageId=${encodeURIComponent(packageId)}&packageName=${encodeURIComponent(packageName)}`;
  };

  // Điều hướng sang phân hệ Quản lý Phác đồ & Liệu trình khách hàng
  const handleOpenTreatmentManagement = () => {
    window.location.href = `/treatment-management?packageId=${encodeURIComponent(packageId)}`;
  };

  return (
    <div className="space-y-4 text-[#2C241E] font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header Banner & Identity - Compact 2-row layout */}
      <div className="bg-[#FAF8F5] border border-[#EFE4D9] rounded-2xl p-4 shadow-xs space-y-3">
        {/* Row 1: Badges & Top Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#EFE4D9]/80 pb-3">
          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-[#EAF2FA] text-[#1E5D9B] border border-[#C5DCF2]">
              {totalSessions} buổi liệu trình
            </span>
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Thời hạn {validityMonths} tháng</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#E8F6ED] text-[#0D6832] border-[#C2E8D1]'
                  : 'bg-[#FEF2F2] text-[#B02A37] border-[#F5C2C7]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#0D6832]' : 'bg-[#B02A37]'}`} />
              <span>{isActive ? 'Đang mở bán' : 'Tạm ngưng'}</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={isTogglingStatus}
              className={`h-8 px-2.5 rounded-xl text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                isActive
                  ? 'bg-white hover:bg-[#FEF2F2] text-[#B02A37] border-[#F5C2C7]'
                  : 'bg-white hover:bg-[#E8F6ED] text-[#0D6832] border-[#C2E8D1]'
              }`}
              title="Đổi trạng thái mở bán"
            >
              {isActive ? <Ban className="w-3 h-3" /> : <Check className="w-3 h-3" />}
              <span>{isTogglingStatus ? 'Đang lưu...' : isActive ? 'Ngưng bán' : 'Mở bán'}</span>
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="h-8 px-2.5 bg-white border border-[#D7BBA6] hover:bg-[#FAF8F5] text-[#8A4F23] rounded-xl text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                <span>Chỉnh sửa</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenPOS}
              className="h-8 px-3 bg-[#985018] hover:bg-[#854412] text-white rounded-xl text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Bán gói tại POS</span>
            </button>
          </div>
        </div>

        {/* Row 2: Image & Full-width Title */}
        <div className="flex items-start gap-3.5">
          {/* Thumbnail */}
          <div className="w-28 sm:w-32 h-20 sm:h-22 rounded-xl overflow-hidden border border-[#D7BBA6] shadow-2xs shrink-0 bg-white relative">
            <img
              src={imageUrl}
              alt={packageName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/spa_massage_banner.png';
              }}
            />
            <div className="absolute top-1 left-1 bg-[#8A4F23]/90 text-white text-[8.5px] font-extrabold px-1.5 py-0.2 rounded shadow-2xs">
              GÓI SPA
            </div>
          </div>

          {/* Title & Service info */}
          <div className="flex-1 min-w-0 space-y-1">
            <h1 className="text-base sm:text-lg font-black text-[#3E200C] leading-snug">
              {packageName}
            </h1>

            {linkedService && (
              <p className="text-xs text-[#73675F] flex items-center gap-1.5 font-medium">
                <Leaf className="w-3.5 h-3.5 text-[#8A4F23] shrink-0" />
                <span>
                  Dịch vụ cốt lõi: <strong className="text-[#3E200C]">{linkedService.name}</strong> ({linkedService.duration_minutes} phút/buổi)
                </span>
              </p>
            )}

            {description && (
              <p className="text-[11.5px] text-[#8C7E72] line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Compact Financial Metrics & Value Grid */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Giá bán trọn gói */}
        <div className="space-y-0.5">
          <div className="text-[10.5px] font-bold text-[#8C7E72] uppercase tracking-wider flex items-center justify-between">
            <span>Giá trọn gói</span>
            <DollarSign className="w-3.5 h-3.5 text-[#0D6832]" />
          </div>
          <div className="text-base sm:text-lg font-black text-[#0D6832] tabular-nums">
            {effectivePrice.toLocaleString('vi-VN')}đ
          </div>
          {savingsAmount > 0 ? (
            <div className="text-[10px] text-[#A69788] line-through font-medium">
              Gốc: {price.toLocaleString('vi-VN')}đ
            </div>
          ) : (
            <div className="text-[10px] text-[#8C7E72]">Giá niêm yết chuẩn</div>
          )}
        </div>

        {/* Metric 2: Đơn giá mỗi buổi */}
        <div className="space-y-0.5 sm:border-l sm:border-[#EFE4D9] sm:pl-3">
          <div className="text-[10.5px] font-bold text-[#8C7E72] uppercase tracking-wider flex items-center justify-between">
            <span>Đơn giá buổi</span>
            <Tag className="w-3.5 h-3.5 text-[#1E5D9B]" />
          </div>
          <div className="text-base sm:text-lg font-black text-[#1E5D9B] tabular-nums">
            {pricePerSession.toLocaleString('vi-VN')}đ
          </div>
          <div className="text-[10px] text-[#73675F]">
            Gồm {totalSessions} buổi
          </div>
        </div>

        {/* Metric 3: Tiết kiệm / Ưu đãi */}
        <div className="space-y-0.5 border-t border-[#EFE4D9] pt-2 sm:border-t-0 sm:pt-0 sm:border-l sm:border-[#EFE4D9] sm:pl-3">
          <div className="text-[10.5px] font-bold text-[#8C7E72] uppercase tracking-wider flex items-center justify-between">
            <span>Ưu đãi gói</span>
            <BadgePercent className="w-3.5 h-3.5 text-[#8A4F23]" />
          </div>
          <div className="text-base sm:text-lg font-black text-[#8A4F23]">
            {savingsPercent > 0 ? `-${savingsPercent}%` : 'Ưu đãi VIP'}
          </div>
          <div className="text-[10px] text-[#8A4F23] font-medium truncate">
            {savingsAmount > 0 ? `Tiết kiệm ${savingsAmount.toLocaleString('vi-VN')}đ` : 'Áp dụng giá gói'}
          </div>
        </div>

        {/* Metric 4: Thời hạn */}
        <div className="space-y-0.5 border-t border-[#EFE4D9] pt-2 sm:border-t-0 sm:pt-0 sm:border-l sm:border-[#EFE4D9] sm:pl-3">
          <div className="text-[10.5px] font-bold text-[#8C7E72] uppercase tracking-wider flex items-center justify-between">
            <span>Thời hạn</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#0D6832]" />
          </div>
          <div className="text-base sm:text-lg font-black text-[#2C241E]">
            {validityMonths} Tháng
          </div>
          <div className="text-[10px] text-[#0D6832] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Bảo lưu khi cần</span>
          </div>
        </div>
      </div>

      {/* 3. Phác đồ & Quy trình thực hiện (Gọn gàng) */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3.5 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#F4ECE3] pb-2">
          <div className="flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-[#8A4F23]" />
            <h3 className="text-xs font-extrabold text-[#3E200C]">
              Phác đồ các bước trị liệu ({linkedService?.duration_minutes || 75} phút)
            </h3>
          </div>
          {linkedService && (
            <span className="text-[11px] font-bold text-[#8A4F23] bg-[#FAF0E4] px-2 py-0.5 rounded-lg border border-[#E8DFD8]">
              {linkedService.name}
            </span>
          )}
        </div>

        {linkedService && linkedService.steps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {linkedService.steps.map((st, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] text-[11.5px]"
              >
                <span className="w-4.5 h-4.5 rounded-full bg-[#8A4F23] text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-[#2C241E] font-medium leading-relaxed">{st}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] text-xs text-[#50443D] leading-relaxed">
            {description ||
              'Gói liệu trình chuyên sâu gồm nhiều giai đoạn: Thăm khám soi da, làm sạch chuyên sâu, điều trị bằng tinh chất đặc trị, phục hồi da và massage thư giãn.'}
          </div>
        )}
      </div>

      {/* 4. Danh sách Khách hàng đang sở hữu gói này (Active Clients Tracker) */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3.5 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#F4ECE3] pb-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#8A4F23]" />
            <h3 className="text-xs font-extrabold text-[#3E200C]">
              Khách hàng đang sở hữu gói ({holders.length})
            </h3>
          </div>

          <button
            type="button"
            onClick={handleOpenTreatmentManagement}
            className="text-[11px] font-bold text-[#8A4F23] hover:text-[#723F1A] flex items-center gap-0.5 cursor-pointer transition-colors"
          >
            <span>Quản lý Liệu trình</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {loadingHolders ? (
          <div className="py-4 text-center text-xs text-[#73675F]">
            Đang tải dữ liệu hồ sơ khách hàng...
          </div>
        ) : holders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#EFE4D9] text-[#73675F] font-semibold text-[11px]">
                  <th className="py-2 px-2.5">Khách hàng</th>
                  <th className="py-2 px-2.5">Tiến độ</th>
                  <th className="py-2 px-2.5">Còn lại</th>
                  <th className="py-2 px-2.5">Trạng thái</th>
                  <th className="py-2 px-2.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4ECE3]">
                {holders.map((holder) => {
                  const percent = Math.min(
                    100,
                    Math.round((holder.completed_sessions / holder.total_sessions) * 100)
                  );
                  const remaining = Math.max(0, holder.total_sessions - holder.completed_sessions);

                  return (
                    <tr key={holder.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-2 px-2.5">
                        <div className="font-bold text-[#2C241E] text-xs">{holder.customer_name}</div>
                        <div className="text-[10.5px] text-[#73675F] font-mono">{holder.customer_phone}</div>
                      </td>
                      <td className="py-2 px-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#EFE4D9] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#0D6832] h-full rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#2C241E] text-[11px]">
                            {holder.completed_sessions}/{holder.total_sessions}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2.5">
                        <span className="font-bold text-[#8A4F23] text-xs">
                          {remaining} buổi
                        </span>
                      </td>
                      <td className="py-2 px-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            holder.status === 'COMPLETED'
                              ? 'bg-[#E8F6ED] text-[#0D6832]'
                              : holder.status === 'EXPIRED'
                              ? 'bg-[#FEF2F2] text-[#B02A37]'
                              : 'bg-[#EAF2FA] text-[#1E5D9B]'
                          }`}
                        >
                          {holder.status === 'COMPLETED'
                            ? 'Hoàn thành'
                            : holder.status === 'EXPIRED'
                            ? 'Hết hạn'
                            : 'Đang điều trị'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = `/customer-detail?id=${holder.customer_id}`;
                          }}
                          className="px-2 py-0.5 rounded-lg bg-[#FAF0E4] hover:bg-[#F3E2CE] text-[#8A4F23] font-bold text-[10.5px] transition-colors cursor-pointer inline-flex items-center gap-0.5"
                        >
                          <span>Hồ sơ</span>
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-3 text-center text-xs text-[#73675F]">
            Chưa có khách hàng đăng ký gói này.
          </div>
        )}
      </div>

      {/* 5. Bottom Actions Footer */}
      <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#EFE4D9]">
        <button
          type="button"
          onClick={() => {
            toast.info('In phác đồ liệu trình', 'Đang kết nối lệnh in phác đồ...');
            window.print();
          }}
          className="h-8 px-3 rounded-xl border border-[#D7BBA6] hover:bg-[#FAF8F5] text-[#8A4F23] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>In phác đồ</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 rounded-xl border border-[#E8DFD8] text-[#73675F] hover:bg-[#FAF8F5] text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleOpenPOS}
            className="h-8 px-4 rounded-xl bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Tạo đơn tại POS</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TreatmentPackageDetailSheet;
