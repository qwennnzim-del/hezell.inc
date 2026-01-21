
import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, SendIcon, VoiceIcon, CloseIcon, SparklesIcon, SpinnerIcon, FileIcon, CircleEllipsisIcon } from './Icons';
import { ModelType, VoiceName, AgentPersona } from '../types';
import { GoogleGenAI } from "@google/genai";
import ControlsBottomSheet from './ControlsBottomSheet';
import ModelBottomSheet from './ModelBottomSheet';

// Fix for "Cannot find name 'process'" error during build
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
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (isEnhanced) setIsEnhanced(false);
  };

  const handleSend = () => {
    if ((inputValue.trim() || stagedFile) && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
      setIsEnhanced(false);
      setIsControlsSheetOpen(false);
      setIsModelSheetOpen(false);
    }
  };

  const getModelDisplayName = (m: ModelType) => {
    switch(m) {
        case 'gemini-3-pro-preview': return 'Hezell Ultra';
        case 'gemini-2.5-flash-image': return 'Hezell Vision';
        case 'gemini-flash-lite-latest': return 'Hezell Lite';
        default: return 'Hezell Flash';
    }
  };

  const handleEnhancePrompt = async () => {
    if (!inputValue.trim() || isEnhancing) return;

    setIsEnhancing(true);
    try {
        if (!process.env.API_KEY) throw new Error("API Key not found");
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            config: { thinkingConfig: { thinkingBudget: 0 } },
            contents: `Rewrite prompt to be detailed and effective. Output ONLY enhanced prompt: "${inputValue}"`,
        });

        if (response.text) {
            setInputValue(response.text.trim());
            setIsEnhanced(true);
        }
    } catch (error) {
        console.error("Failed to enhance prompt:", error);
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
  
  const handlePlusClick = () => {
    fileInputRef.current?.click();
  };

  const placeholderText = stagedFile 
    ? "Describe the module or ask Hezell..." 
    : "Message Hezell AI...";

  const hasContent = inputValue.trim().length > 0 || stagedFile !== null;

  return (
    <div className="relative w-full pt-1">
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
        {stagedFile && (
            <div className="relative self-start mb-3 group select-none overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-3 w-full max-w-xs animate-fade-in-up">
                <div className="flex items-center gap-3">
                    <FileIcon className="h-5 w-5 text-gray-400" />
                    <span className="truncate text-[10px] text-gray-300 font-mono">
                        {stagedFile.file.name}
                    </span>
                </div>
                <button
                    onClick={clearStagedFile}
                    className="absolute top-1 right-1 p-1 text-gray-400 hover:text-white transition-colors"
                >
                    <CloseIcon className="w-4 h-4" />
                </button>
            </div>
        )}

        <div className="relative flex flex-col p-1.5 bg-[#141414] rounded-[24px] border border-white/5 group shadow-2xl">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholderText}
              className="w-full px-4 py-3 bg-transparent text-gray-200 placeholder-gray-600 focus:outline-none resize-none max-h-40 overflow-y-auto text-base"
              disabled={isLoading}
            />
            
            <div className="flex items-center justify-between mt-1 px-1 pb-1">
              <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsControlsSheetOpen(true)}
                    className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/5"
                    title="Controls"
                  >
                    <CircleEllipsisIcon className="w-5 h-5" />
                  </button>
                  
                  {/* Replaced CPU Icon with Model Name Button */}
                  <button
                    onClick={() => setIsModelSheetOpen(true)}
                    className="px-3 py-1.5 text-gray-500 hover:text-white transition-all rounded-full border border-white/5 hover:bg-white/5 flex items-center gap-2"
                    title="Change Engine"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">{getModelDisplayName(model)}</span>
                  </button>

                  <button 
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancing || !inputValue.trim()}
                    className={`p-2 transition-colors rounded-full hover:bg-white/5 disabled:opacity-50 ${isEnhanced ? 'text-yellow-400' : 'text-gray-500 hover:text-white'}`}
                  >
                      {isEnhancing ? (
                        <SpinnerIcon className="w-5 h-5 animate-spin" />
                      ) : (
                        <SparklesIcon className="w-5 h-5" />
                      )}
                  </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={handlePlusClick} className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/5">
                    <PlusIcon className="w-5 h-5" />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])} />

                <button
                    onClick={hasContent ? handleSend : onVoiceClick}
                    disabled={isLoading}
                    className={`p-2.5 rounded-full transition-all duration-300
                        ${hasContent 
                            ? 'bg-white text-black hover:scale-105' 
                            : 'text-gray-500 hover:text-white'
                        } disabled:opacity-50`}
                >
                    {hasContent ? <SendIcon className="w-5 h-5" /> : <VoiceIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
        </div>
        
        <p className="text-center text-[9px] text-gray-700 mt-4 font-sans tracking-[0.2em] uppercase opacity-50">
          Neural Architecture by Hezell.Inc
        </p>
      </div>

      <ControlsBottomSheet
        isOpen={isControlsSheetOpen}
        onClose={() => setIsControlsSheetOpen(false)}
        isSearchEnabled={isSearchEnabled}
        onToggleSearch={onToggleSearch}
        isThinkingEnabled={isThinkingEnabled}
        onToggleThinking={onToggleThinking}
        isTurboEnabled={isTurboEnabled}
        onToggleTurbo={onToggleTurbo}
        model={model}
        voice={voice}
        onVoiceChange={onVoiceChange}
        persona={persona}
        onPersonaChange={onPersonaChange}
      />
      
      <ModelBottomSheet
        isOpen={isModelSheetOpen}
        onClose={() => setIsModelSheetOpen(false)}
        model={model}
        onModelChange={onModelChange}
      />
    </div>
  );
};

export default ChatInput;
