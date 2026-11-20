import React from 'react';
import {
  NavHomeIcon,
  NavServiceIcon,
  NavAcademyIcon,
  BookOpenIcon,
  NavProfileIcon,
} from '@/components/Icons';

export type NavTabId = 'home' | 'services' | 'academy' | 'documents' | 'profile';

const TABS: Array<{ id: NavTabId; label: string; Icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'home', label: 'Trang chủ', Icon: NavHomeIcon },
  { id: 'services', label: 'Dịch vụ', Icon: NavServiceIcon },
  { id: 'academy', label: 'Đào tạo', Icon: NavAcademyIcon },
  { id: 'documents', label: 'Kiến thức', Icon: BookOpenIcon },
  { id: 'profile', label: 'Cá nhân', Icon: NavProfileIcon },
];

export function BottomNav({
  activeTab,
  onChangeTab,
  disabled = false,
}: {
  activeTab: NavTabId;
  onChangeTab: (tab: NavTabId) => void;
  onBranches?: () => void;
  onConsultation?: () => void;
  phone?: string;
  branchActive?: boolean;
  disabled?: boolean;
}) {
  return (
    <nav className="app-bottom-nav matched-bottom-nav" aria-label="Điều hướng chính">
      {TABS.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            className={active ? 'is-active' : undefined}
            aria-current={active ? 'page' : undefined}
            disabled={disabled}
            onClick={() => onChangeTab(id)}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
