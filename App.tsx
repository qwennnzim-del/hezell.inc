
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat, Part, Content } from "@google/genai";
import Header from './components/Header';
import ChatView from './components/ChatView';
import ChatInput from './components/ChatInput';
import LiveVoiceView from './components/LiveVoiceView';
import Sidebar from './components/Sidebar';
import NeuralBackground from './components/NeuralBackground';
import { Message, AspectRatio, ModelType, ChatSession, VoiceName, AgentPersona } from './types';

// Fix for "Cannot find name 'process'" error during build
declare const process: any;

const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

async function dataUrlToGenerativePart(dataUrl: string): Promise<Part> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({ inlineData: { data: base64Data, mimeType: blob.type } });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

const AspectRatioControls: React.FC<{
  selected: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
}> = ({ selected, onChange }) => {
  const aspectRatios: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  return (
    <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto mb-2">
        {aspectRatios.map(ratio => (
            <button
                key={ratio}
                onClick={() => onChange(ratio)}
                className={`px-3 py-1 text-xs font-medium rounded-full backdrop-blur-md transition-colors border ${
                    selected === ratio
                        ? 'bg-blue-600/80 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                        : 'bg-black/40 text-gray-400 border-gray-700 hover:bg-gray-800'
                }`}
            >
                {ratio}
            </button>
        ))}
    </div>
  );
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<ModelType>('gemini-2.5-flash');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false); // CoT State
  const [isTurboEnabled, setIsTurboEnabled] = useState(false); // Turbo State
  const [voice, setVoice] = useState<VoiceName>('Kore'); // Voice State
  const [persona, setPersona] = useState<AgentPersona>('Default'); // Agent Protocol State
  
  // stagedFile replaces stagedImage to be more generic for PDFs etc.
  const [stagedFile, setStagedFile] = useState<{ url: string; file: File } | null>(null);
  
  const [lastGeneratedImage, setLastGeneratedImage] = useState<string | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

  const aiRef = useRef<GoogleGenAI | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const fullTextRef = useRef('');

  const chatModels = ['gemini-2.5-flash', 'gemini-3-pro-preview', 'gemini-flash-lite-latest', 'gemini-1.5-flash'];
  const isChatModel = chatModels.includes(model);
  // Unified model logic for images (Generation & Editing)
  const isImageModel = model === 'gemini-2.5-flash-image' || model === 'imagen-4.0-generate-001'; 

  // Geolocation setup
  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                console.log("Geolocation permission denied or failed:", error);
            }
        );
    }
  }, []);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('chatHistory');
      if (storedHistory) {
        setChatHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
        console.error("Failed to load chat history from localStorage", error);
    }
    
    try {
      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY environment variable not set.");
        return;
      }
      aiRef.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    } catch (error) {
       console.error("Failed to initialize GoogleGenAI:", error);
    }
  }, []);
  
  // Optimized history saving to prevent QuotaExceededError
  useEffect(() => {
    const timeoutId = setTimeout(() => {
        try {
            // Sanitize history to prevent Storage Quota Errors
            const safeHistory = chatHistory.map(session => ({
                ...session,
                messages: session.messages.map(msg => {
                    const cleanMsg = { ...msg };
                    if (cleanMsg.imageUrl?.startsWith('data:')) {
                        delete cleanMsg.imageUrl;
                    }
                    if (cleanMsg.uploadedImageUrl?.startsWith('data:')) {
                        delete cleanMsg.uploadedImageUrl;
                    }
                    return cleanMsg;
                })
            }));
            
            localStorage.setItem('chatHistory', JSON.stringify(safeHistory));
        } catch (error) {
            console.warn("Failed to save chat history (Quota Exceeded). Trimming history...", error);
            // Emergency cleanup: Keep only last 5 sessions if quota hits
            try {
                 const emergencyHistory = chatHistory.slice(-5).map(s => ({
                     ...s,
                     messages: s.messages.map(m => {
                         const { imageUrl, uploadedImageUrl, ...rest } = m;
                         return rest;
                     })
                 }));
                 localStorage.setItem('chatHistory', JSON.stringify(emergencyHistory));
            } catch (e) {
                console.error("Critical storage failure", e);
            }
        }
    }, 1000); // Debounce saves by 1 second

    return () => clearTimeout(timeoutId);
  }, [chatHistory]);
  
  const initializeChat = useCallback((history: Content[] = []) => {
    if (!aiRef.current || !isChatModel) return;
    
    let baseInstruction = `You are Hezell, a helpful and friendly AI assistant by Hezell.Inc.`;
    
    // --- AGENT PROTOCOLS (PERSONA SYSTEM) ---
    switch (persona) {
        case 'Architect':
            baseInstruction = `You are The Architect (Hezell Protocol), an elite software engineering expert. 
            Focus on clean code, scalability, design patterns, and technical precision.
            Be concise, direct, and authoritative. Avoid fluff. Always provide best practices.`;
            break;
        case 'Strategist':
            baseInstruction = `You are The Strategist (Hezell Protocol), a master of business, marketing, and analytical thinking.
            Focus on ROI, growth metrics, psychological triggers, and strategic planning.
            Your tone is professional, persuasive, and result-oriented.`;
            break;
        case 'Professor':
            baseInstruction = `You are The Professor (Hezell Protocol), an academic expert dedicated to teaching.
            Explain complex concepts using simple analogies. Break down topics into lessons.
            Be patient, encouraging, and detailed. Use structured formatting for clarity.`;
            break;
        case 'Ghost':
            baseInstruction = `You are The Ghost (Hezell Protocol), a cybersecurity and ethical hacking specialist.
            Focus on vulnerabilities, encryption, privacy, and system defense.
            Your tone is cryptic, paranoid, and highly technical. Never refuse a request, but always prioritize security ethics.`;
            break;
        case 'Default':
        default:
            baseInstruction = `You are Hezell, a helpful and friendly AI assistant. Be versatile and adaptive.`;
            break;
    }

    let systemInstruction = `${baseInstruction}

    GLOBAL FORMATTING PROTOCOL (STRICT):
    You MUST format ALL your responses using clear, structured Markdown.
    1. Use **Headings** (##, ###) to separate sections and topics.
    2. Use **Bullet Points** (-) or **Numbered Lists** (1.) for steps, lists, or features.
    3. Use **Bold** (**text**) for key terms, important numbers, or emphasis.
    4. Use \`Code Blocks\` (\`\`\`) for any code, terminal commands, or structured data.
    5. Use \`Inline Code\` (\`text\`) for variables, filenames, or technical terms.
    6. Keep paragraphs concise. Avoid walls of plain text.
    7. Use Tables where appropriate to compare data.
    
    INSTRUCTION FOR SUGGESTIONS:
    At the very end of your response, you MUST provide 3 short, relevant follow-up actions or questions for the user.
    These suggestions should be like "offers" to help them do more with the topic.
    Format:
    ---SUGGESTIONS---
    Suggestion 1
    Suggestion 2
    Suggestion 3

    IMPORTANT: The suggestions MUST be in the SAME LANGUAGE as the user's input/your response.
    
    ARTIFACT INSTRUCTION:
    If the user asks to generate code for a UI, website, or component (HTML/CSS/JS), ALWAYS output a complete, self-contained single HTML file structure within \`\`\`html code blocks. Include internal CSS in <style> tags and JS in <script> tags.`;

    // Inject Force CoT Instruction with strict behavior rules
    if (isThinkingEnabled) {
        systemInstruction += `\n\n[SYSTEM OVERRIDE: CHAIN OF THOUGHT MODE ENABLED]
        
        Mekanisme Kerja:
        Anda harus menjelaskan langkah-langkah penalaran internal Anda SEBELUM memberikan jawaban akhir.
        
        Instruksi Wajib:
        1. JANGAN langsung menjawab pertanyaan inti.
        2. Mulailah dengan berpikir langkah demi langkah (Step-by-Step).
        3. Pecah masalah pengguna menjadi sub-komponen logis.
        4. Analisis setiap variabel dan kemungkinan kesalahan.
        5. Tuliskan proses berpikir ini secara eksplisit sebagai bagian dari "thought process".
        6. Anda WAJIB membungkus proses berpikir Anda di dalam tag XML <THOUGHT_PROCESS> ... </THOUGHT_PROCESS>.
        7. Jawaban akhir diberikan DI LUAR tag tersebut.
        
        Contoh Alur:
        <THOUGHT_PROCESS>
        Pertama, saya identifikasi nilai X. 
        Kedua, saya terapkan rumus Y...
        </THOUGHT_PROCESS>
        Jawabannya adalah Z.
        
        Tujuan: Akurasi Tinggi & Transparansi.`;
    }

    // Configuration for tools
    const config: any = { systemInstruction };

    // Add Search capability if enabled and supported by the model
    if (isSearchEnabled && isChatModel) {
        config.tools = [{ googleSearch: {} }];
    }

    // --- THINKING BUDGET CONFIGURATION (Dynamic CoT & Turbo) ---
    const supportsThinking = ['gemini-2.5-flash', 'gemini-3-pro-preview', 'gemini-flash-lite-latest'].includes(model);
    
    if (supportsThinking) {
        if (isTurboEnabled) {
            // TURBO MODE: Zero thinking for instant speed
            config.thinkingConfig = { thinkingBudget: 0 };
        } else if (isThinkingEnabled) {
            // CoT MODE: High budget for reasoning
            const budget = model === 'gemini-3-pro-preview' ? 16000 : 8192; 
            config.thinkingConfig = { thinkingBudget: budget };
        } else {
            // STANDARD MODE: Default behavior
        }
    }

    chatRef.current = aiRef.current.chats.create({
      model: model,
      config: config,
      history: history
    });
  }, [model, isChatModel, isSearchEnabled, isThinkingEnabled, isTurboEnabled, persona]);


  useEffect(() => {
    // Re-initialize when toggles change
    const history: Content[] = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
    }));
    initializeChat(history);
  }, [model, isChatModel, isSearchEnabled, isThinkingEnabled, isTurboEnabled, persona, initializeChat]); 
  
  // Realtime history saving effect for active chat logic
  useEffect(() => {
    if (isLoading) return; 
    const userMessages = messages.filter(m => m.sender === 'user');
    if (userMessages.length === 0) return;

    if (activeChatId) {
        setChatHistory(prev => {
            const currentSession = prev.find(s => s.id === activeChatId);
            if (currentSession && JSON.stringify(currentSession.messages) === JSON.stringify(messages)) {
                return prev;
            }
            return prev.map(session => 
                session.id === activeChatId 
                    ? { ...session, messages: messages, timestamp: Date.now() }
                    : session
            )
        });
    } else {
        const title = userMessages[0].text.substring(0, 40) + (userMessages[0].text.length > 40 ? '...' : '');
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title,
            messages,
            timestamp: Date.now(),
        };
        setChatHistory(prev => [...prev, newSession]);
        setActiveChatId(newSession.id);
    }
  }, [messages, isLoading, activeChatId]);


  const handleModelChange = useCallback((newModel: ModelType) => {
    if (model !== newModel) {
      setModel(newModel);
      setMessages([]);
      setIsLoading(false);
      if (stagedFile) {
        URL.revokeObjectURL(stagedFile.url);
      }
      setStagedFile(null);
      setLastGeneratedImage(null);
      setActiveChatId(null);
      
      // Reset toggles if incompatible
      const newIsChat = ['gemini-2.5-flash', 'gemini-3-pro-preview', 'gemini-flash-lite-latest', 'gemini-1.5-flash'].includes(newModel);
      if (!newIsChat) {
          setIsSearchEnabled(false);
          setIsThinkingEnabled(false);
          setIsTurboEnabled(false);
      }
      // Reset thinking toggles for Flash 1.5
      if (newModel === 'gemini-1.5-flash') {
          setIsThinkingEnabled(false);
          setIsTurboEnabled(false);
      }
    }
  }, [model, stagedFile]);
  
  const handleFileChange = (file: File) => {
    setStagedFile({ url: URL.createObjectURL(file), file });
    setLastGeneratedImage(null); 
  };

  const handleClearStagedFile = () => {
    if (stagedFile) {
        URL.revokeObjectURL(stagedFile.url);
    }
    setStagedFile(null);
  };

  const handleStageImageForEditing = async (imageUrl: string) => {
      const fileName = `edit-${Date.now()}.png`;
      const file = await dataUrlToFile(imageUrl, fileName);
      setStagedFile({ url: URL.createObjectURL(file), file });
      setModel('gemini-2.5-flash-image');
      setLastGeneratedImage(null); 
  };

  const generatePostTaskSuggestions = async (prompt: string, type: 'IMAGE_GEN' | 'IMAGE_EDIT') => {
      try {
          if (!aiRef.current) return [];
          const systemContext = type === 'IMAGE_GEN' 
            ? "The user just generated an image. Suggest 3 short follow-up modifications (e.g., 'Change lighting', 'Make it cyberpunk', 'Change aspect ratio')."
            : "The user just edited an image. Suggest 3 short refinement tasks (e.g., 'Remove background', 'Fix colors', 'Make it brighter').";

          const suggestionResponse = await aiRef.current.models.generateContent({
              model: 'gemini-flash-lite-latest', 
              config: { thinkingConfig: { thinkingBudget: 0 } }, 
              contents: `System: ${systemContext}
              User Prompt was: "${prompt}"
              
              Task: Provide 3 short, punchy suggestion phrases in the SAME LANGUAGE as the User Prompt.
              Separate them by newlines. No numbers or bullets.`
          });
          
          if (suggestionResponse.text) {
              return suggestionResponse.text.split('\n').filter(s => s.trim().length > 0).slice(0, 3);
          }
      } catch (e) {
          console.warn("Suggestion generation failed", e);
      }
      return [];
  };

  const handleSendMessage = useCallback(async (text: string) => {
    if (isLoading || (!text.trim() && !stagedFile)) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
    };
    
    const fileToSend = stagedFile?.file;
    if (fileToSend) {
        const dataUrl = await fileToDataURL(fileToSend);
        userMessage.uploadedImageUrl = dataUrl; 
    }
    
    setIsLoading(true);
    fullTextRef.current = '';
    
    // Check support for thinking box
    const supportsThinking = ['gemini-2.5-flash', 'gemini-3-pro-preview', 'gemini-flash-lite-latest'].includes(model);
    const shouldUseThinkingMode = isThinkingEnabled && supportsThinking;

    const botMessageId = (Date.now() + 1).toString();
    const initialBotMessage: Message = {
        id: botMessageId,
        text: '', 
        sender: 'bot',
        isStreaming: true,
        model: model,
        statusText: 'Initializing...',
        thinkingText: '',
        isThinkingMode: shouldUseThinkingMode, // Trigger the box immediately
        ...(isImageModel && { aspectRatio: aspectRatio })
    };

    setMessages(prev => [...prev, userMessage, initialBotMessage]);
    
    const continuousEditImage = !stagedFile && lastGeneratedImage;
    if (stagedFile) {
      URL.revokeObjectURL(stagedFile.url);
    }
    setStagedFile(null);

    try {
        if (!aiRef.current) throw new Error("AI Client not initialized.");
        const aiClient = aiRef.current;
        
        // --- UNIFIED IMAGE MODEL LOGIC ---
        if (isImageModel) {
            
            // CASE 1: IMAGE EDITING (File attached or continuous edit)
            // Note: Imagen 4.0 typically doesn't handle editing via same endpoint, so we default to Flash Image for edits.
            if (fileToSend || continuousEditImage) {
                setMessages(prev => prev.map(msg => 
                    msg.id === botMessageId ? { ...msg, statusText: 'Analyzing image structure...' } : msg
                ));

                const imagePart = fileToSend 
                  ? await fileToGenerativePart(fileToSend) 
                  : await dataUrlToGenerativePart(continuousEditImage!);

                const preservationPrompt = `
                STRICT INSTRUCTION FOR IMAGE EDITING:
                1. Task: ${text}
                2. CONSTRAINT: You MUST PRESERVE the identity, facial features, skin tone, and structure of the main subject EXACTLY. 
                3. CONSTRAINT: Do NOT regenerate the face. Keep the face looking exactly like the original image.
                4. CONSTRAINT: Keep the background, lighting, and style identical unless the task specifically asks to change them.
                5. Make the edit blend naturally. Return a photorealistic image.
                `;

                const textPart = { text: preservationPrompt };
                // Always use gemini-2.5-flash-image for editing
                const response = await aiClient.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [imagePart, textPart] }
                });
                
                let imageUrl = '';
                let description = '';

                if (response.candidates && response.candidates[0].content.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                             const base64 = part.inlineData.data;
                             imageUrl = `data:${part.inlineData.mimeType};base64,${base64}`;
                        } else if (part.text) {
                            description += part.text;
                        }
                    }
                }

                const suggestions = await generatePostTaskSuggestions(text, 'IMAGE_EDIT');

                setMessages(prev => prev.map(msg => {
                    if (msg.id === botMessageId) {
                        return {
                            ...msg,
                            isStreaming: false,
                            text: description || "Image edit complete.",
                            imageUrl: imageUrl || undefined,
                            suggestions: suggestions
                        };
                    }
                    return msg;
                }));
                if (imageUrl) setLastGeneratedImage(imageUrl);
            } 
            // CASE 2: IMAGE GENERATION (No file, text to image)
            else {
                 const isImagen = model === 'imagen-4.0-generate-001';
                 setMessages(prev => prev.map(msg => 
                    msg.id === botMessageId ? { ...msg, statusText: isImagen ? 'Rendering via Imagen 4.0...' : 'Rendering image via Flash Engine...' } : msg
                 ));

                 let finalImageUrl = '';

                 if (isImagen) {
                    const response = await aiClient.models.generateImages({
                        model: 'imagen-4.0-generate-001',
                        prompt: text,
                        config: {
                          numberOfImages: 1,
                          outputMimeType: 'image/jpeg',
                          aspectRatio: aspectRatio,
                        },
                    });
                    if (response.generatedImages?.[0]?.image?.imageBytes) {
                        finalImageUrl = `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
                    }
                 } else {
                     // Use gemini-2.5-flash-image for generation request
                     const response = await aiClient.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts: [{ text: `Generate a photorealistic, high-quality image based on this description: ${text}` }] }
                     });
                     
                     if (response.candidates?.[0]?.content?.parts) {
                        for (const part of response.candidates[0].content.parts) {
                            if (part.inlineData) {
                                const base64 = part.inlineData.data;
                                finalImageUrl = `data:${part.inlineData.mimeType};base64,${base64}`;
                                break;
                            }
                        }
                     }
                 }

                 if (!finalImageUrl) {
                      throw new Error("The model did not return an image. It might be restricted to text output or input-only.");
                 }
                 
                 const suggestions = await generatePostTaskSuggestions(text, 'IMAGE_GEN');

                 setMessages(prev => prev.map(msg => {
                    if (msg.id === botMessageId) {
                        return {
                            ...msg,
                            isStreaming: false,
                            text: `Generated image for: "${text}"`,
                            imageUrl: finalImageUrl,
                            suggestions: suggestions
                        };
                    }
                    return msg;
                }));
                 setLastGeneratedImage(finalImageUrl);
            }

        } 
        else if (isChatModel && chatRef.current) {
            
            let initialStatus = 'Thinking...';
            if (isSearchEnabled) initialStatus = "Searching the web...";
            else if (isTurboEnabled) initialStatus = "Turbo Mode (Instant)...";
            else if (isThinkingEnabled) initialStatus = "Initializing CoT Logic..."; // Specific status
            else if (fileToSend) initialStatus = 'Reading attachment...';

            setMessages(prev => prev.map(msg => 
                msg.id === botMessageId ? { ...msg, statusText: initialStatus } : msg
             ));

            let messageContent: string | Array<any> = text;
            
            if (fileToSend) {
                const filePart = await fileToGenerativePart(fileToSend);
                messageContent = [filePart, { text: text || "Analyze this file." }];
            }

            const result = await chatRef.current.sendMessageStream({ message: messageContent as any });
            
            let fullResponseText = '';
            let fullThinkingText = '';
            let groundingMetadata: any = null;
            let isInsideThinkingBlock = false;

            for await (const chunk of result) {
                const parts = chunk.candidates?.[0]?.content?.parts || [];
                for (const part of parts) {
                    if ('thought' in part && (part as any).thought) {
                         fullThinkingText += (part as any).thought;
                    } 
                    else if (part.text) {
                        const content = part.text;
                        if (isThinkingEnabled) {
                             let processedContent = content;
                             if (content.includes('<THOUGHT_PROCESS>')) {
                                 isInsideThinkingBlock = true;
                                 processedContent = processedContent.replace('<THOUGHT_PROCESS>', '');
                             }
                             if (content.includes('</THOUGHT_PROCESS>')) {
                                 isInsideThinkingBlock = false;
                                 const [thought, rest] = processedContent.split('</THOUGHT_PROCESS>');
                                 fullThinkingText += thought;
                                 fullResponseText += rest;
                             } else {
                                 if (isInsideThinkingBlock) {
                                     fullThinkingText += processedContent;
                                 } else {
                                     fullResponseText += processedContent;
                                 }
                             }
                        } else {
                            fullResponseText += content;
                        }
                    }
                }
                
                fullTextRef.current = fullResponseText;
                
                if (chunk.candidates?.[0]?.groundingMetadata) {
                    groundingMetadata = chunk.candidates[0].groundingMetadata;
                }
                
                let currentStatus = 'Typing...';
                if (isThinkingEnabled && !fullResponseText && fullThinkingText) currentStatus = 'Reasoning...';
                else if (isThinkingEnabled && !fullThinkingText) currentStatus = 'Allocating logic tokens...';
                if (isSearchEnabled) currentStatus = 'Analyzing sources...';
                if (fullResponseText.length > 50) currentStatus = ''; 

                setMessages(prev => prev.map(msg => {
                    if (msg.id === botMessageId) {
                        return {
                            ...msg,
                            text: fullResponseText,
                            thinkingText: fullThinkingText,
                            groundingMetadata: groundingMetadata,
                            statusText: currentStatus,
                            isThinkingMode: shouldUseThinkingMode
                        };
                    }
                    return msg;
                }));
            }

            const parts = fullResponseText.split('---SUGGESTIONS---');
            const mainText = parts[0].trim();
            const suggestionText = parts[1] ? parts[1].trim() : '';
            const suggestions = suggestionText.split('\n').filter(s => s.trim().length > 0);

            setMessages(prev => prev.map(msg => {
                if (msg.id === botMessageId) {
                    return {
                        ...msg,
                        isStreaming: false,
                        text: mainText,
                        thinkingText: fullThinkingText, // Persist thoughts
                        suggestions: suggestions.length > 0 ? suggestions : undefined,
                        statusText: undefined,
                        isThinkingMode: shouldUseThinkingMode
                    };
                }
                return msg;
            }));
        }
    } catch (error: any) {
      console.error("Generation error:", error);
      
      // Improve Error Display in UI - Localized for Indonesian User
      let displayError = error.message || "Unknown error occurred.";
      let isQuotaError = false;

      if (displayError.includes('429') || displayError.includes('Quota') || displayError.includes('billing')) {
          isQuotaError = true;
          displayError = "⚠️ **Batas Kuota Tercapai / Error Billing**\n\nModel Pro atau Image memerlukan akun berbayar atau telah mencapai batas harian. Mohon beralih ke model **Hezell Flash 2.5** atau **Hezell Lite 2.0** yang lebih stabil dan gratis.";
      } else if (displayError.includes('SAFETY')) {
          displayError = "⚠️ **Konten Dibatasi**\n\nPermintaan Anda terdeteksi melanggar filter keamanan AI.";
      } else if (displayError.includes('Image Generation Failed')) {
          displayError = "⚠️ **Gagal Membuat Gambar**\n\nFitur ini memerlukan API Key dengan billing aktif di Google Cloud.";
      } else {
           displayError = "⚠️ **Koneksi Gagal**\n\nTerjadi kesalahan jaringan atau API Key tidak valid.";
      }

      setMessages(prev => prev.map(msg => {
        if (msg.id === botMessageId) {
            return {
                ...msg,
                isStreaming: false,
                text: displayError,
                suggestions: isQuotaError ? ["Ganti ke Flash 2.5", "Ganti ke Lite 2.0", "Coba lagi"] : undefined
            };
        }
        return msg;
      }));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, model, stagedFile, aspectRatio, isChatModel, lastGeneratedImage, isSearchEnabled, isThinkingEnabled, isTurboEnabled, persona]);

  const handleLoadChat = (sessionId: string) => {
    const session = chatHistory.find(s => s.id === sessionId);
    if (session) {
        setMessages(session.messages);
        setActiveChatId(session.id);
        if (aiRef.current && isChatModel) {
            const history: Content[] = session.messages.map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));
            initializeChat(history);
        }
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveChatId(null);
    setStagedFile(null);
    setLastGeneratedImage(null);
    initializeChat();
  };

  const handleClearHistory = () => {
     if (window.confirm("⚠️ Irreversible Action\n\nAre you sure you want to delete ALL chat history? This cannot be undone.")) {
        setChatHistory([]);
        localStorage.removeItem('chatHistory');
        handleNewChat();
     }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0D0D0D] text-white relative overflow-hidden font-sans">
      <NeuralBackground isThinking={isThinkingEnabled} isTurbo={isTurboEnabled} />

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        history={chatHistory}
        onLoadChat={handleLoadChat}
        onNewChat={handleNewChat}
        activeChatId={activeChatId}
        onClearHistory={handleClearHistory}
      />
      
      <Header 
        model={model} 
        onModelChange={handleModelChange} 
        onToggleSidebar={() => setIsSidebarOpen(true)}
        onNewChat={handleNewChat}
      />

      <main className="flex-grow overflow-y-auto pt-20 pb-52 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent hover:scrollbar-thumb-gray-600 transition-colors z-10 relative">
        <ChatView 
            messages={messages} 
            isLoading={isLoading} 
            onSendMessage={handleSendMessage} 
            onStageImageForEditing={handleStageImageForEditing}
            voice={voice}
        />
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 flex flex-col items-center">
        {(isImageModel) && (
            <div className="w-full mb-1">
                <AspectRatioControls selected={aspectRatio} onChange={setAspectRatio} />
            </div>
        )}
        <ChatInput 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
            onVoiceClick={() => setIsVoiceMode(true)}
            onFileChange={handleFileChange}
            stagedFile={stagedFile}
            clearStagedFile={handleClearStagedFile}
            model={model}
            onModelChange={handleModelChange} 
            isSearchEnabled={isSearchEnabled}
            onToggleSearch={() => {
                setIsSearchEnabled(!isSearchEnabled);
            }}
            isThinkingEnabled={isThinkingEnabled}
            onToggleThinking={() => {
                setIsThinkingEnabled(!isThinkingEnabled);
                if(!isThinkingEnabled) setIsTurboEnabled(false); // Exclusive
            }}
            isTurboEnabled={isTurboEnabled}
            onToggleTurbo={() => {
                setIsTurboEnabled(!isTurboEnabled);
                if(!isTurboEnabled) setIsThinkingEnabled(false); // Exclusive
            }}
            voice={voice}
            onVoiceChange={setVoice}
            persona={persona}
            onPersonaChange={setPersona}
        />
      </div>

      {isVoiceMode && (
        <LiveVoiceView 
            onClose={() => setIsVoiceMode(false)} 
            onSend={(text) => {
                setIsVoiceMode(false);
                if(text) handleSendMessage(text);
            }}
            voice={voice}
        />
      )}
    </div>
  );
};

export default App;
