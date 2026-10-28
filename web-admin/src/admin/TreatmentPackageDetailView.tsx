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
  Eye,
  BadgePercent,
  ListOrdered,
  Leaf,
  Users,
  HeartPulse,
  AlertCircle,
  Ban,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { Row } from './api';
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
  created_at: string;
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
  const totalSessions = Number(row.total_sessions || 5);
  const price = Number(row.price || 0);
  const discountPrice = Number(row.discount_price || 0);
  const validityMonths = Number(row.validity_months || 6);
  const description = String(row.description || '');
  const imageUrl = String(row.image_url || '/spa_massage_banner.png');

  // Giá mỗi buổi thực tế
  const pricePerSession = totalSessions > 0 ? Math.round(price / totalSessions) : price;
  
  // So sánh tiết kiệm: nếu có discount_price > price thì lấy mức chênh, ngược lại tính ước tính 20%
  const referenceOriginalPrice = discountPrice > price ? discountPrice : Math.round(price * 1.25);
  const savingsAmount = referenceOriginalPrice - price;
  const savingsPercent = referenceOriginalPrice > 0 ? Math.round((savingsAmount / referenceOriginalPrice) * 100) : 0;

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
            created_at,
            expires_at,
            users (
              id,
              full_name,
              phone,
              avatar_url
            )
          `)
          .eq('package_id', packageId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && data && isSubscribed) {
          const mapped: ClientPackageHolder[] = data.map((d: any) => ({
            id: d.id,
            customer_id: d.customer_id,
            customer_name: d.users?.full_name || 'Khách hàng MLD',
            customer_phone: d.users?.phone || '--',
            customer_avatar: d.users?.avatar_url,
            total_sessions: Number(d.total_sessions || totalSessions),
            completed_sessions: Number(d.completed_sessions || 0),
            status: d.status || 'ACTIVE',
            created_at: d.created_at,
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
      const { error } = await supabase
        .from('treatment_packages')
        .update({ is_active: nextState })
        .eq('id', packageId);

      if (!error) {
        setIsActive(nextState);
        toast.success(
          nextState ? 'Kích hoạt mở bán gói' : 'Tạm ngưng áp dụng gói',
          nextState
            ? `Đã mở bán gói "${packageName}" trên toàn hệ thống.`
            : `Đã tạm ngưng áp dụng gói "${packageName}".`
        );
        if (onRefresh) onRefresh();
      } else {
        throw error;
      }
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
    <div className="space-y-6 text-[#2C241E] font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header Banner & Identity */}
      <div className="bg-[#FAF8F5] border border-[#EFE4D9] rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          {/* Package Image 16:9 */}
          <div className="w-full sm:w-56 md:w-64 aspect-[16/9] rounded-2xl overflow-hidden border border-[#D7BBA6] shadow-sm shrink-0 bg-white relative">
            <img
              src={imageUrl}
              alt={packageName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/spa_massage_banner.png';
              }}
            />
            <div className="absolute top-2 left-2 bg-[#8A4F23] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs">
              GÓI LIỆU TRÌNH
            </div>
            <div className="absolute bottom-1.5 left-1.5 bg-black/50 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider">
              16:9
            </div>
          </div>

          {/* Title & Metadata */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF2FA] text-[#1E5D9B] border border-[#C5DCF2]">
                {totalSessions} buổi liệu trình
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Thời hạn {validityMonths} tháng</span>
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                  isActive
                    ? 'bg-[#E8F6ED] text-[#0D6832] border-[#C2E8D1]'
                    : 'bg-[#FEF2F2] text-[#B02A37] border-[#F5C2C7]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-[#0D6832]' : 'bg-[#B02A37]'
                  }`}
                />
                <span>{isActive ? 'Đang mở bán' : 'Tạm ngưng'}</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-[#3E200C] leading-snug">
              {packageName}
            </h1>

            {linkedService && (
              <p className="text-xs text-[#73675F] flex items-center gap-1.5 font-medium">
                <Leaf className="w-3.5 h-3.5 text-[#8A4F23]" />
                <span>Dịch vụ cốt lõi: <strong>{linkedService.name}</strong> ({linkedService.duration_minutes} phút/buổi)</span>
              </p>
            )}
          </div>

          {/* Action Buttons Top */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={isTogglingStatus}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isActive
                  ? 'bg-white hover:bg-[#FEF2F2] text-[#B02A37] border-[#F5C2C7]'
                  : 'bg-white hover:bg-[#E8F6ED] text-[#0D6832] border-[#C2E8D1]'
              }`}
              title="Đổi trạng thái mở bán"
            >
              {isActive ? <Ban className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isTogglingStatus ? 'Đang lưu...' : isActive ? 'Ngưng bán' : 'Mở bán'}</span>
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-3.5 py-2 bg-white border border-[#D7BBA6] hover:bg-[#FAF8F5] text-[#8A4F23] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Chỉnh sửa</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenPOS}
              className="px-4 py-2 bg-[#8A4F23] hover:bg-[#723F1A] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Bán gói tại POS</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Financial Metrics & Value Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Giá niêm yết trọn gói */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 space-y-1 shadow-2xs">
          <div className="text-[11px] font-semibold text-[#73675F] flex items-center justify-between">
            <span>Giá bán trọn gói</span>
            <DollarSign className="w-3.5 h-3.5 text-[#8A4F23]" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-[#0D6832]">
            {price.toLocaleString('vi-VN')}đ
          </div>
          {referenceOriginalPrice > price && (
            <div className="text-[11px] text-[#A69788] line-through font-medium">
              {referenceOriginalPrice.toLocaleString('vi-VN')}đ
            </div>
          )}
        </div>

        {/* Card 2: Giá mỗi buổi điều trị */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 space-y-1 shadow-2xs">
          <div className="text-[11px] font-semibold text-[#73675F] flex items-center justify-between">
            <span>Đơn giá mỗi buổi</span>
            <Tag className="w-3.5 h-3.5 text-[#1E5D9B]" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-[#1E5D9B]">
            {pricePerSession.toLocaleString('vi-VN')}đ
          </div>
          <div className="text-[11px] text-[#73675F]">
            Áp dụng cho {totalSessions} buổi
          </div>
        </div>

        {/* Card 3: Quyền lợi tiết kiệm */}
        <div className="bg-[#FFF8F0] rounded-2xl border border-[#F5E5D5] p-4 space-y-1 shadow-2xs">
          <div className="text-[11px] font-semibold text-[#8A4F23] flex items-center justify-between">
            <span>Mức tiết kiệm cho khách</span>
            <BadgePercent className="w-4 h-4 text-[#8A4F23]" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-[#8A4F23]">
            {savingsPercent > 0 ? `-${savingsPercent}%` : 'Ưu đãi VIP'}
          </div>
          <div className="text-[11px] text-[#8A4F23] font-medium">
            Tiết kiệm {savingsAmount.toLocaleString('vi-VN')}đ so với mua lẻ
          </div>
        </div>

        {/* Card 4: Thời hạn & Cam kết */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 space-y-1 shadow-2xs">
          <div className="text-[11px] font-semibold text-[#73675F] flex items-center justify-between">
            <span>Hiệu lực liệu trình</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#0D6832]" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-[#2C241E]">
            {validityMonths} Tháng
          </div>
          <div className="text-[11px] text-[#0D6832] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Bảo lưu buổi điều trị</span>
          </div>
        </div>
      </div>

      {/* 3. Phác đồ & Quy trình thực hiện */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#F4ECE3] pb-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-[#8A4F23]" />
            <h3 className="text-sm font-extrabold text-[#3E200C]">
              Phác đồ các bước trong mỗi buổi trị liệu ({linkedService?.duration_minutes || 75} phút)
            </h3>
          </div>
          {linkedService && (
            <span className="text-xs font-semibold text-[#8A4F23]">
              {linkedService.name}
            </span>
          )}
        </div>

        {linkedService && linkedService.steps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {linkedService.steps.map((st, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] text-xs"
              >
                <span className="w-5 h-5 rounded-full bg-[#8A4F23] text-white text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-[#2C241E] font-medium leading-relaxed">{st}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2 text-xs text-[#50443D] leading-relaxed">
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9]">
              {description ||
                'Gói liệu trình chuyên sâu gồm nhiều giai đoạn: Thăm khám soi da, làm sạch chuyên sâu, điều trị bằng tinh chất đặc trị, phục hồi da và massage thư giãn.'}
            </div>
          </div>
        )}
      </div>

      {/* 4. Danh sách Khách hàng đang sở hữu gói này (Active Clients Tracker) */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#F4ECE3] pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#8A4F23]" />
            <h3 className="text-sm font-extrabold text-[#3E200C]">
              Khách hàng đang sở hữu gói này ({holders.length})
            </h3>
          </div>

          <button
            type="button"
            onClick={handleOpenTreatmentManagement}
            className="text-xs font-bold text-[#8A4F23] hover:text-[#723F1A] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Mở trang Quản lý Liệu trình</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingHolders ? (
          <div className="py-8 text-center text-xs text-[#73675F]">
            Đang tải dữ liệu hồ sơ khách hàng...
          </div>
        ) : holders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#EFE4D9] text-[#73675F] font-semibold">
                  <th className="py-2.5 px-3">Khách hàng</th>
                  <th className="py-2.5 px-3">Tiến độ buổi</th>
                  <th className="py-2.5 px-3">Buổi còn lại</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
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
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#2C241E]">{holder.customer_name}</div>
                        <div className="text-[11px] text-[#73675F] font-mono">{holder.customer_phone}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-[#EFE4D9] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#0D6832] h-full rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#2C241E]">
                            {holder.completed_sessions}/{holder.total_sessions}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-[#8A4F23]">
                          Còn {remaining} buổi
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
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
                            : 'Đang theo liệu trình'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = `/customer-detail?id=${holder.customer_id}`;
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF0E4] hover:bg-[#F3E2CE] text-[#8A4F23] font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Hồ sơ da</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center space-y-2">
            <p className="text-xs text-[#73675F]">
              Chưa có khách hàng nào đăng ký gói này.
            </p>
            <button
              type="button"
              onClick={handleOpenPOS}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8A4F23] text-white text-xs font-bold hover:bg-[#723F1A] transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Mở bán gói đầu tiên tại POS</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Bottom Actions Footer */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#EFE4D9]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              toast.info('In phác đồ liệu trình', 'Đang kết nối lệnh in phác đồ...');
              window.print();
            }}
            className="px-3.5 py-2 rounded-xl border border-[#D7BBA6] hover:bg-[#FAF8F5] text-[#8A4F23] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In phác đồ liệu trình</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E8DFD8] text-[#73675F] hover:bg-[#FAF8F5] text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleOpenPOS}
            className="px-5 py-2 rounded-xl bg-[#8A4F23] hover:bg-[#723F1A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Tạo đơn bán gói tại POS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
