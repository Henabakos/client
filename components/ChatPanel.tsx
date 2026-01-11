'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { ICONS } from '../constants';

const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm w-fit mb-6 animate-in fade-in slide-in-from-bottom-2">
    <div className="flex gap-1">
      <div className="w-1.5 h-1.5 bg-[#139d78] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-1.5 h-1.5 bg-[#139d78] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-1.5 h-1.5 bg-[#139d78] rounded-full animate-bounce"></div>
    </div>
    <span className="text-[12px] font-medium text-gray-400 ml-1">typing...</span>
  </div>
);

// AI Sparkle Icon for refinement
const AISparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
    <path d="M4 17v2" />
    <path d="M5 18H3" />
  </svg>
);

const MessageBubble: React.FC<{ message: any; isMe: boolean }> = ({ message, isMe }) => {
  // Render status checkmarks - single check for sent/delivered, double check for read
  const renderStatusIcon = () => {
    if (!isMe) return null;
    
    const status = message.status || 'sent';
    const isRead = status === 'read' || status === 'READ';
    
    if (isRead) {
      // Double checkmark for read/seen
      return (
        <svg className="w-4 h-4 text-[#139d78]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 12l5 5L17 7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 12l5 5L22 7" />
        </svg>
      );
    }
    
    // Single checkmark for sent/delivered
    return (
      <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    );
  };

  return (
    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-6 group animate-in fade-in slide-in-from-bottom-2`}>
      <div 
        className={`max-w-[85%] lg:max-w-[70%] px-4 lg:px-5 py-2.5 lg:py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm transition-all ${
          isMe 
            ? 'bg-[#139d78] text-white rounded-tr-none' 
            : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
        }`}
      >
        {message.text}
      </div>
      <div className={`flex items-center gap-1.5 mt-2 text-[10px] lg:text-[11px] text-gray-400 ${isMe ? 'flex-row-reverse' : ''}`}>
        <span>{message.timestamp}</span>
        {renderStatusIcon()}
      </div>
    </div>
  );
};

export const ChatPanel: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const { activeConversation, messages, sendMessage, toggleInfo, setActiveConversation, isTyping, currentUser } = useChat();
  const [inputText, setInputText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toggleNewMessage } = useChat();

  const activeMessages = activeConversation ? messages[activeConversation.id] || [] : [];
  const currentlyTyping = activeConversation ? isTyping[activeConversation.id] : false;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages, currentlyTyping]);

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  const handleBack = () => {
    setActiveConversation(null);
  };

  const handleRefineText = async () => {
    if (!inputText.trim() || isRefining) return;
    
    setIsRefining(true);
    setRefineError(null);
    try {
      const response = await fetch('/api/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: inputText }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setInputText(data.refinedText);
      } else if (response.status === 429) {
        setRefineError('AI quota exceeded. Try again later.');
        setTimeout(() => setRefineError(null), 3000);
      } else {
        setRefineError('Failed to refine text');
        setTimeout(() => setRefineError(null), 3000);
      }
    } catch (error) {
      console.error('Failed to refine text:', error);
      setRefineError('Connection error');
      setTimeout(() => setRefineError(null), 3000);
    } finally {
      setIsRefining(false);
    }
  };

  const isMyMessage = (senderId: string) => {
    return senderId === 'me' || senderId === currentUser?.id;
  };

 
if (!activeConversation) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#f5f7f9] h-full p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: `radial-gradient(#139d7808 1.5px, transparent 0)`, backgroundSize: '24px 24px' }}></div>
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-500 slide-in-from-bottom-4">
        
        {/* Animated Icon Container */}
        <div className="relative mb-8 group cursor-default">
          <div className="absolute inset-0 bg-[#139d78] rounded-full opacity-5 scale-150 animate-pulse"></div>
          <div className="absolute inset-0 bg-[#139d78] rounded-full opacity-10 scale-125 transition-transform group-hover:scale-135 duration-500"></div>
          <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 transition-transform group-hover:-translate-y-1 duration-300">
            <div className="text-[#139d78] scale-125">
              <ICONS.Message />
            </div>
            
            {/* Notification Dot Decoration */}
            <div className="absolute top-0 right-0 w-6 h-6 bg-[#FFB02E] rounded-full border-4 border-[#f5f7f9] shadow-sm"></div>
          </div>
        </div>

        {/* Typography */}
        <h2 className="text-2xl font-bold text-gray-800 mb-3 tracking-tight">It's quiet here...</h2>
        <p className="text-gray-500 text-center max-w-xs mb-8 leading-relaxed">
          Select a conversation from the sidebar or start a new one to begin chatting.
        </p>

        {/* CTA Button */}
        <button 
          onClick={toggleNewMessage}
          className="group flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-[#139d78] border border-gray-200 hover:border-[#139d78]/30 font-semibold rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-95"
        >
          <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          <span>Start New Chat</span>
        </button>
      </div>
    </div>
  );
}

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f5f7f9] relative overflow-hidden transition-all duration-300 lg:rounded-2xl" >
      {/* Header */}
      <div className="h-[72px] lg:h-[84px] bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 z-20 shrink-0">
        <div className="flex items-center gap-3 lg:gap-4">
          {isMobile && (
            <button onClick={handleBack} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div 
            className="flex items-center gap-3 lg:gap-4 cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-xl transition-all"
            onClick={toggleInfo}
          >
            <div className="relative">
              <img src={activeConversation.user.avatar} className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover" alt="" />
              {activeConversation.user.status === 'Online' && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 lg:w-3 lg:h-3 bg-[#139d78] border-2 border-white rounded-full"></div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm lg:text-lg font-bold text-gray-900 leading-tight truncate max-w-[120px] sm:max-w-none">
                  {activeConversation.user.name}
                </h2>
                {activeConversation.isAI && (
                  <span className="bg-[#139d7815] text-[#139d78] text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">AI</span>
                )}
              </div>
              <p className="text-xs text-[#139d78] font-medium transition-colors">
                {currentlyTyping ? 'Typing...' : activeConversation.user.status}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 lg:gap-2">
          {!isMobile && <button className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"><ICONS.Search /></button>}
          <button className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"><ICONS.Phone /></button>
          <button className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"><ICONS.Video /></button>
          <button onClick={toggleInfo} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"><ICONS.More /></button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-4 lg:px-12 py-6 lg:py-8 custom-scrollbar relative"
        style={{ backgroundImage: `radial-gradient(#139d7808 1.5px, transparent 0)`, backgroundSize: '24px 24px' }}
      >
        <div className="flex justify-center mb-8 lg:mb-12">
          <span className="bg-white px-5 py-2 rounded-full text-[10px] lg:text-[12px] font-bold text-gray-400 shadow-sm border border-gray-50">Today</span>
        </div>

        {activeMessages.map((msg, i) => (
          <MessageBubble key={msg.id} message={msg} isMe={isMyMessage(msg.senderId)} />
        ))}

        {currentlyTyping && <TypingIndicator />}
      </div>

      {/* Error Toast */}
      {refineError && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2 z-50">
          {refineError}
        </div>
      )}

      {/* Input */}
      <div className="px-4 lg:px-8 pb-4 lg:pb-8 pt-2">
        <div className="bg-white rounded-[20px] lg:rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center px-4 lg:px-6 py-3 lg:py-4 gap-3 lg:gap-4 focus-within:ring-2 focus-within:ring-[#139d7815] transition-all">
          <input 
            type="text" 
            placeholder="Type any message..."
            className="flex-1 text-sm lg:text-[15px] text-gray-700 bg-transparent focus:outline-none placeholder:text-gray-300 min-w-0"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {/* Microphone - Now on the right as per design */}
            <button className="text-gray-400 hover:text-gray-600 transition-colors hidden sm:block">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </button>

            {/* Emoji */}
            <button className="text-gray-400 hover:text-gray-600 transition-colors hidden lg:block">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            
            {/* Attach */}
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>
            
            {/* AI Refine Button */}
            <button 
              onClick={handleRefineText}
              disabled={!inputText.trim() || isRefining}
              className={`text-gray-400 hover:text-[#139d78] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isRefining ? 'animate-pulse text-[#139d78]' : ''}`}
              title="Refine with AI"
            >
              <AISparkleIcon className="w-5 h-5" />
            </button>
            
            {/* Send */}
            <button 
              onClick={handleSend}
              disabled={currentlyTyping || !inputText.trim()}
              className={`w-10 h-10 lg:w-12 lg:h-12 bg-[#139d78] hover:bg-[#0e8a68] transition-all rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(19,157,120,0.3)] shrink-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ICONS.Send />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};