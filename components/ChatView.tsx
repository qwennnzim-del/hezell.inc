
import React, { useEffect, useRef } from 'react';
import { Message, VoiceName } from '../types';
import FinalBotMessage from './FinalBotMessage';
import { CusstzzLogo, FileIcon } from './Icons';

interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onStageImageForEditing: (imageUrl: string) => void;
  voice: VoiceName;
}

const WelcomeScreen: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center min-h-[60vh] px-4 bg-black font-sans">
    <div className="mb-10 flex items-center justify-center w-24 h-24 bg-white/[0.03] border border-white/[0.08] rounded-[2.5rem] shadow-2xl">
      <CusstzzLogo className="w-14 h-14" />
    </div>
    
    <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter uppercase">
      Hezell AI
    </h1>
    
    <p className="text-gray-500 text-base md:text-lg max-w-sm leading-relaxed font-light">
      Proprietary intelligence by Hezell.Inc. Thinking without boundaries.
    </p>
    
    <div className="mt-12 flex gap-4 justify-center opacity-20">
        <span className="text-[9px] font-black tracking-[0.3em] uppercase border border-white/40 px-5 py-2 rounded-full">Hezell.Inc Private Node</span>
    </div>
  </div>
);

const UserMessage: React.FC<{ message: Message }> = ({ message }) => {
    const isImage = message.uploadedImageUrl?.startsWith('data:image');
    return (
      <div className="flex items-start my-8 justify-end animate-fade-in">
        <div className="max-w-[85%] sm:max-w-xl">
          {message.uploadedImageUrl && (
              isImage ? (
                  <img src={message.uploadedImageUrl} alt="Upload" className="mb-3 rounded-2xl max-w-xs ml-auto border border-white/10" />
              ) : (
                   <div className="mb-3 ml-auto inline-flex items-center gap-3 p-4 bg-[#111] rounded-2xl border border-white/5">
                        <FileIcon className="w-6 h-6 text-blue-500" />
                        <span className="text-sm text-gray-400">Hezell Data Module</span>
                   </div>
              )
          )}
          <div className="bg-[#111] px-5 py-3 rounded-2xl rounded-tr-none border border-white/[0.05] text-gray-200 shadow-xl">
              <p className="text-base whitespace-pre-wrap">{message.text}</p>
          </div>
        </div>
      </div>
    );
};

const ChatView: React.FC<ChatViewProps> = ({ messages, isLoading, onSendMessage, onStageImageForEditing, voice }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) return <WelcomeScreen />;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-12">
      {messages.map((message) => (
        message.sender === 'user' ? (
          <UserMessage key={message.id} message={message} />
        ) : (
          <FinalBotMessage 
            key={message.id} message={message} 
            onStageImageForEditing={onStageImageForEditing}
            onSendMessage={onSendMessage} voice={voice}
          />
        )
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatView;
