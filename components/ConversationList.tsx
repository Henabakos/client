import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
// Assuming types are defined elsewhere, or use 'any' for quick integration
import { Conversation } from '../types'; 
import { NewMessageModal } from './NewMessageModal';

interface ContextMenuState {
  x: number;
  y: number;
  conversationId: string | null;
}

// Helper component for Context Menu Items
const ContextMenuItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  destructive?: boolean; 
  hasSubmenu?: boolean; 
  onClick?: () => void 
}> = ({ icon, label, destructive, hasSubmenu, onClick }) => (
  <button 
    className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-gray-50 text-left ${destructive ? 'text-red-500' : 'text-gray-700'}`}
    onClick={(e) => {
      e.stopPropagation();
      onClick?.();
    }}
  >
    <span className="w-4 h-4 flex items-center justify-center opacity-70">{icon}</span>
    <span className="flex-1">{label}</span>
    {hasSubmenu && (
      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    )}
  </button>
);

const SwipeableConversationItem: React.FC<{
  conv: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}> = ({ conv, isActive, onSelect, onContextMenu }) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const threshold = 70;

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only allow drag on touch or left click
    if (e.button !== 0) return;
    startX.current = e.clientX;
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const currentX = e.clientX;
    const diff = currentX - startX.current;
    // Limit drag distance
    setDragX(Math.max(-100, Math.min(100, diff)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    // If dragged less than 5px, treat as a click
    if (Math.abs(dragX) < 5) {
      onSelect();
    }
    setDragX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl mb-1 select-none touch-none group">
      {/* Background Actions Layer */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <div 
          className="flex flex-col items-center justify-center bg-[#139d78] text-white w-[80px] h-full rounded-l-xl transition-opacity absolute left-0 top-0"
          style={{ opacity: dragX > 0 ? Math.min(1, dragX / threshold) : 0 }}
        >
          <div className="w-2 h-2 bg-white rounded-full mb-1"></div>
          <span className="text-[10px] font-bold">Unread</span>
        </div>
        <div 
          className="flex flex-col items-center justify-center bg-[#139d78] text-white w-[80px] h-full rounded-r-xl transition-opacity absolute right-0 top-0"
          style={{ opacity: dragX < 0 ? Math.min(1, Math.abs(dragX) / threshold) : 0 }}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <span className="text-[10px] font-bold">Archive</span>
        </div>
      </div>

      {/* Foreground Content Layer */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={onContextMenu}
        className={`relative z-10 w-full flex items-start gap-3 p-3.5 transition-all duration-300 cursor-pointer border border-transparent ${
          isActive 
            ? 'bg-[#F3F3EE] border-gray-100' 
            : 'bg-white hover:bg-gray-50'
        }`}
        style={{ 
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s'
        }}
      >
        <div className="relative flex-shrink-0">
          <img src={conv.user.avatar} className="w-[48px] h-[48px] rounded-full object-cover" alt={conv.user.name} />
          {conv.user.status === 'Online' && (
            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-[2px] rounded-full ${isActive ? 'bg-[#139d78] border-[#F3F3EE]' : 'bg-[#139d78] border-white'}`}></div>
          )}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center h-[48px]">
          <div className="flex justify-between items-baseline mb-0.5">
            <h3 className="text-[14px] font-bold text-gray-900 truncate">{conv.user.name}</h3>
            <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">{conv.lastMessageTime}</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-gray-500 truncate pr-2 max-w-[180px]">
              {conv.lastMessage}
            </p>
            {/* Double tick or status icon can go here if needed */}
            {isActive && <div className="w-2 h-2 bg-gray-300 rounded-full"></div>} 
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConversationList: React.FC = () => {
  const { conversations, activeConversation, setActiveConversation, toggleNewMessage, isNewMessageOpen, toggleInfo } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, conversationId: null });
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredConversations = conversations.filter(c => 
    c.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContextMenu = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, conversationId });
  };

  const closeContextMenu = () => {
    setContextMenu({ x: 0, y: 0, conversationId: null });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    // Close on scroll to prevent floating menu detachment
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', closeContextMenu, true);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', closeContextMenu, true);
    };
  }, []);

  return (
    <div className="w-full lg:w-[340px] bg-white flex flex-col h-full border-r border-gray-100 shrink-0 relative lg:rounded-xl">
      {/* Header */}
      <div className="p-5 pb-2 shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-[20px] font-bold text-gray-900">All Message</h1>
          <button 
            onClick={toggleNewMessage}
            className="bg-[#139d78] text-white pl-3 pr-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:bg-[#0e8a68] transition-all shadow-sm active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            New Message
          </button>
        </div>

        {isNewMessageOpen && <NewMessageModal />}

        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input 
              type="text" 
              placeholder="Search in message"
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-11 pr-4 text-[14px] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#139d78]/20 focus:border-[#139d78] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
        <div className="space-y-1">
          {filteredConversations.map((conv) => (
            <SwipeableConversationItem
              key={conv.id}
              conv={conv}
              isActive={activeConversation?.id === conv.id}
              onSelect={() => setActiveConversation(conv)}
              onContextMenu={(e) => handleContextMenu(e, conv.id)}
            />
          ))}
        </div>
      </div>

      {/* Context Menu Portal */}
      {contextMenu.conversationId && (
        <div 
          ref={menuRef}
          className="fixed z-[9999] w-[220px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 230) }}
        >
          <ContextMenuItem 
            label="Mark as unread" 
            onClick={closeContextMenu}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>} 
          />
          <ContextMenuItem 
            label="Archive" 
            onClick={closeContextMenu}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>} 
          />
          <ContextMenuItem 
            label="Mute" 
            hasSubmenu
            onClick={closeContextMenu}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" strokeDasharray="2 2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>} 
          />
          <ContextMenuItem 
            label="Contact info" 
            onClick={() => { toggleInfo(); closeContextMenu(); }}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} 
          />
          <ContextMenuItem 
            label="Export chat" 
            onClick={closeContextMenu}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>} 
          />
          <div className="h-px bg-gray-100 my-1 mx-2"></div>
          <ContextMenuItem 
            label="Clear chat" 
            onClick={closeContextMenu}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>} 
          />
          <ContextMenuItem 
            label="Delete chat" 
            destructive 
            onClick={closeContextMenu}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>} 
          />
        </div>
      )}
    </div>
  );
};