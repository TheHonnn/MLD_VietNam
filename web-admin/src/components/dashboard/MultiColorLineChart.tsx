import React, { useState, useMemo, useRef } from 'react';
import {
  TrendingUp,
  Eye,
  EyeOff,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpRight,
  Info,
} from 'lucide-react';

export interface DailyRevenueItem {
  date: string; // e.g. "16/10/2026"
  shortDate: string; // e.g. "16/10"
  isoDate: string; // e.g. "2026-10-16"
  dayOfWeek?: string; // e.g. "T6"
  total: number;
  service: number;
  package: number;
  tuition: number;
  invoicesCount?: number;
  tuitionsCount?: number;
}

export interface MultiColorLineChartProps {
  data: DailyRevenueItem[];
  branchName?: string;
  dateRangeLabel?: string;
  isLoading?: boolean;
}

type SeriesKey = 'total' | 'service' | 'package' | 'tuition';

interface SeriesDefinition {
  key: SeriesKey;
  name: string;
  shortName: string;
  color: string;
  lightColor: string;
  bgBadge: string;
  textColor: string;
  strokeWidth: number;
  isPrimary?: boolean;
}

const SERIES_CONFIG: SeriesDefinition[] = [
  {
    key: 'total',
    name: 'Tổng thực thu',
    shortName: 'Tổng',
    color: '#985018', // Primary Luxury Copper/Brown
    lightColor: 'rgba(152, 80, 24, 0.12)',
    bgBadge: 'bg-[#FAF0E6]',
    textColor: 'text-[#8E4002]',
    strokeWidth: 2.8,
    isPrimary: true,
  },
  {
    key: 'tuition',
    name: '1. Đào tạo',
    shortName: 'Đào tạo',
    color: '#2860EB', // Brand Medical Blue
    lightColor: 'rgba(40, 96, 235, 0.12)',
    bgBadge: 'bg-[#EFF5FF]',
    textColor: 'text-[#1D4ED8]',
    strokeWidth: 2.0,
  },
  {
    key: 'service',
    name: '2. Dịch vụ trị liệu',
    shortName: 'Trị liệu',
    color: '#16A34A', // Clinical Emerald Green
    lightColor: 'rgba(22, 163, 74, 0.12)',
    bgBadge: 'bg-[#F0FDF4]',
    textColor: 'text-[#15803D]',
    strokeWidth: 2.0,
  },
  {
    key: 'package',
    name: '3. Sản phẩm mang về',
    shortName: 'Sản phẩm',
    color: '#EA580C', // Amber Sunset
    lightColor: 'rgba(234, 88, 12, 0.12)',
    bgBadge: 'bg-[#FFF7ED]',
    textColor: 'text-[#C2410C]',
    strokeWidth: 2.0,
  },
];

// Helper to format currency in VND
const formatVND = (num: number): string => {
  return `${num.toLocaleString('vi-VN')}đ`;
};

// Compact currency format for Y-axis (e.g. "15 tr", "500k")
const formatVNDCompact = (num: number): string => {
  if (num === 0) return '0đ';
  if (num >= 1000000) {
    const tr = num / 1000000;
    return tr % 1 === 0 ? `${tr} tr` : `${tr.toFixed(1).replace('.', ',')} tr`;
  }
  if (num >= 1000) {
    return `${Math.round(num / 1000)}k`;
  }
  return `${num}đ`;
};

// Smooth cubic Bezier spline path generator through points
function generateSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom tangent tension conversion to Bezier control points
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

// Generates closed polygon path for area gradient fill under the line
function generateAreaPath(points: { x: number; y: number }[], baseY: number): string {
  if (points.length < 2) return '';
  const curve = generateSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${curve} L ${last.x.toFixed(1)} ${baseY.toFixed(1)} L ${first.x.toFixed(1)} ${baseY.toFixed(1)} Z`;
}

export const MultiColorLineChart: React.FC<MultiColorLineChartProps> = ({
  data,
  branchName = 'Tất cả chi nhánh',
  dateRangeLabel = '09/10/2026 – 16/10/2026',
  isLoading = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Visibility toggle for each series line
  const [visibleSeries, setVisibleSeries] = useState<Record<SeriesKey, boolean>>({
    total: true,
    service: true,
    package: true,
    tuition: true,
  });

  // Highlighted series on legend hover
  const [highlightedSeries, setHighlightedSeries] = useState<SeriesKey | null>(null);

  // Active hover point index for tooltip
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Display style options
  const [isSmooth, setIsSmooth] = useState(true);
  const [showValuesOnPoints, setShowValuesOnPoints] = useState(true);

  // Toggle single series
  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries((prev) => {
      // Don't allow turning off all series
      const currentActiveCount = Object.values(prev).filter(Boolean).length;
      if (prev[key] && currentActiveCount <= 1) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  // Isolate a single series on double-click / alt click
  const isolateSeries = (key: SeriesKey) => {
    setVisibleSeries({
      total: key === 'total',
      service: key === 'service',
      package: key === 'package',
      tuition: key === 'tuition',
    });
  };

  // Reset to all series visible
  const resetAllSeries = () => {
    setVisibleSeries({
      total: true,
      service: true,
      package: true,
      tuition: true,
    });
  };

  // Aggregated totals for each series
  const seriesTotals = useMemo(() => {
    return {
      total: data.reduce((s, d) => s + d.total, 0),
      service: data.reduce((s, d) => s + d.service, 0),
      package: data.reduce((s, d) => s + d.package, 0),
      tuition: data.reduce((s, d) => s + d.tuition, 0),
    };
  }, [data]);

  // Peak day information
  const peakDay = useMemo(() => {
    if (data.length === 0) return null;
    let maxItem = data[0];
    for (const d of data) {
      if (d.total > maxItem.total) {
        maxItem = d;
      }
    }
    return maxItem;
  }, [data]);

  // Average revenue per day
  const averageRevenue = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.round(seriesTotals.total / data.length);
  }, [data, seriesTotals.total]);

  // Coordinate system constants
  const viewBoxWidth = 860;
  const viewBoxHeight = 260;
  const paddingLeft = 70;
  const paddingRight = 35;
  const paddingTop = 35;
  const paddingBottom = 42;

  const chartWidth = viewBoxWidth - paddingLeft - paddingRight;
  const chartHeight = viewBoxHeight - paddingTop - paddingBottom;
  const baseY = paddingTop + chartHeight;

  // Compute maximum Y bound with headroom
  const maxDataVal = useMemo(() => {
    let max = 0;
    for (const d of data) {
      if (visibleSeries.total && d.total > max) max = d.total;
      if (visibleSeries.service && d.service > max) max = d.service;
      if (visibleSeries.package && d.package > max) max = d.package;
      if (visibleSeries.tuition && d.tuition > max) max = d.tuition;
    }
    if (max <= 0) return 5000000;
    // Round up to nice number with 15% headroom
    const target = max * 1.15;
    const magnitude = Math.pow(10, Math.floor(Math.log10(target)));
    const rounded = Math.ceil(target / magnitude) * magnitude;
    return Math.max(rounded, 5000000);
  }, [data, visibleSeries]);

  // Grid steps (4 horizontal intervals)
  const yGridSteps = [0, 0.25, 0.5, 0.75, 1];

  // Coordinates mapping
  const pointsMap = useMemo(() => {
    const n = data.length;
    if (n === 0) return { total: [], service: [], package: [], tuition: [] };

    const getX = (i: number) => {
      if (n === 1) return paddingLeft + chartWidth / 2;
      return paddingLeft + (i / (n - 1)) * chartWidth;
    };

    const getY = (val: number) => {
      return baseY - (val / maxDataVal) * chartHeight;
    };

    return {
      total: data.map((d, i) => ({ x: getX(i), y: getY(d.total), val: d.total, data: d })),
      service: data.map((d, i) => ({ x: getX(i), y: getY(d.service), val: d.service, data: d })),
      package: data.map((d, i) => ({ x: getX(i), y: getY(d.package), val: d.package, data: d })),
      tuition: data.map((d, i) => ({ x: getX(i), y: getY(d.tuition), val: d.tuition, data: d })),
    };
  }, [data, maxDataVal, baseY, chartHeight, chartWidth, paddingLeft]);

  // Mouse move handler over SVG to find nearest index
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const relativeX = clientX - rect.left;
    const svgX = (relativeX / rect.width) * viewBoxWidth;

    if (svgX < paddingLeft - 20 || svgX > viewBoxWidth - paddingRight + 20) {
      setHoveredIdx(null);
      return;
    }

    const n = data.length;
    if (n <= 1) {
      setHoveredIdx(0);
      return;
    }

    const clampedX = Math.max(paddingLeft, Math.min(viewBoxWidth - paddingRight, svgX));
    const stepWidth = chartWidth / (n - 1);
    const closestIdx = Math.round((clampedX - paddingLeft) / stepWidth);
    setHoveredIdx(Math.max(0, Math.min(n - 1, closestIdx)));
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  const hoveredData = hoveredIdx !== null ? data[hoveredIdx] : null;
  const hoveredX =
    hoveredIdx !== null && data.length > 0
      ? data.length === 1
        ? paddingLeft + chartWidth / 2
        : paddingLeft + (hoveredIdx / (data.length - 1)) * chartWidth
      : null;

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#EFE4D9] shadow-xs select-none">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#2C241E]">Thực thu theo ngày</h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF0E6] text-[#8E4002] border border-[#EFE4D9]">
              <TrendingUp className="w-3 h-3 text-[#985018]" /> Biểu đồ đường chi tiết
            </span>
          </div>
          <p className="text-[11px] text-[#8A796B] mt-0.5">
            Đơn vị: VNĐ • Đã thu thực tế theo ngày •{' '}
            <span className="font-semibold text-[#985018]">{branchName}</span>
          </p>
        </div>

        {/* Top Badges & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Range Badge */}
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#FAF0E6] text-[#8A4F23] border border-[#EFE4D9] flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#985018]" />
            {dateRangeLabel}
          </span>

          {/* Toggle Curves Mode */}
          <button
            type="button"
            onClick={() => setIsSmooth(!isSmooth)}
            title={isSmooth ? 'Chuyển sang đường gấp khúc' : 'Chuyển sang đường cong mềm'}
            className="text-[10.5px] font-medium px-2 py-1 rounded-lg border border-[#E0D7CC] text-[#5C5046] hover:bg-[#FAF8F5] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-[#985018]" />
            {isSmooth ? 'Đường mượt' : 'Đường thẳng'}
          </button>

          {/* Toggle Point Values */}
          <button
            type="button"
            onClick={() => setShowValuesOnPoints(!showValuesOnPoints)}
            title="Bật/tắt nhãn giá trị trực tiếp trên các điểm thu"
            className={`text-[10.5px] font-medium px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
              showValuesOnPoints
                ? 'border-[#985018] bg-[#FAF0E6] text-[#8E4002] font-semibold'
                : 'border-[#E0D7CC] text-[#73675F] hover:bg-[#FAF8F5]'
            }`}
          >
            {showValuesOnPoints ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Hiện số
          </button>
        </div>
      </div>

      {/* 2. Interactive Multi-Color Legend Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-[#EFE4D9]">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {SERIES_CONFIG.map((series) => {
            const isVisible = visibleSeries[series.key];
            const isHovered = highlightedSeries === series.key;
            const amount = seriesTotals[series.key];

            return (
              <button
                key={series.key}
                type="button"
                onClick={() => toggleSeries(series.key)}
                onMouseEnter={() => setHighlightedSeries(series.key)}
                onMouseLeave={() => setHighlightedSeries(null)}
                title={`Nhấp để bật/tắt đường "${series.name}". Tổng kỳ: ${formatVND(amount)}`}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition-all border cursor-pointer ${
                  isVisible
                    ? `${series.bgBadge} border-transparent shadow-2xs`
                    : 'bg-white border-[#E0D7CC] opacity-45 hover:opacity-75'
                } ${isHovered ? 'ring-2 ring-offset-1' : ''}`}
                style={{
                  outlineColor: series.color,
                }}
              >
                {/* Color Dot with Eye Indicator */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
                  style={{ backgroundColor: isVisible ? series.color : '#A8988A' }}
                />

                <span
                  className={`text-[11px] font-semibold transition-colors ${
                    isVisible ? series.textColor : 'text-[#8C7E72] line-through'
                  }`}
                >
                  {series.name}:
                </span>

                <span
                  className={`text-[11px] font-bold ${
                    isVisible ? series.textColor : 'text-[#8C7E72]'
                  }`}
                >
                  {formatVND(amount)}
                </span>
              </button>
            );
          })}

          {/* Quick Reset Button if some series are hidden */}
          {Object.values(visibleSeries).some((v) => !v) && (
            <button
              type="button"
              onClick={resetAllSeries}
              className="text-[10px] font-medium text-[#985018] underline hover:text-[#783D19] px-1 py-0.5"
            >
              Hiện tất cả
            </button>
          )}
        </div>

        {/* Mini Performance Indicators */}
        <div className="flex items-center gap-3 text-[10.5px] text-[#73675F] ml-auto">
          {peakDay && peakDay.total > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[#8C7E72]">Đỉnh điểm:</span>
              <span className="font-bold text-[#8E4002] bg-[#FAF0E6] px-1.5 py-0.5 rounded">
                {peakDay.shortDate} ({formatVNDCompact(peakDay.total)})
              </span>
            </div>
          )}
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-[#8C7E72]">Trung bình:</span>
            <span className="font-semibold text-[#2C241E]">{formatVNDCompact(averageRevenue)}/ngày</span>
          </div>
        </div>
      </div>

      {/* 3. Responsive Multi-Color Line Chart Canvas */}
      <div className="relative w-full pt-4 pb-1">
        {isLoading ? (
          <div className="h-56 flex items-center justify-center text-xs text-[#8C7E72] animate-pulse">
            Đang tải dữ liệu biểu đồ...
          </div>
        ) : data.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-xs text-[#8C7E72]">
            <Info className="w-6 h-6 text-[#D5C2B1] mb-1" />
            Không có dữ liệu thu trong khoảng thời gian đã chọn
          </div>
        ) : (
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              className="w-full h-56 sm:h-64 overflow-visible"
              onMouseMove={handleMouseMove}
              onTouchMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onTouchEnd={handleMouseLeave}
            >
              <defs>
                {/* Area Gradients for each series */}
                {SERIES_CONFIG.map((s) => (
                  <linearGradient
                    key={`grad-${s.key}`}
                    id={`area-grad-${s.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={s.color} stopOpacity={s.isPrimary ? 0.22 : 0.12} />
                    <stop offset="90%" stopColor={s.color} stopOpacity="0.0" />
                  </linearGradient>
                ))}

                {/* Soft shadow for tooltips / points */}
                <filter id="point-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.15" />
                </filter>
              </defs>

              {/* A. Horizontal Gridlines & Y-Axis Labels */}
              {yGridSteps.map((step, idx) => {
                const y = baseY - step * chartHeight;
                const valueAtStep = Math.round(step * maxDataVal);
                return (
                  <g key={`y-grid-${idx}`}>
                    {/* Dashed Grid Line */}
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={viewBoxWidth - paddingRight}
                      y2={y}
                      stroke="#EFE4D9"
                      strokeWidth="1"
                      strokeDasharray={step === 0 ? undefined : '3 3'}
                    />
                    {/* Y-Axis Label */}
                    <text
                      x={paddingLeft - 10}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[9.5px] fill-[#8C7E72] font-medium"
                    >
                      {formatVNDCompact(valueAtStep)}
                    </text>
                  </g>
                );
              })}

              {/* B. Area Gradients (rendered underneath the lines) */}
              {SERIES_CONFIG.map((s) => {
                if (!visibleSeries[s.key]) return null;
                const pts = pointsMap[s.key];
                if (!pts || pts.length < 2) return null;
                const areaPath = generateAreaPath(pts, baseY);
                const isFocused = highlightedSeries === null || highlightedSeries === s.key;
                if (!isFocused) return null;

                return (
                  <path
                    key={`area-${s.key}`}
                    d={areaPath}
                    fill={`url(#area-grad-${s.key})`}
                    className="transition-opacity duration-300"
                    opacity={s.isPrimary ? 1 : 0.75}
                  />
                );
              })}

              {/* C. Multi-Color Lines */}
              {SERIES_CONFIG.map((s) => {
                if (!visibleSeries[s.key]) return null;
                const pts = pointsMap[s.key];
                if (!pts || pts.length === 0) return null;

                const linePath = isSmooth
                  ? generateSmoothPath(pts)
                  : `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`;

                const isMuted = highlightedSeries !== null && highlightedSeries !== s.key;

                return (
                  <g key={`line-${s.key}`} className="transition-all duration-300">
                    <path
                      d={linePath}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={isMuted ? 1.5 : s.strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={isMuted ? 0.25 : 1}
                      className="transition-all duration-200"
                    />
                  </g>
                );
              })}

              {/* D. Hover Vertical Guideline */}
              {hoveredX !== null && (
                <line
                  x1={hoveredX}
                  y1={paddingTop - 5}
                  x2={hoveredX}
                  y2={baseY}
                  stroke="#985018"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  className="transition-all duration-75"
                />
              )}

              {/* E. Data Point Circles on Lines */}
              {SERIES_CONFIG.map((s) => {
                if (!visibleSeries[s.key]) return null;
                const pts = pointsMap[s.key];
                if (!pts) return null;
                const isMuted = highlightedSeries !== null && highlightedSeries !== s.key;

                return (
                  <g key={`points-${s.key}`}>
                    {pts.map((pt, i) => {
                      const isHovered = hoveredIdx === i;
                      const hasValue = pt.val > 0;

                      return (
                        <g key={`pt-${s.key}-${i}`} className="transition-all duration-150">
                          {/* Hover Outer Glow Ring */}
                          {isHovered && (
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={8}
                              fill={s.color}
                              fillOpacity="0.25"
                              className="animate-ping-once"
                            />
                          )}

                          {/* Data Circle */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 5.5 : hasValue ? 4 : 2.5}
                            fill="#FFFFFF"
                            stroke={s.color}
                            strokeWidth={isHovered ? 3 : hasValue ? 2.2 : 1.5}
                            opacity={isMuted ? 0.3 : 1}
                            filter="url(#point-glow)"
                            className="cursor-pointer transition-transform duration-150"
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* F. Value Badges on Key Points (Prominent readability matching original screenshot) */}
              {showValuesOnPoints &&
                pointsMap.total.map((pt, i) => {
                  if (pt.val <= 0) return null;
                  const isHovered = hoveredIdx === i;

                  return (
                    <g key={`val-badge-${i}`} className="pointer-events-none">
                      {/* White backdrop pill for crystal-clear readability */}
                      <rect
                        x={pt.x - 36}
                        y={pt.y - 25}
                        width="72"
                        height="18"
                        rx="5"
                        fill="#FFFFFF"
                        stroke="#E0D7CC"
                        strokeWidth="1"
                        className="shadow-xs"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 13}
                        textAnchor="middle"
                        className={`text-[9.5px] font-bold fill-[#8E4002] ${
                          isHovered ? 'scale-105' : ''
                        }`}
                      >
                        {formatVND(pt.val)}
                      </text>
                    </g>
                  );
                })}

              {/* G. X-Axis Date Labels & Ticks */}
              {data.map((d, i) => {
                const x =
                  data.length === 1
                    ? paddingLeft + chartWidth / 2
                    : paddingLeft + (i / (data.length - 1)) * chartWidth;
                const isHovered = hoveredIdx === i;
                const isPeak = peakDay?.isoDate === d.isoDate && d.total > 0;

                return (
                  <g key={`x-axis-${i}`}>
                    {/* Small vertical tick on baseline */}
                    <line
                      x1={x}
                      y1={baseY}
                      x2={x}
                      y2={baseY + 4}
                      stroke={isHovered ? '#985018' : '#D5C2B1'}
                      strokeWidth={isHovered ? '1.5' : '1'}
                    />

                    {/* Short Date: e.g. "16/10" */}
                    <text
                      x={x}
                      y={baseY + 18}
                      textAnchor="middle"
                      className={`text-[10px] font-medium transition-colors ${
                        isHovered
                          ? 'fill-[#985018] font-bold'
                          : isPeak
                          ? 'fill-[#8E4002] font-semibold'
                          : 'fill-[#5C5046]'
                      }`}
                    >
                      {d.shortDate}
                    </text>

                    {/* Day of Week subtitle if provided */}
                    {d.dayOfWeek && (
                      <text
                        x={x}
                        y={baseY + 29}
                        textAnchor="middle"
                        className={`text-[8.5px] ${
                          isHovered ? 'fill-[#985018] font-semibold' : 'fill-[#8C7E72]'
                        }`}
                      >
                        {d.dayOfWeek}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* H. Floating Rich Detail Tooltip */}
            {hoveredIdx !== null && hoveredData && hoveredX !== null && (
              <div
                className="absolute z-20 pointer-events-none transition-all duration-100 ease-out"
                style={{
                  top: '10px',
                  left: `${(hoveredX / viewBoxWidth) * 100}%`,
                  transform:
                    hoveredIdx > data.length / 2
                      ? 'translate(-105%, 0)'
                      : 'translate(5%, 0)',
                }}
              >
                <div className="bg-[#2C241E]/95 backdrop-blur-md text-white px-3.5 py-3 rounded-2xl shadow-xl border border-[#FAF0E6]/10 text-xs min-w-[200px] space-y-2">
                  {/* Tooltip Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-[11px]">
                    <span className="font-bold text-[#F5EBE1] flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-[#D5A064]" />
                      {hoveredData.date} {hoveredData.dayOfWeek ? `(${hoveredData.dayOfWeek})` : ''}
                    </span>
                    {(hoveredData.invoicesCount || hoveredData.tuitionsCount) ? (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/10 text-[#E0D7CC]">
                        {(hoveredData.invoicesCount || 0) + (hoveredData.tuitionsCount || 0)} gd
                      </span>
                    ) : null}
                  </div>

                  {/* Highlighted Total */}
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[#D5C2B1] font-semibold text-[11px]">Tổng thực thu:</span>
                    <span className="text-sm font-extrabold text-[#FCD34D]">
                      {formatVND(hoveredData.total)}
                    </span>
                  </div>

                  {/* Multi-Stream Breakdown */}
                  <div className="space-y-1 pt-1 border-t border-white/10 text-[10.5px]">
                    {/* Dịch vụ */}
                    <div className="flex items-center justify-between text-[#E0D7CC]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                        Dịch vụ Spa:
                      </span>
                      <span className="font-semibold text-white">
                        {formatVND(hoveredData.service)}
                      </span>
                    </div>

                    {/* Gói liệu trình */}
                    <div className="flex items-center justify-between text-[#E0D7CC]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                        Liệu trình & SP:
                      </span>
                      <span className="font-semibold text-white">
                        {formatVND(hoveredData.package)}
                      </span>
                    </div>

                    {/* Học phí */}
                    <div className="flex items-center justify-between text-[#E0D7CC]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                        Học phí Đào tạo:
                      </span>
                      <span className="font-semibold text-white">
                        {formatVND(hoveredData.tuition)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Chart Footer Legend Summary */}
      <div className="mt-3 pt-2.5 border-t border-[#EFE4D9] flex flex-wrap items-center justify-between text-[11px] text-[#8C7E72] gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#985018]" />
          <span>
            Di chuột qua các điểm mốc trên đường để xem chi tiết cơ cấu từng nguồn thu trong ngày.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10.5px]">
            Tổng kỳ: <strong className="text-[#8E4002]">{formatVND(seriesTotals.total)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
