import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout: React.FC = () => {
  const content = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => { content.current?.scrollTo({top:0,left:0}); }, [pathname]);
  return (
    <div className="flex h-dvh overflow-hidden bg-[#F8F1E8] antialiased text-[#2C241E] font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar - Fixed 240px wide, Pure White, border-r */}
      <Sidebar />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 [&>header]:shrink-0">
        {/* Header - Pure White, border-b */}
        <Header />

        {/* Content Area - Warm Sand Canvas #F8F1E8 */}
        <main ref={content} className="flex-1 min-h-0 overflow-auto overscroll-contain bg-[#F8F1E8] p-6">
          <div className="max-w-[1440px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
