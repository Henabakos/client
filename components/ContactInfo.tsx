
import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';

type Tab = 'Media' | 'Link' | 'Docs';

const PDFIcon = () => (
  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
    <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  </div>
);

const LinkItem: React.FC<{ title: string; url: string; icon: string }> = ({ title, url, icon }) => (
  <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer group">
    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center bg-white">
      <img src={icon} alt="" className="w-6 h-6 object-contain" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-semibold text-gray-900 truncate">{title}</h4>
      <p className="text-[11px] text-gray-500 truncate">A new tool that blends your everyday work apps...</p>
    </div>
  </a>
);

const DocItem: React.FC<{ name: string; info: string; type: string }> = ({ name, info, type }) => (
  <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer">
    <PDFIcon />
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-semibold text-gray-900 truncate">{name}</h4>
      <p className="text-[11px] text-gray-500 truncate">{info} • {type}</p>
    </div>
  </div>
);

const MediaGrid = () => {
  const mediaData = [
    { month: 'May', count: 8 },
    { month: 'April', count: 5 },
    { month: 'March', count: 8 },
  ];

  return (
    <div className="space-y-6">
      {mediaData.map((section) => (
        <div key={section.month}>
          <p className="text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-wider">{section.month}</p>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: section.count }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 group cursor-pointer">
                <img
                  src={`https://picsum.photos/seed/${section.month}${i}/200/200`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                  alt=""
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ContactInfo: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const { activeConversation, toggleInfo } = useChat();
  const [activeTab, setActiveTab] = useState<Tab>('Media');

  if (!activeConversation) return null;

  return (
    <div className={`${isMobile ? 'fixed inset-0 w-full' : 'w-[380px] lg:ml-4'} h-full bg-white border-l border-gray-100 flex flex-col relative animate-in slide-in-from-right duration-500 ease-out z-50 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] lg:rounded-xl`}>
      {/* Header */}
      <div className="p-6 lg:p-8 flex items-center justify-between shrink-0">
        <h2 className="text-[18px] lg:text-[20px] font-bold text-gray-900">Contact Info</h2>
        <button
          onClick={toggleInfo}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors group"
        >
          <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Profile Card */}
        <div className="px-6 lg:px-8 flex flex-col items-center text-center pb-8">
          <div className="relative mb-4">
            <img
              src={activeConversation.user.avatar}
              className="w-20 h-20 lg:w-[100px] lg:h-[100px] rounded-full object-cover border-4 border-white shadow-xl"
              alt=""
            />
          </div>
          <h3 className="text-[16px] lg:text-[18px] font-bold text-gray-900">{activeConversation.user.name}</h3>
          <p className="text-[12px] font-medium text-gray-400 mt-0.5">Dnielch@shipz.com</p>

          <div className="grid grid-cols-2 gap-3 w-full mt-6 lg:mt-8">
            <button className="flex items-center justify-center gap-2 py-2.5 lg:py-3 bg-white border border-gray-100 rounded-2xl text-[12px] lg:text-[13px] font-bold text-gray-900 hover:bg-gray-50 transition-all shadow-sm active:scale-95">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Audio
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 lg:py-3 bg-white border border-gray-100 rounded-2xl text-[12px] lg:text-[13px] font-bold text-gray-900 hover:bg-gray-50 transition-all shadow-sm active:scale-95">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" />
              </svg>
              Video
            </button>
          </div>
        </div>

        {/* Tabs and Content */}
        <div className="px-6 lg:px-8 pb-10">
          <div className="flex bg-gray-50 p-1 lg:p-1.5 rounded-2xl mb-8">
            {(['Media', 'Link', 'Docs'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[11px] lg:text-[12px] font-bold rounded-xl transition-all ${activeTab === tab
                  ? 'bg-white shadow-md text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="min-h-0">
            {activeTab === 'Media' && <MediaGrid />}
            {activeTab === 'Link' && (
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-wider">May</p>
                <div className="space-y-2">
                  <LinkItem title="https://basecamp.net/" url="#" icon="https://www.google.com/s2/favicons?domain=basecamp.com&sz=64" />
                  <LinkItem title="https://notion.com/" url="#" icon="https://www.google.com/s2/favicons?domain=notion.so&sz=64" />
                </div>
              </div>
            )}
            {activeTab === 'Docs' && (
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-wider">May</p>
                <div className="space-y-1">
                  <DocItem name="Document Requirement.pdf" info="10 pages • 16 MB" type="pdf" />
                  <DocItem name="User Flow.pdf" info="7 pages • 32 MB" type="pdf" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
