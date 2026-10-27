import React from 'react';
import { Home, Sparkles, GraduationCap, Activity, User } from 'lucide-react';

export type NavTabId = 'home' | 'services' | 'academy' | 'treatment' | 'profile';

interface BottomNavProps {
  activeTab: NavTabId;
  onChangeTab: (tab: NavTabId) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'home' as NavTabId, label: 'Trang chủ', icon: Home },
    { id: 'services' as NavTabId, label: 'Dịch vụ', icon: Sparkles },
    { id: 'academy' as NavTabId, label: 'Đào tạo', icon: GraduationCap },
    { id: 'treatment' as NavTabId, label: 'Trị liệu', icon: Activity },
    { id: 'profile' as NavTabId, label: 'Cá nhân', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1.5 flex items-center justify-around shadow-lg max-w-md mx-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
              isActive ? 'text-blue-600 scale-105 font-bold' : 'text-gray-400 hover:text-gray-600 font-medium'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}>
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[10.5px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

