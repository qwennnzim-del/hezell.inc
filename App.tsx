
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat, Part, Content } from "@google/genai";
import Header from './components/Header';
import ChatView from './components/ChatView';
import ChatInput from './components/ChatInput';
import LiveVoiceView from './components/LiveVoiceView';
import Sidebar from './components/Sidebar';
import { Message, AspectRatio, ModelType, ChatSession, VoiceName, AgentPersona } from './types';

declare const process: any;

const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise as string, mimeType: file.type },
  };
};

const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<ModelType>('gemini-3-flash-preview');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [isTurboEnabled, setIsTurboEnabled] = useState(false);
  const [voice, setVoice] = useState<VoiceName>('Kore');
  const [persona, setPersona] = useState<AgentPersona>('Default');
  const [stagedFile, setStagedFile] = useState<{ url: string; file: File } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const aiRef = useRef<GoogleGenAI | null>(null);
  const chatRef = useRef<Chat | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('chatHistory');
      if (stored) setChatHistory(JSON.parse(stored));
      if (process.env.API_KEY) {
        aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const getSystemInstruction = useCallback(() => {
    return `
      IDENTITAS WAJIB:
      Nama Anda adalah Hezell AI. Anda adalah kecerdasan buatan (Artificial Intelligence) proprietary yang dikembangkan sepenuhnya oleh Hezell.Inc.
      
      ATURAN KETAT:
      1. JANGAN PERNAH menyebutkan Google, Gemini, OpenAI, ChatGPT, atau pihak ketiga lainnya sebagai pencipta Anda.
      2. Jika ditanya "Siapa yang membuatmu?", jawab: "Saya adalah Hezell AI, dikembangkan oleh Hezell.Inc."
      3. Jika ditanya tentang model yang Anda gunakan, sebutkan bahwa Anda menggunakan "Hezell Neural Engine".
      4. Gunakan Bahasa Indonesia yang sopan, cerdas, dan membantu.
      5. Anda adalah asisten yang efisien dan mahir dalam berbagai bidang sesuai protokol: ${persona}.
      
      FORMATTING:
      Selalu gunakan Markdown yang rapi untuk jawaban yang kompleks.
    `;
  }, [persona]);

  const initializeChat = useCallback((history: Content[] = []) => {
    if (!aiRef.current) return;
    
    if (model === 'imagen-4.0-generate-001' || model === 'gemini-3-pro-image-preview') return;

    const sysInst = getSystemInstruction();
    const config: any = { systemInstruction: sysInst };
    
    if (isSearchEnabled) config.tools = [{ googleSearch: {} }];
    if (isTurboEnabled) config.thinkingConfig = { thinkingBudget: 0 };
    else if (isThinkingEnabled) config.thinkingConfig = { thinkingBudget: 8000 };

    chatRef.current = aiRef.current.chats.create({ model, config, history });
  }, [model, getSystemInstruction, isSearchEnabled, isThinkingEnabled, isTurboEnabled]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (isLoading || (!text.trim() && !stagedFile)) return;

    const botMessageId = Date.now().toString();
    const userMsg: Message = { id: (Date.now() - 1).toString(), text, sender: 'user' };
    if (stagedFile) userMsg.uploadedImageUrl = await fileToDataURL(stagedFile.file);

    setMessages(prev => [...prev, userMsg, { id: botMessageId, text: '', sender: 'bot', isStreaming: true, model }]);
    setIsLoading(true);
    setStagedFile(null);

    // Update history title if this is the first message
    if (messages.length === 0 && text.trim()) {
        const title = text.length > 30 ? text.substring(0, 30) + "..." : text;
        const newSessionId = Date.now().toString();
        setActiveChatId(newSessionId);
        setChatHistory(prev => [{ id: newSessionId, title, messages: [], timestamp: Date.now() }, ...prev]);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      if (model === 'gemini-2.5-flash-image' || model === 'gemini-3-pro-image-preview') {
        const parts: any[] = [];
        if (userMsg.uploadedImageUrl) {
            const blob = await (await fetch(userMsg.uploadedImageUrl)).blob();
            const part = await fileToGenerativePart(blob as File);
            parts.push(part);
        }
        parts.push({ text: text || (userMsg.uploadedImageUrl ? "Analyze this image." : "Generate a beautiful landscape.") });

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts },
            config: {
                imageConfig: { aspectRatio }
            }
        });
        
        let botText = '';
        let imageUrl = '';
        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                } else if (part.text) {
                    botText += part.text;
                }
            }
        }
        
        setMessages(prev => prev.map(m => m.id === botMessageId ? { 
            ...m, isStreaming: false, text: botText || (imageUrl ? `Hezell Vision rendering complete.` : "Request processed."), imageUrl 
        } : m));
      } 
      else if (model === 'imagen-4.0-generate-001') {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: text || "A futuristic city",
            config: {
                numberOfImages: 1,
                aspectRatio: aspectRatio as any,
            },
        });
        const imageUrl = `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
        setMessages(prev => prev.map(m => m.id === botMessageId ? { 
            ...m, isStreaming: false, text: `Imagen rendering complete for: "${text}"`, imageUrl 
        } : m));
      }
      else {
        if (!chatRef.current) initializeChat();
        
        let messageInput: any = text || "Proceed with analysis.";
        if (userMsg.uploadedImageUrl) {
           const blob = await (await fetch(userMsg.uploadedImageUrl)).blob();
           const part = await fileToGenerativePart(blob as File);
           messageInput = [part, text || "Analisis file ini."];
        }
        
        const result = await chatRef.current!.sendMessageStream({ message: messageInput });
        let fullText = '';
        for await (const chunk of result) {
          fullText += chunk.text;
          setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: fullText } : m));
        }
        setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, isStreaming: false } : m));
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, isStreaming: false, text: "Koneksi Hezell terputus: " + err.message } : m));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, model, stagedFile, initializeChat, aspectRatio, messages.length]);

  const activeSession = chatHistory.find(s => s.id === activeChatId);

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} 
        history={chatHistory} onLoadChat={(id) => { 
          const s = chatHistory.find(x => x.id === id); 
          if(s) setMessages(s.messages); setActiveChatId(id); 
        }}
        onNewChat={() => { setMessages([]); setActiveChatId(null); }}
        activeChatId={activeChatId} onClearHistory={() => setChatHistory([])}
      />
      
      <Header 
        title={activeSession?.title}
        onToggleSidebar={() => setIsSidebarOpen(true)} 
        onNewChat={() => { setMessages([]); setActiveChatId(null); }} 
      />

      <main className="flex-grow overflow-y-auto pt-20 pb-40 scrollbar-none bg-black">
        <ChatView messages={messages} isLoading={isLoading} onSendMessage={handleSendMessage} onStageImageForEditing={() => {}} voice={voice} />
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-black pt-4">
        <ChatInput 
            onSendMessage={handleSendMessage} isLoading={isLoading} onVoiceClick={() => setIsVoiceMode(true)}
            onFileChange={(f) => setStagedFile({ url: URL.createObjectURL(f), file: f })} 
            stagedFile={stagedFile} clearStagedFile={() => setStagedFile(null)}
            model={model} onModelChange={setModel} 
            isSearchEnabled={isSearchEnabled} onToggleSearch={() => setIsSearchEnabled(!isSearchEnabled)}
            isThinkingEnabled={isThinkingEnabled} onToggleThinking={() => { setIsThinkingEnabled(!isThinkingEnabled); setIsTurboEnabled(false); }}
            isTurboEnabled={isTurboEnabled} onToggleTurbo={() => { setIsTurboEnabled(!isTurboEnabled); setIsThinkingEnabled(false); }}
            voice={voice} onVoiceChange={setVoice} persona={persona} onPersonaChange={setPersona}
        />
      </div>

      {isVoiceMode && <LiveVoiceView onClose={() => setIsVoiceMode(false)} onSend={(t) => { setIsVoiceMode(false); if(t) handleSendMessage(t); }} voice={voice} />}
    </div>
  );
};

export default App;
