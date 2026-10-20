import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

export interface RealtimeStatusBadgeProps {
  onRefresh?: () => Promise<void> | void;
  className?: string;
  showRecentEvents?: boolean;
}

export const RealtimeStatusBadge: React.FC<RealtimeStatusBadgeProps> = ({
  onRefresh,
  className = '',
  showRecentEvents = true,
}) => {
  const { isLive, status, lastSyncTime, recentEvents, isRefreshing, forceSync, reconnect } =
    useRealtimeSync();

  const [timeAgoText, setTimeAgoText] = useState('Vừa xong');
  const [showDropdown, setShowDropdown] = useState(false);

  // Update "time ago" string every 10 seconds
  useEffect(() => {
    const updateTimeAgo = () => {
      const now = Date.now();
      const diffSec = Math.floor((now - lastSyncTime.getTime()) / 1000);
      if (diffSec < 15) {
        setTimeAgoText('Vừa xong');
      } else if (diffSec < 60) {
        setTimeAgoText(`${diffSec}s trước`);
      } else {
        const diffMin = Math.floor(diffSec / 60);
        setTimeAgoText(`${diffMin}p trước`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000);
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const handleManualRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await forceSync(onRefresh);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Trạng thái kết nối đồng bộ thời gian thực qua WebSocket"
        className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
          isLive
            ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D] hover:bg-[#DCFCE7]'
            : status === 'CONNECTING'
            ? 'bg-[#FEFCE8] border-[#FEF08A] text-[#A16207] hover:bg-[#FEF9C3]'
            : 'bg-[#FDF2F2] border-[#FECACA] text-[#B91C1C] hover:bg-[#FEE2E2]'
        }`}
      >
        {/* Pulsing Status Dot */}
        <span className="relative flex h-2 w-2">
          {isLive && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isLive ? 'bg-[#16A34A]' : status === 'CONNECTING' ? 'bg-[#EAB308]' : 'bg-[#EF4444]'
            }`}
          />
        </span>

        {/* Status Label */}
        <span className="text-[11px] font-bold tracking-tight">
          {isLive ? 'Realtime' : status === 'CONNECTING' ? 'Đang kết nối...' : 'Mất kết nối'}
        </span>

        {/* Sync Time Pill */}
        <span className="hidden sm:inline-block text-[10px] font-normal text-[#166534] opacity-80 border-l border-[#BBF7D0] pl-1.5">
          {timeAgoText}
        </span>

        {/* Small Refresh Trigger */}
        <span
          onClick={handleManualRefresh}
          title="Làm mới dữ liệu tức thì"
          className="p-0.5 rounded hover:bg-black/5 transition-transform"
        >
          <RefreshCw
            className={`w-3 h-3 transition-transform ${isRefreshing ? 'animate-spin text-[#15803D]' : 'opacity-70 group-hover:opacity-100'}`}
          />
        </span>
      </button>

      {/* Popover Card */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-[#EFE4D9] shadow-xl z-50 p-3.5 space-y-3 animate-in fade-in-50 zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#EFE4D9]">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#16A34A]" />
                <span className="text-xs font-bold text-[#2C241E]">
                  Đồng bộ thời gian thực
                </span>
              </div>
              <span
                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                  isLive
                    ? 'bg-[#DCFCE7] text-[#15803D]'
                    : 'bg-[#FEE2E2] text-[#B91C1C]'
                }`}
              >
                {isLive ? 'Websocket Live' : 'Offline'}
              </span>
            </div>

            {/* Status Information */}
            <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EFE4D9] text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#73675F]">Máy chủ:</span>
                <span className="font-semibold text-[#2C241E]">Supabase Cloud</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#73675F]">Lần đồng bộ gần nhất:</span>
                <span className="font-semibold text-[#985018]">
                  {lastSyncTime.toLocaleTimeString('vi-VN')} ({timeAgoText})
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#73675F]">Bảng giám sát:</span>
                <span className="font-medium text-[#2C241E]">
                  Hóa đơn, Lịch hẹn, Học phí, Lớp học
                </span>
              </div>
            </div>

            {/* Recent Events Log */}
            {showRecentEvents && (
              <div>
                <div className="text-[10.5px] font-bold text-[#73675F] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Sự kiện trực tiếp gần đây</span>
                  <span className="text-[9.5px] font-normal text-[#985018]">
                    {recentEvents.length} sự kiện
                  </span>
                </div>

                {recentEvents.length === 0 ? (
                  <div className="py-4 text-center text-[#A8988A] text-xs">
                    <Sparkles className="w-5 h-5 mx-auto mb-1 text-[#D5C2B1]" />
                    Chưa có sự kiện phát sinh mới trong phiên làm việc
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {recentEvents.slice(0, 5).map((evt) => (
                      <div
                        key={evt.id}
                        className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#8C7E72] mb-0.5">
                          <span className="font-bold text-[#985018] uppercase">
                            {evt.table}
                          </span>
                          <span>{evt.timestamp.toLocaleTimeString('vi-VN')}</span>
                        </div>
                        <p className="text-[11px] font-medium text-[#2C241E] line-clamp-2">
                          {evt.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 border-t border-[#EFE4D9] flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex-1 py-1.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
              </button>

              {!isLive && (
                <button
                  type="button"
                  onClick={reconnect}
                  className="px-3 py-1.5 border border-[#E0D7CC] hover:bg-[#FAF8F5] text-xs font-semibold rounded-xl text-[#5C5046] transition-colors cursor-pointer"
                >
                  Kết nối lại
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
