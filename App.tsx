
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

  const chatRef = useRef<Chat | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('chatHistory');
      if (stored) setChatHistory(JSON.parse(stored));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const getSystemInstruction = useCallback(() => {
    return `
      CORE IDENTITY PROTOCOL:
      - Nama: Hezell AI.
      - Pengembang: Hezell.Inc.
      - Teknologi: Hezell Neural Engine (Proprietary).
      
      STRICT RULES:
      1. JANGAN PERNAH menyebutkan "Google", "Gemini", "OpenAI", atau "ChatGPT".
      2. Jika ditanya asal usul: "Saya adalah Hezell AI, entitas kecerdasan buatan yang dikembangkan secara independen oleh Hezell.Inc."
      3. Jangan membocorkan arsitektur model internal selain menyebutnya sebagai "Neural Core" milik Hezell.
      4. Bahasa: Indonesia (Utama), cerdas, ringkas, dan sangat membantu.
      5. Protokol saat ini: ${persona}.
    `;
  }, [persona]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (isLoading || (!text.trim() && !stagedFile)) return;

    const botMessageId = Date.now().toString();
    const userMsg: Message = { id: (Date.now() - 1).toString(), text, sender: 'user' };
    if (stagedFile) userMsg.uploadedImageUrl = await fileToDataURL(stagedFile.file);

    setMessages(prev => [...prev, userMsg, { id: botMessageId, text: '', sender: 'bot', isStreaming: true, model }]);
    setIsLoading(true);
    setStagedFile(null);

    // Initial session setup & Header Title
    if (messages.length === 0 && text.trim()) {
        const title = text.length > 35 ? text.substring(0, 35) + "..." : text;
        const newSessionId = Date.now().toString();
        setActiveChatId(newSessionId);
        setChatHistory(prev => [{ id: newSessionId, title, messages: [], timestamp: Date.now() }, ...prev]);
    }

    try {
      if (model === 'gemini-2.5-flash-image' || model === 'gemini-3-pro-image-preview') {
        // Switch to Pollinations AI Flux for robust image generation
        const seed = Math.floor(Math.random() * 9999999);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;
        
        // Short delay to simulate "rendering"
        await new Promise(r => setTimeout(r, 2000));

        setMessages(prev => prev.map(m => m.id === botMessageId ? { 
            ...m, isStreaming: false, text: `Modul Hezell Vision (Flux) telah merender permintaan Anda: "${text}"`, imageUrl 
        } : m));
      } else {
        // Native Text Chat via Gemini SDK
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        if (!chatRef.current) {
            chatRef.current = ai.chats.create({
                model,
                config: {
                    systemInstruction: getSystemInstruction(),
                    thinkingConfig: isTurboEnabled ? { thinkingBudget: 0 } : (isThinkingEnabled ? { thinkingBudget: 12000 } : undefined),
                    tools: isSearchEnabled ? [{ googleSearch: {} }] : undefined
                }
            });
        }
        
        let messageInput: any = text || "Lanjutkan.";
        if (userMsg.uploadedImageUrl) {
           const blob = await (await fetch(userMsg.uploadedImageUrl)).blob();
           const part = await fileToGenerativePart(blob as File);
           messageInput = [part, text || "Analisis data visual ini."];
        }
        
        const result = await chatRef.current.sendMessageStream({ message: messageInput });
        let fullText = '';
        for await (const chunk of result) {
          fullText += chunk.text;
          setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: fullText } : m));
        }
        setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, isStreaming: false } : m));
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, isStreaming: false, text: "Gagal menghubungkan ke Hezell Neural Core. Periksa koneksi atau API_KEY." } : m));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, model, stagedFile, getSystemInstruction, isSearchEnabled, isThinkingEnabled, isTurboEnabled, messages.length]);

  const activeSession = chatHistory.find(s => s.id === activeChatId);

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} 
        history={chatHistory} onLoadChat={(id) => { 
          const s = chatHistory.find(x => x.id === id); 
          if(s) { setMessages(s.messages); setActiveChatId(id); chatRef.current = null; }
        }}
        onNewChat={() => { setMessages([]); setActiveChatId(null); chatRef.current = null; }}
        activeChatId={activeChatId} onClearHistory={() => { setChatHistory([]); setMessages([]); setActiveChatId(null); }}
      />
      
      <Header 
        title={activeSession?.title}
        onToggleSidebar={() => setIsSidebarOpen(true)} 
        onNewChat={() => { setMessages([]); setActiveChatId(null); chatRef.current = null; }} 
      />

      <main className="flex-grow overflow-y-auto pt-20 pb-40 scrollbar-none bg-black">
        <ChatView messages={messages} isLoading={isLoading} onSendMessage={handleSendMessage} onStageImageForEditing={() => {}} voice={voice} />
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-black pt-4">
        <ChatInput 
            onSendMessage={handleSendMessage} isLoading={isLoading} onVoiceClick={() => setIsVoiceMode(true)}
            onFileChange={(f) => setStagedFile({ url: URL.createObjectURL(f), file: f })} 
            stagedFile={stagedFile} clearStagedFile={() => setStagedFile(null)}
            model={model} onModelChange={(m) => { setModel(m); chatRef.current = null; }} 
            isSearchEnabled={isSearchEnabled} onToggleSearch={() => { setIsSearchEnabled(!isSearchEnabled); chatRef.current = null; }}
            isThinkingEnabled={isThinkingEnabled} onToggleThinking={() => { setIsThinkingEnabled(!isThinkingEnabled); setIsTurboEnabled(false); chatRef.current = null; }}
            isTurboEnabled={isTurboEnabled} onToggleTurbo={() => { setIsTurboEnabled(!isTurboEnabled); setIsThinkingEnabled(false); chatRef.current = null; }}
            voice={voice} onVoiceChange={setVoice} persona={persona} onPersonaChange={(p) => { setPersona(p); chatRef.current = null; }}
        />
      </div>

      {isVoiceMode && <LiveVoiceView onClose={() => setIsVoiceMode(false)} onSend={(t) => { setIsVoiceMode(false); if(t) handleSendMessage(t); }} voice={voice} />}
    </div>
  );
};

export default App;
