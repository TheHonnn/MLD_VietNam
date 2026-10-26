import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Stethoscope,
  ShoppingBag,
  TrendingUp,
  ArrowUpRight,
  Info,
  Sparkles,
  PieChart,
  Percent,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export interface RevenueBreakdownData {
  training: number;   // 1. Đào tạo
  treatment: number;  // 2. Dịch vụ trị liệu
  product: number;    // 3. Sản phẩm mang về
  total?: number;
}

export interface RevenueBreakdownChartProps {
  data: RevenueBreakdownData;
  branchName?: string;
  dateRangeLabel?: string;
  isLoading?: boolean;
}

interface StreamConfig {
  id: 'training' | 'treatment' | 'product';
  order: number;
  name: string;
  subtitle: string;
  color: string;
  lightBg: string;
  borderBadge: string;
  textColor: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  routeLabel: string;
  description: string;
}

const STREAMS: StreamConfig[] = [
  {
    id: 'training',
    order: 1,
    name: 'Đào tạo',
    subtitle: 'Học viện MLD & Khóa học',
    color: '#2860EB', // Brand Medical Blue
    lightBg: 'bg-[#EFF5FF]',
    borderBadge: 'border-[#CCE0FF]',
    textColor: 'text-[#1D4ED8]',
    icon: GraduationCap,
    route: '/academy-enrollment',
    routeLabel: 'Xem Tuyển sinh',
    description: 'Học phí khóa cơ bản & chuyên sâu, đăng ký thi, cọc đào tạo',
  },
  {
    id: 'treatment',
    order: 2,
    name: 'Dịch vụ trị liệu',
    subtitle: 'Khám phù & Liệu trình Vodder',
    color: '#16A34A', // Clinical Emerald
    lightBg: 'bg-[#F0FDF4]',
    borderBadge: 'border-[#DCFCE7]',
    textColor: 'text-[#15803D]',
    icon: Stethoscope,
    route: '/treatment-management',
    routeLabel: 'Xem Bệnh án',
    description: 'Khám phù lâm sàng, dẫn lưu bạch huyết Vodder & các gói phục hồi',
  },
  {
    id: 'product',
    order: 3,
    name: 'Sản phẩm mang về',
    subtitle: 'Vật tư & Chăm sóc tại nhà',
    color: '#EA580C', // Amber Sunset
    lightBg: 'bg-[#FFF7ED]',
    borderBadge: 'border-[#FFEDD5]',
    textColor: 'text-[#C2410C]',
    icon: ShoppingBag,
    route: '/cashier-pos',
    routeLabel: 'Bán tại POS',
    description: 'Tinh dầu bạch huyết MLD, vớ y khoa áp lực, băng ép short-stretch',
  },
];

export const RevenueBreakdownChart: React.FC<RevenueBreakdownChartProps> = ({
  data,
  branchName = 'Toàn hệ thống',
  dateRangeLabel = 'Kỳ này',
  isLoading = false,
}) => {
  const [activeStreamId, setActiveStreamId] = useState<'training' | 'treatment' | 'product' | null>(null);

  const grandTotal = useMemo(() => {
    const sum = data.training + data.treatment + data.product;
    return sum > 0 ? sum : 0;
  }, [data]);

  // Calculations for donut arcs
  const streamMetrics = useMemo(() => {
    const total = grandTotal || 1;
    return {
      training: {
        amount: data.training,
        percent: grandTotal > 0 ? (data.training / total) * 100 : 0,
        formattedPct: grandTotal > 0 ? ((data.training / total) * 100).toFixed(1) : '0.0',
      },
      treatment: {
        amount: data.treatment,
        percent: grandTotal > 0 ? (data.treatment / total) * 100 : 0,
        formattedPct: grandTotal > 0 ? ((data.treatment / total) * 100).toFixed(1) : '0.0',
      },
      product: {
        amount: data.product,
        percent: grandTotal > 0 ? (data.product / total) * 100 : 0,
        formattedPct: grandTotal > 0 ? ((data.product / total) * 100).toFixed(1) : '0.0',
      },
    };
  }, [data, grandTotal]);

  // SVG Donut geometry
  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute strokeDasharray and strokeDashoffset for each slice
  const slices = useMemo(() => {
    if (grandTotal === 0) {
      return [];
    }

    let accumulatedPct = 0;
    return STREAMS.map((stream) => {
      const pct = streamMetrics[stream.id].percent;
      const strokeLength = (pct / 100) * circumference;
      const offset = - (accumulatedPct / 100) * circumference;
      accumulatedPct += pct;

      return {
        ...stream,
        strokeLength,
        offset,
        amount: streamMetrics[stream.id].amount,
        formattedPct: streamMetrics[stream.id].formattedPct,
      };
    });
  }, [grandTotal, circumference, streamMetrics]);

  const activeStream = activeStreamId ? STREAMS.find((s) => s.id === activeStreamId) : null;

  return (
    <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-[#EFE4D9]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FAF0E6] flex items-center justify-center text-[#985018]">
              <PieChart className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#2C241E]">Cơ cấu doanh thu</h3>
          </div>
          <p className="text-[11px] text-[#8A796B] mt-1">
            Phân bổ 3 trụ cột doanh thu: Đào tạo • Trị liệu • Sản phẩm mang về
          </p>
        </div>
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#F4ECE3] text-[#7A3F18] border border-[#EAD8C7] shrink-0">
          3 Nguồn thu
        </span>
      </div>

      {/* Main Visual: Donut Chart + Center Info */}
      <div className="flex flex-col items-center justify-center py-2 relative">
        <div className="relative w-[180px] h-[180px] flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
            {/* Background Base Ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#F4EFEA"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {slices.map((slice) => {
              const isActive = activeStreamId === slice.id;
              return (
                <circle
                  key={slice.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${slice.strokeLength} ${circumference - slice.strokeLength}`}
                  strokeDashoffset={slice.offset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer hover:opacity-90"
                  onMouseEnter={() => setActiveStreamId(slice.id)}
                  onMouseLeave={() => setActiveStreamId(null)}
                />
              );
            })}
          </svg>

          {/* Center Information */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            {activeStream ? (
              <div className="animate-in fade-in zoom-in-95 duration-150">
                <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: activeStream.color }}>
                  {activeStream.order}. {activeStream.name}
                </span>
                <p className="text-base font-extrabold text-[#2C241E] mt-0.5 leading-tight">
                  {streamMetrics[activeStream.id].amount.toLocaleString('vi-VN')}đ
                </p>
                <span className="text-[11px] font-bold text-[#6D5D50]">
                  {streamMetrics[activeStream.id].formattedPct}%
                </span>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-semibold text-[#8C7D70] uppercase tracking-wider">
                  Tổng thực thu
                </span>
                <p className="text-base font-extrabold text-[#2C241E] mt-0.5 leading-tight">
                  {grandTotal.toLocaleString('vi-VN')}đ
                </p>
                <span className="text-[10px] text-[#A39284]">
                  {branchName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Segmented Proportion Bar */}
        <div className="w-full mt-4">
          <div className="w-full h-2.5 bg-[#F0EAE1] rounded-full overflow-hidden flex shadow-inner">
            {STREAMS.map((s) => {
              const pct = streamMetrics[s.id].percent;
              if (pct <= 0) return null;
              return (
                <div
                  key={s.id}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: s.color,
                  }}
                  className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full hover:brightness-110 cursor-pointer"
                  title={`${s.name}: ${streamMetrics[s.id].amount.toLocaleString('vi-VN')}đ (${streamMetrics[s.id].formattedPct}%)`}
                  onMouseEnter={() => setActiveStreamId(s.id)}
                  onMouseLeave={() => setActiveStreamId(null)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 3 Stream Detail Cards */}
      <div className="mt-4 space-y-2.5">
        {STREAMS.map((stream) => {
          const metrics = streamMetrics[stream.id];
          const Icon = stream.icon;
          const isHovered = activeStreamId === stream.id;

          return (
            <div
              key={stream.id}
              onMouseEnter={() => setActiveStreamId(stream.id)}
              onMouseLeave={() => setActiveStreamId(null)}
              className={`p-3 rounded-xl border transition-all duration-200 ${
                isHovered
                  ? 'bg-[#FAF8F5] border-[#BA7E4C] shadow-sm'
                  : 'bg-white border-[#EFE4D9] hover:border-[#D8C4B2]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Left: Icon + Name */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${stream.color}15`, color: stream.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-[#5C5046]">
                        #{stream.order}
                      </span>
                      <h4 className="text-xs font-bold text-[#2C241E]">
                        {stream.name}
                      </h4>
                    </div>
                    <p className="text-[10.5px] text-[#8C7D70]">
                      {stream.subtitle}
                    </p>
                  </div>
                </div>

                {/* Right: Amount & Percent */}
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-[#2C241E]">
                    {metrics.amount.toLocaleString('vi-VN')}đ
                  </div>
                  <div
                    className="text-[10.5px] font-bold inline-flex items-center gap-0.5"
                    style={{ color: stream.color }}
                  >
                    <span>{metrics.formattedPct}%</span>
                  </div>
                </div>
              </div>

              {/* Description & Quick Link */}
              <div className="mt-2 pt-2 border-t border-[#F2EAE1] flex items-center justify-between text-[10.5px] text-[#7A6C60]">
                <span className="truncate max-w-[210px]" title={stream.description}>
                  {stream.description}
                </span>
                <Link
                  to={stream.route}
                  className="font-bold inline-flex items-center gap-0.5 hover:underline shrink-0 ml-1"
                  style={{ color: stream.color }}
                >
                  <span>{stream.routeLabel}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-[#EFE4D9] flex items-center justify-between text-[11px] text-[#8A796B]">
        <span>Kỳ đối chiếu: {dateRangeLabel}</span>
        <span className="font-bold text-[#2C241E]">
          Tổng: {grandTotal.toLocaleString('vi-VN')}đ
        </span>
      </div>
    </div>
  );
};
