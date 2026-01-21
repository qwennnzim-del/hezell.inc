
import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, SendIcon, VoiceIcon, CloseIcon, SparklesIcon, SpinnerIcon, FileIcon, CircleEllipsisIcon } from './Icons';
import { ModelType, VoiceName, AgentPersona } from '../types';
import { GoogleGenAI } from "@google/genai";
import ControlsBottomSheet from './ControlsBottomSheet';
import ModelBottomSheet from './ModelBottomSheet';

declare const process: any;

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onVoiceClick: () => void;
  onFileChange: (file: File) => void;
  stagedFile: { url: string; file: File } | null;
  clearStagedFile: () => void;
  model: ModelType;
  onModelChange: (model: ModelType) => void;
  isSearchEnabled: boolean;
  onToggleSearch: () => void;
  isThinkingEnabled?: boolean;
  onToggleThinking?: () => void;
  isTurboEnabled?: boolean;
  onToggleTurbo?: () => void;
  voice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
  persona: AgentPersona;
  onPersonaChange: (persona: AgentPersona) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
    onSendMessage, 
    isLoading, 
    onVoiceClick,
    onFileChange,
    stagedFile,
    clearStagedFile,
    model,
    onModelChange,
    isSearchEnabled,
    onToggleSearch,
    isThinkingEnabled,
    onToggleThinking,
    isTurboEnabled,
    onToggleTurbo,
    voice,
    onVoiceChange,
    persona,
    onPersonaChange
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [isControlsSheetOpen, setIsControlsSheetOpen] = useState(false);
  const [isModelSheetOpen, setIsModelSheetOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSend = () => {
    if ((inputValue.trim() || stagedFile) && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
      setIsEnhanced(false);
    }
  };

  const getModelDisplayName = (m: ModelType) => {
    switch(m) {
        case 'gemini-3-pro-preview': return 'HEZELL ULTRA';
        case 'gemini-2.5-flash-image': return 'HEZELL VISION';
        case 'gemini-flash-lite-latest': return 'HEZELL LITE';
        default: return 'HEZELL FLASH';
    }
  };

  const handleEnhancePrompt = async () => {
    if (!inputValue.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Optimalkan prompt berikut untuk hasil terbaik dari Hezell AI. Output HANYA prompt yang sudah diperbaiki: "${inputValue}"`,
        });
        if (response.text) {
            setInputValue(response.text.trim());
            setIsEnhanced(true);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = inputValue.trim().length > 0 || stagedFile !== null;

  return (
    <div className="relative w-full">
      <div className="max-w-4xl mx-auto px-4 pb-4">
        {stagedFile && (
            <div className="mb-3 p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between animate-fade-in-up">
                <div className="flex items-center gap-3 overflow-hidden">
                    <FileIcon className="h-5 w-5 text-gray-400 shrink-0" />
                    <span className="truncate text-xs text-gray-300 font-mono">{stagedFile.file.name}</span>
                </div>
                <button onClick={clearStagedFile} className="p-1 text-gray-400 hover:text-white transition-colors">
                    <CloseIcon className="w-4 h-4" />
                </button>
            </div>
        )}

        <div className="relative flex flex-col p-1.5 bg-[#121212] rounded-[24px] border border-white/5 shadow-2xl transition-all hover:border-white/10">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={stagedFile ? "Jelaskan modul ini..." : "Tanya Hezell AI..."}
              className="w-full px-4 py-3 bg-transparent text-gray-200 placeholder-gray-600 focus:outline-none resize-none max-h-40 overflow-y-auto text-base"
              disabled={isLoading}
            />
            
            <div className="flex items-center justify-between mt-1 px-1 pb-1">
              <div className="flex items-center gap-1.5">
                  <button onClick={() => setIsControlsSheetOpen(true)} className="p-2 text-gray-500 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                    <CircleEllipsisIcon className="w-5 h-5" />
                  </button>
                  
                  {/* Model Selector as a Name Badge (The "Chip") */}
                  <button 
                    onClick={() => setIsModelSheetOpen(true)} 
                    className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all rounded-full border border-white/10 flex items-center gap-2 group shadow-sm"
                  >
                    <span className="text-[10px] font-black tracking-widest uppercase group-hover:tracking-[0.12em] transition-all">
                        {getModelDisplayName(model)}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                  </button>

                  <button onClick={handleEnhancePrompt} disabled={isEnhancing || !inputValue.trim()} className={`p-2 transition-colors rounded-full hover:bg-white/5 ${isEnhanced ? 'text-blue-400' : 'text-gray-500 hover:text-white'}`}>
                      {isEnhancing ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
                  </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/5">
                    <PlusIcon className="w-5 h-5" />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])} />

                <button onClick={hasContent ? handleSend : onVoiceClick} disabled={isLoading} className={`p-2.5 rounded-full transition-all duration-300 ${hasContent ? 'bg-white text-black hover:scale-105' : 'text-gray-500 hover:text-white'} disabled:opacity-50`}>
                    {hasContent ? <SendIcon className="w-5 h-5" /> : <VoiceIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
        </div>
        
        <p className="text-center text-[9px] text-gray-700 mt-4 font-black tracking-[0.25em] uppercase opacity-40">
          PROPRIETARY NEURAL ENGINE BY HEZELL.INC
        </p>
      </div>

      <ControlsBottomSheet isOpen={isControlsSheetOpen} onClose={() => setIsControlsSheetOpen(false)} isSearchEnabled={isSearchEnabled} onToggleSearch={onToggleSearch} isThinkingEnabled={isThinkingEnabled} onToggleThinking={onToggleThinking} isTurboEnabled={isTurboEnabled} onToggleTurbo={onToggleTurbo} model={model} voice={voice} onVoiceChange={onVoiceChange} persona={persona} onPersonaChange={onPersonaChange} />
      <ModelBottomSheet isOpen={isModelSheetOpen} onClose={() => setIsModelSheetOpen(false)} model={model} onModelChange={onModelChange} />
    </div>
  );
};

export default ChatInput;
