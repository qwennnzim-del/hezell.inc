
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type ModelType = 'gemini-2.5-flash' | 'gemini-3-pro-preview' | 'gemini-2.5-flash-image' | 'gemini-flash-lite-latest' | 'gemini-1.5-flash' | 'imagen-4.0-generate-001';
export type VoiceName = 'Kore' | 'Fenrir' | 'Puck' | 'Charon' | 'Aoede';
export type AgentPersona = 'Default' | 'Architect' | 'Strategist' | 'Professor' | 'Ghost';

export interface Message {
  id: string;
  text: string;
  thinkingText?: string;
  sender: 'user' | 'bot';
  isStreaming?: boolean;
  model?: ModelType;
  suggestions?: string[];
  imageUrl?: string;
  aspectRatio?: AspectRatio;
  uploadedImageUrl?: string;
  groundingMetadata?: any;
  statusText?: string;
  isThinkingMode?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}
