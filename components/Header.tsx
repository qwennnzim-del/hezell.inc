
import React from 'react';
import { SidebarIcon, NewChatIcon, CusstzzLogo } from './Icons';

interface HeaderProps {
  title?: string;
  onToggleSidebar: () => void;
  onNewChat: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onToggleSidebar, onNewChat }) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-black/60 backdrop-blur-xl z-30 border-b border-white/[0.05]">
      <nav className="mx-auto px-4 py-3 flex items-center justify-between h-16">
        <button onClick={onToggleSidebar} className="p-2 text-gray-400 hover:text-white transition-colors" aria-label="Menu">
          <SidebarIcon className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col items-center overflow-hidden max-w-[65%] flex-grow">
          {title ? (
            <span className="text-sm font-black text-white truncate w-full text-center tracking-tight animate-fade-in uppercase">
                {title}
            </span>
          ) : (
            <div className="flex items-center gap-2.5 animate-fade-in">
                <CusstzzLogo className="w-5 h-5" />
                <span className="font-black tracking-tighter text-white uppercase text-base">Hezell AI</span>
            </div>
          )}
        </div>
        
        <button onClick={onNewChat} className="p-2 text-gray-400 hover:text-white transition-colors" aria-label="New Chat">
          <NewChatIcon className="w-6 h-6" />
        </button>
      </nav>
    </header>
  );
};

export default Header;
