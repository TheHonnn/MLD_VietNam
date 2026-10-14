import React from 'react';
import { Box, Text } from 'zmp-ui';
import {
  LeafIcon,
  MonitorIcon,
  ShieldIcon,
  BellIcon,
  TrophyIcon,
  CheckIcon,
} from '@/components/Icons';

interface HeaderFigmaProps {
  userName?: string;
  userRole?: string;
  points?: number;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenAuth?: () => void;
  onOpenAdmin?: () => void;
}

export const HeaderFigma: React.FC<HeaderFigmaProps> = ({
  userName = 'Nguyễn Minh Anh',
  userRole = 'Khách Hàng VIP',
  points = 2450,
  onOpenNotifications,
  onOpenProfile,
  onOpenAuth,
  onOpenAdmin,
}) => {
  return (
    <Box className="bg-gradient-to-r from-[#98501B] via-[#884218] to-[#6E3514] text-white px-4 pt-3 pb-4 rounded-b-3xl shadow-lg relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -top-10 -right-10 w-44 h-44 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-12 -left-12 w-32 h-32 bg-amber-300/10 rounded-full blur-xl pointer-events-none" />

      {/* Top Branding & Mode Switches */}
      <Box className="flex items-center justify-between mb-3 relative z-10">
        <Box className="flex items-center space-x-2.5">
          <Box className="w-10 h-10 rounded-2xl bg-white text-[#98501B] flex items-center justify-center shadow-md border border-white/40">
            <LeafIcon size={22} color="#98501B" />
          </Box>
          <Box>
            <Box className="flex items-center space-x-1.5">
              <Text className="font-bold text-sm text-white tracking-wide leading-none">
                MLD VIETNAM
              </Text>
              <span className="w-4 h-4 rounded-full bg-amber-400 text-[#98501B] flex items-center justify-center text-[10px]">
                <CheckIcon size={10} color="#98501B" />
              </span>
            </Box>
            <Box className="flex items-center space-x-1 mt-0.5">
              <Text className="text-[10px] text-amber-100/90 font-medium">
                Cộng Đồng Dẫn Lưu Bạch Huyết & Đào Tạo Nghề
              </Text>
            </Box>
          </Box>
        </Box>

        <Box className="flex items-center space-x-1.5">
          {/* Web Admin Portal Toggle */}
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="px-2.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-[10px] text-white font-bold flex items-center space-x-1 active:scale-95 transition"
              title="Chuyển sang Web Admin Dashboard"
            >
              <MonitorIcon size={13} color="#FFFFFF" />
              <span className="hidden sm:inline">Web Admin</span>
            </button>
          )}

          {/* Group A Auth Onboarding Trigger */}
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-2.5 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-amber-950 text-[10px] font-bold flex items-center space-x-1 active:scale-95 transition shadow-sm"
              title="Mở giao diện Đăng nhập / Onboarding Group A"
            >
              <ShieldIcon size={12} color="#451A03" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Notification Button */}
          <button
            onClick={onOpenNotifications}
            className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center relative active:scale-90 transition border border-white/20"
          >
            <BellIcon size={16} color="#FFFFFF" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </button>
        </Box>
      </Box>

      {/* User Greeting & VIP Card Pill */}
      <Box
        onClick={onOpenProfile}
        className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 border border-white/25 flex items-center justify-between cursor-pointer active:bg-white/20 transition relative z-10"
      >
        <Box className="flex items-center space-x-3">
          <Box className="relative">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-white/80 shadow"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#98501B]" />
          </Box>
          <Box>
            <Text className="text-[11px] text-amber-100 font-light">
              Xin chào, {userRole}
            </Text>
            <Text className="text-sm font-bold text-white leading-tight">
              {userName}
            </Text>
          </Box>
        </Box>

        {/* Loyalty Points Badge */}
        <Box className="px-3 py-1.5 rounded-xl bg-amber-400 text-amber-950 text-xs font-bold flex items-center space-x-1.5 shadow-sm border border-amber-300">
          <TrophyIcon size={14} color="#451A03" />
          <span>{points.toLocaleString('vi-VN')} Điểm</span>
        </Box>
      </Box>
    </Box>
  );
};
