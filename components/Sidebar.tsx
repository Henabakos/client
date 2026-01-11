
import React from 'react';
import Image from 'next/image';
import { ICONS } from '../constants';
import { useChat } from '../context/ChatContext';
import { LogoMenu } from './LogoMenu';

const SidebarItem: React.FC<{ icon: React.ReactNode; active?: boolean; onClick?: () => void; isMobile?: boolean }> = ({ icon, active, onClick, isMobile }) => (
  <button
    onClick={onClick}
    className={`rounded-xl transition-all duration-200 ${active
        ? 'sidebar-btn-active'
        : 'text-gray-400 hover:bg-gray-100'
      } ${isMobile ? 'p-2' : 'p-3'}`}
  >
    {icon}
  </button>
);

export const Sidebar: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const { logout, currentUser, toggleLogoMenu, isLogoMenuOpen } = useChat();

  if (isMobile) {
    return (
      <div className="h-[64px] w-full bg-white border-t border-gray-100 flex items-center justify-around px-4 relative shrink-0">
        <SidebarItem icon={<ICONS.Home />} isMobile />
        <SidebarItem icon={<ICONS.Message />} active isMobile />
        <SidebarItem icon={<ICONS.Explore />} isMobile />
        <SidebarItem icon={<ICONS.Files />} isMobile />
        <button onClick={toggleLogoMenu} className="w-9 h-9 sidebar-logo-btn-mobile">
          {/* <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg> */}
          <Image src="/Container.png" alt="logo" width={36} height={36} />
        </button>
        {isLogoMenuOpen && <LogoMenu isMobile />}
      </div>
    );
  }

  return (
    <div className="w-20 bg-transparent border-r border-gray-100 flex flex-col items-center py-6 gap-8 relative shrink-0 ">
      <button
        onClick={toggleLogoMenu}
        className="w-10 h-10 sidebar-logo-btn"
      >
        <Image src="/Container.png" alt="logo" width={40} height={40} />
      </button>

      {isLogoMenuOpen && <LogoMenu />}

      <div className="flex flex-col gap-4">
        <SidebarItem icon={<ICONS.Home />} />
        <SidebarItem icon={<ICONS.Message />} active />
        <SidebarItem icon={<ICONS.Explore />} />
        <SidebarItem icon={<ICONS.Files />} />
        <SidebarItem icon={<ICONS.Gallery />} />
      </div>

      <div className="mt-auto flex flex-col gap-4 items-center">
        <div className="sidebar-sparkle-btn">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.143-7.714L1 12l6.857-2.286L11 3z" /></svg>
        </div>
        <button className="relative" onClick={logout}>
          <Image
            src={currentUser?.avatar || 'https://picsum.photos/seed/user/40/40'}
            className="profile-avatar object-cover rounded-full"
            alt="Profile"
            width={40}
            height={40}
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        </button>
      </div>
    </div>
  );
};
