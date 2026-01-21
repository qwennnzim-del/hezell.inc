
import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, SendIcon, VoiceIcon, CloseIcon, SparklesIcon, SpinnerIcon, FileIcon, CircleEllipsisIcon, CpuIcon } from './Icons';
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
  onModelChange: (model: ModelType) => void; // Added Prop
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
    onModelChange, // Destructure
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
  const [isModelSheetOpen, setIsModelSheetOpen] = useState(false); // New State
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

  // Reset enhanced state when user types manually
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

  const handleEnhancePrompt = async () => {
    if (!inputValue.trim() || isEnhancing) return;

    setIsEnhancing(true);
    try {
        // Updated to GEMINI_API_KEY
        if (!process.env.GEMINI_API_KEY) throw new Error("API Key not found");
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        // Use Flash Lite with Zero Thinking Budget for instant enhancement
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            config: { thinkingConfig: { thinkingBudget: 0 } },
            contents: `Rewrite the following user prompt to be comprehensive, detailed, and optimized for an AI Large Language Model to get the best possible result. Keep the original intent but expand on it. Do not add any preamble or conversational text, just output the enhanced prompt directly.
            
            User Prompt: "${inputValue}"`,
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileChange(file);
    }
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const placeholderText = stagedFile 
    ? "Describe the projection or ask a question..." 
    : "Message Hezell...";

  const isImage = stagedFile?.file.type.startsWith('image/');
  const hasContent = inputValue.trim().length > 0 || stagedFile !== null;

  return (
    <div className="relative w-full pt-1">
      
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
      
        {/* Holographic Input Preview */}
        {stagedFile && (
            <div className="relative self-start mb-3 group select-none overflow-hidden rounded-xl border border-blue-500/30 bg-blue-900/10 backdrop-blur-md shadow-[0_0_15px_rgba(0,198,255,0.15)] transition-all hover:shadow-[0_0_25px_rgba(0,198,255,0.3)] w-full max-w-xs animate-fade-in-up">
                {/* Scanline Effect */}
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-blue-400/10 to-transparent opacity-20 animate-[shimmer_2s_infinite]" style={{ backgroundSize: '100% 200%' }}></div>

                <div className="relative z-10 flex items-center gap-4 p-3 pr-10">
                     {isImage ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-blue-400/30 shadow-inner">
                            <img src={stagedFile.url} alt="Holo Preview" className="h-full w-full object-cover opacity-90" />
                            <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay"></div>
                        </div>
                    ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-900/20 text-blue-300 shadow-inner">
                             <FileIcon className="h-6 w-6 animate-pulse" />
                        </div>
                    )}

                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 drop-shadow-[0_0_5px_rgba(147,197,253,0.5)]">
                            {stagedFile.file.type.split('/')[1] || 'DATA'} MODULE
                        </span>
                        <span className="truncate text-[10px] text-blue-200/70 font-mono">
                            {stagedFile.file.name}
                        </span>
                        <div className="mt-1 h-0.5 w-16 bg-blue-900/50">
                            <div className="h-full w-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
                        </div>
                    </div>
                </div>

                <div className="absolute top-0 left-0 h-2 w-2 border-l border-t border-blue-400 opacity-60"></div>
                <div className="absolute bottom-0 right-0 h-2 w-2 border-r border-b border-blue-400 opacity-60"></div>
                <div className="absolute top-0 right-0 h-2 w-2 border-r border-t border-blue-400 opacity-60"></div>
                <div className="absolute bottom-0 left-0 h-2 w-2 border-l border-b border-blue-400 opacity-60"></div>

                <button
                    onClick={clearStagedFile}
                    className="absolute top-1 right-1 p-1.5 text-blue-400 hover:text-white transition-colors z-20 hover:bg-blue-500/20 rounded-full"
                    aria-label="Remove attachment"
                >
                    <CloseIcon className="w-4 h-4" />
                </button>
            </div>
        )}

        {/* Inner Input Field Container */}
        <div className="relative flex flex-col p-1.5 bg-[#1E1E1E] rounded-[26px] border border-gray-700/50 group transition-all duration-300 shadow-xl">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholderText}
              className="w-full px-4 py-3 bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none resize-none max-h-40 overflow-y-auto text-base"
              disabled={isLoading}
            />
            
            {/* Toolbar Row */}
            <div className="flex items-center justify-between mt-1 px-1 pb-1">
              <div className="flex items-center gap-1">
                  {/* Ellipsis/Controls Button */}
                  <button
                    onClick={() => setIsControlsSheetOpen(true)}
                    className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700/50 min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title="More controls"
                  >
                    <CircleEllipsisIcon className="w-5 h-5" />
                  </button>
                  
                  {/* Model Selector Button */}
                  <button
                    onClick={() => setIsModelSheetOpen(true)}
                    className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700/50 min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title="Select Model"
                  >
                    <CpuIcon className="w-5 h-5" />
                  </button>

                  {/* Prompt Enhancer */}
                  <button 
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancing || !inputValue.trim()}
                    className={`p-2 transition-colors rounded-full hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed min-w-[40px] min-h-[40px] flex items-center justify-center ${isEnhanced ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}
                    title="Enhance Prompt"
                  >
                      {isEnhancing ? (
                        <SpinnerIcon className="w-5 h-5 animate-spin text-blue-400" />
                      ) : (
                        <SparklesIcon className={`w-5 h-5 ${isEnhanced ? 'fill-yellow-400/20' : ''}`} />
                      )}
                  </button>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Plus Button */}
                <button 
                     onClick={handlePlusClick} 
                     className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed min-w-[40px] min-h-[40px] flex items-center justify-center"
                    >
                      <PlusIcon className="w-5 h-5" />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*, application/pdf, text/plain, text/csv, application/json, .js, .ts, .py, .html, .css, .md"
                    onChange={handleFileSelect}
                />

                {/* Dynamic Voice/Send Button */}
                <button
                    onClick={hasContent ? handleSend : onVoiceClick}
                    disabled={isLoading}
                    className={`p-2.5 rounded-full transition-all duration-300 transform min-w-[42px] min-h-[42px] flex items-center justify-center
                        ${hasContent 
                            ? 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-105 shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                            : 'bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-600'
                        } disabled:bg-gray-800 disabled:cursor-not-allowed disabled:shadow-none`}
                >
                    <div className="relative w-5 h-5">
                         <div className={`absolute inset-0 transition-all duration-300 ${hasContent ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}>
                             <SendIcon className="w-5 h-5" />
                         </div>
                         <div className={`absolute inset-0 transition-all duration-300 ${!hasContent ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`}>
                             <VoiceIcon className="w-5 h-5" />
                         </div>
                    </div>
                </button>
              </div>
            </div>
        </div>
        
        <p className="text-center text-[10px] text-gray-600 mt-3 font-sans opacity-70">
          © 2025 Hezell.Inc
        </p>

      </div>

      {/* Controls Bottom Sheet */}
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
      
      {/* Model Bottom Sheet (NEW) */}
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
