"use client";
import React, { useEffect, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { Sidebar } from '../components/Sidebar';
import { ConversationList } from '../components/ConversationList';
import { ChatPanel } from '../components/ChatPanel';
import { Auth } from '../components/Auth';
import { ContactInfo } from '../components/ContactInfo';
import { TopHeader } from '../components/TopHeader';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-[#f3f4f6]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[#139d78] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium">Loading ChatFlow...</p>
    </div>
  </div>
);

export default function Page() {
  const { currentUser, isInfoOpen, activeConversation, isLoading } = useChat();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Auth />;
  }

  return (
   <div className={`flex h-screen w-screen bg-[#f3f4f6] overflow-hidden ${isMobile ? 'p-0' : 'py-6 pr-6 '}`}> 

  <div className={`flex w-full h-full overflow-hidden bg-transparent ${isMobile ? 'flex-col-reverse' : 'flex-row'}`}>
    
    <Sidebar isMobile={isMobile} />

    <div className="flex flex-col flex-1 overflow-hidden">
      {!isMobile && <TopHeader />}
      
      {/* Container for List and Panel - adding a border-top to separate from Header */}
      <div className="flex flex-1 overflow-hidden relative border-t border-gray-100">
        
        {(!isMobile || !activeConversation) && (
          <div className={`${isMobile ? 'w-full' : 'w-[350px]'} flex h-full border-r border-gray-100`}>
            <ConversationList />
          </div>
        )}

        {(!isMobile || activeConversation) && (
          <div className="flex-1 bg-transparent"> {/* Light gray background for chat area */}
            <ChatPanel isMobile={isMobile} />
          </div>
        )}

        {isInfoOpen && <ContactInfo isMobile={isMobile} />}
      </div>
    </div>
  </div>
</div>
  );
}
