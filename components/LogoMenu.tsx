
import React, { useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';

export const LogoMenu: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const { closeLogoMenu, logout, currentUser } = useChat();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeLogoMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeLogoMenu]);

  const MenuItem = ({ icon, label, onClick, destructive = false }: { icon: React.ReactNode, label: string, onClick?: () => void, destructive?: boolean }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group ${destructive ? 'text-gray-900' : 'text-gray-900'}`}
    >
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-gray-600 transition-colors">
        {icon}
      </div>
      <span className="text-[14px] font-medium">{label}</span>
    </button>
  );

  return (
    <div 
      ref={menuRef}
      className={`absolute w-[280px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200 ${
        isMobile 
          ? 'bottom-[74px] left-1/2 -translate-x-1/2 origin-bottom' 
          : 'top-4 left-20 origin-top-left'
      }`}
    >
      <div className="p-4 space-y-2">
        <button className="w-full flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </div>
          <span className="text-[13px] font-semibold text-gray-900">Go back to dashboard</span>
        </button>
      </div>

      <div className="h-px bg-gray-50"></div>

      <div className="px-5 py-4">
        <h4 className="text-[15px] font-bold text-gray-900 leading-tight">{currentUser?.name || 'User'}</h4>
        <p className="text-[12px] text-gray-400 mt-0.5">{currentUser?.email || 'user@example.com'}</p>
      </div>

      <div className="px-4 pb-4">
        <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-4">
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Credits</p>
              <p className="text-[18px] font-bold text-gray-900">20 left</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Renews in</p>
              <p className="text-[14px] font-bold text-gray-900">6h 24m</p>
            </div>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-[#139d78] w-[80%]" />
          </div>
        </div>
      </div>

      <div className="h-px bg-gray-50"></div>

      <div className="py-1">
        <MenuItem 
          label="Theme Style" 
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} 
        />
        <div className="h-px bg-gray-50 mx-4 my-1"></div>
        <MenuItem 
          label="Log out" 
          onClick={logout}
          destructive
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>} 
        />
      </div>
    </div>
  );
};
