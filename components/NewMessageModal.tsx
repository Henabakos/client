'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';

export const NewMessageModal: React.FC = () => {
  const { closeNewMessage, startNewConversation, allUsers } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeNewMessage();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeNewMessage]);

  const filteredUsers = allUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectUser = async (user: any) => {
    await startNewConversation(user.id);
    closeNewMessage();
  };

  return (
    <div 
      ref={modalRef}
      className={`absolute w-[320px] bg-white rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-[90] animate-in fade-in zoom-in-95 duration-200 ${
        isMobile ? 'top-16 left-1/2 -translate-x-1/2' : 'top-16 left-32'
      }`}
    >
      <div className="p-5">
        <h3 className="text-[15px] font-bold text-gray-900 mb-4">New Message</h3>
        
        <div className="relative mb-4">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            type="text" 
            placeholder="Search name or email" 
            className="w-full bg-[#f8fafc] border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#139d7810] transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-1 max-h-[360px] overflow-y-auto custom-scrollbar">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#f3f4f6] transition-colors text-left group"
            >
              <img src={user.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
              <span className="text-[13px] font-semibold text-gray-700 group-hover:text-gray-900">{user.name}</span>
            </button>
          ))}
          {filteredUsers.length === 0 && (
            <p className="text-center py-4 text-xs text-gray-400">No users found</p>
          )}
        </div>
      </div>
    </div>
  );
};
