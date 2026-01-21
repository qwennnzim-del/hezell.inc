
import React, { useState, useRef, useEffect } from 'react';
import { SidebarIcon, NewChatIcon, ChevronDownIcon, CusstzzLogo } from './Icons';
import { ModelType } from '../types';

interface HeaderProps {
  model: ModelType;
  onModelChange: (model: ModelType) => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
}

const Header: React.FC<HeaderProps> = ({ model, onModelChange, onToggleSidebar, onNewChat }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getModelDisplayName = (m: ModelType) => {
    switch(m) {
        case 'gemini-3-pro-preview': return 'Ultra (GPT-4o)';
        case 'gemini-flash-lite-latest': return 'Lite';
        case 'gemini-2.5-flash-image': return 'Vision (Flux)';
        default: return 'Flash';
    }
  };
  
  const modelDisplayName = getModelDisplayName(model);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleModelSelect = (selectedModel: ModelType) => {
    onModelChange(selectedModel);
    setIsDropdownOpen(false);
  }

  const modelOptions: { id: ModelType; name: string; description: string }[] = [
    { id: 'gemini-3-flash-preview', name: 'Hezell Flash', description: 'Cerdas & Seimbang (Gemini).' },
    { id: 'gemini-flash-lite-latest', name: 'Hezell Lite', description: 'Super Cepat & Ringan.' },
    { id: 'gemini-3-pro-preview', name: 'Hezell Ultra', description: 'ChatGPT / GPT-4o Power.' },
    { id: 'gemini-2.5-flash-image', name: 'Hezell Vision', description: 'Generasi Gambar Flux.' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#0A0A0A]/80 backdrop-blur-xl z-30 border-b border-white/[0.05]">
      <nav className="mx-auto px-4 py-3 flex items-center justify-between h-16">
        <button onClick={onToggleSidebar} className="p-2 text-gray-400 hover:text-white transition-colors" aria-label="Menu">
          <SidebarIcon className="w-6 h-6" />
        </button>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-200 hover:bg-white/5 rounded-full transition-all duration-300 border border-transparent hover:border-white/10"
            aria-haspopup="true"
            aria-expanded={isDropdownOpen}
          >
             <CusstzzLogo className="w-5 h-5" />
            <span className="flex items-center gap-2">
              <span className="font-black tracking-tighter uppercase bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Hezell AI
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span className="text-gray-400 font-medium text-xs tracking-wide uppercase">
                {modelDisplayName}
              </span>
            </span>
            <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full mt-2 w-64 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-30 right-1/2 translate-x-1/2 overflow-hidden animate-fade-in-up">
              <ul className="py-1" role="menu">
                {modelOptions.map((option) => (
                    <li
                      key={option.id}
                      onClick={() => handleModelSelect(option.id)}
                      className="px-4 py-3 hover:bg-white/5 cursor-pointer text-sm transition-colors border-b border-white/[0.03] last:border-0"
                      role="menuitem"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                          <p className={`font-bold tracking-tight ${model === option.id ? 'text-white' : 'text-gray-300'}`}>{option.name}</p>
                          {model === option.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>}
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{option.description}</p>
                    </li>
                ))}
              </ul>
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
