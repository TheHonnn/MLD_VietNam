import React, { useState } from 'react';
import { Branch } from '@/core/types';
import { ChevronDown, MapPin, Bell } from 'lucide-react';

interface AppHeaderProps {
  branches: Branch[];
  activeBranch: Branch | null;
  onSelectBranch: (branch: Branch) => void;
  onOpenNotifications?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  branches,
  activeBranch,
  onSelectBranch,
  onOpenNotifications,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between shadow-xs">
      {/* Brand & Branch Selector */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center overflow-hidden border border-blue-100">
          <img
            src="/assets/logo.png"
            alt="MLD Vietnam"
            className="w-8 h-8 object-contain"
            onError={(e) => {
              // Fallback logo text
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="font-extrabold text-blue-700 text-xs">MLD</span>
        </div>

        <div>
          <div className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider flex items-center">
            <MapPin className="w-3 h-3 mr-1 text-blue-600" />
            Cơ sở điều trị
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-xs font-bold text-gray-800 flex items-center hover:text-blue-600 transition-colors"
            >
              <span className="max-w-[170px] truncate">
                {activeBranch ? activeBranch.name.replace('Trụ sở MLD Việt Nam (5 Master LV3) - Hotline: 096.7786.399', 'Trụ sở Quận 3 - TP.HCM') : 'Chọn chi nhánh'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 ml-1 text-gray-500" />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase">
                    Chọn cơ sở điều trị
                  </div>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        onSelectBranch(b);
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex flex-col transition-colors ${
                        activeBranch?.id === b.id
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{b.name}</span>
                      <span className="text-[10px] text-gray-400 font-normal truncate">
                        {b.address}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action: Hotline & Notification */}
      <div className="flex items-center space-x-2">
        <a
          href="tel:0967786399"
          className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
        >
          096.7786.399
        </a>
        <button
          type="button"
          onClick={onOpenNotifications}
          className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
};

