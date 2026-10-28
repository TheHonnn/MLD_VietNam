import React from 'react';
import {NavHomeIcon as Home,NavServiceIcon as Sparkles,NavAcademyIcon as GraduationCap,BookOpenIcon as BookOpen,NavProfileIcon as User} from '@/components/Icons';

export type NavTabId = 'home' | 'services' | 'academy' | 'documents' | 'profile';

interface BottomNavProps {
  activeTab: NavTabId;
  onChangeTab: (tab: NavTabId) => void;
  disabled?:boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab,disabled=false }) => {
  const tabs = [
    { id: 'home' as NavTabId, label: 'Trang chủ', icon: Home },
    { id: 'services' as NavTabId, label: 'Dịch vụ', icon: Sparkles },
    { id: 'academy' as NavTabId, label: 'Đào tạo', icon: GraduationCap },
    { id: 'documents' as NavTabId, label: 'Tài liệu', icon: BookOpen },
    { id: 'profile' as NavTabId, label: 'Cá nhân', icon: User },
  ];

  return (
    <nav className="app-bottom-nav absolute bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] shadow-[0_-2px_8px_rgba(0,0,0,0.04)] mx-auto" aria-label="Điều hướng chính">
      <div className="h-[68px] flex items-center justify-around px-2 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={disabled}
              onClick={() => onChangeTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-1 transition-colors"
            >
              <div
                className={`px-3.5 py-1 rounded-xl transition-all duration-200 flex items-center justify-center ${
                  isActive ? 'bg-[#EFF4FE] text-[#2860EB]' : 'bg-transparent text-[#616161]'
                }`}
              >
                <Icon size={22} className="w-[22px] h-[22px]" />
              </div>
              <span
                className={`text-[11.5px] mt-0.5 tracking-tight ${
                  isActive ? 'font-bold text-[#2860EB]' : 'font-medium text-[#616161]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
