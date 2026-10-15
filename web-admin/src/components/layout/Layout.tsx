import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[#F8F1E8] antialiased text-[#2C241E] font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar - Fixed 240px wide, Pure White, border-r */}
      <Sidebar />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Pure White, border-b */}
        <Header />

        {/* Content Area - Warm Sand Canvas #F8F1E8 */}
        <main className="flex-1 bg-[#F8F1E8] p-6">
          <div className="max-w-[1440px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
