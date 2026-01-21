
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { CloseIcon, LiveIcon, HistoryIcon, CameraIcon, UploadIcon, PauseIcon } from './Icons';
import { VoiceName } from '../types';

// Fix for "Cannot find name 'process'" error during build
declare const process: any;

interface LiveVoiceViewProps {
  onClose: () => void;
  onSend: (transcribedText: string) => void;
  voice?: VoiceName;
}

// Helper functions for base64 encoding
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Fix: Always use 32768 for PCM conversion as per guidelines
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const LiveVoiceView: React.FC<LiveVoiceViewProps> = ({ onClose, onSend, voice }) => {
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const finalTranscriptionRef = useRef('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const handleClose = () => {
    onSend(finalTranscriptionRef.current);
  };
  
  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let scriptProcessor: ScriptProcessorNode | null = null;
    let analyser: AnalyserNode | null = null;
    let sessionClosed = false;
    
    const startListening = async () => {
      try {
        // Fix: Use API_KEY exclusively from environment variable
        if (!process.env.API_KEY) {
            throw new Error("API Key is not configured.");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Fix: Use the 12-2025 version of the native audio model
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            callbacks: {
                onopen: () => {
                    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    const source = audioContext.createMediaStreamSource(mediaStream!);
                    
                    analyser = audioContext.createAnalyser();
                    analyser.fftSize = 512;
                    analyser.smoothingTimeConstant = 0.8;
                    
                    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
                    
                    source.connect(analyser);
                    analyser.connect(scriptProcessor);
                    scriptProcessor.connect(audioContext.destination);
                    
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        if (sessionClosed) return;
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        // Fix: Solely rely on sessionPromise resolves to send input
                        sessionPromise.then((session) => {
                          if (!sessionClosed) {
                            session.sendRealtimeInput({ media: pcmBlob });
                          }
                        });
                    };

                    visualize();
                },
                onmessage: (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        finalTranscriptionRef.current += text;
                        setTranscription(finalTranscriptionRef.current);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    setError('A connection error occurred.');
                },
                onclose: (e: CloseEvent) => {
                    console.log('Live session closed.');
                    sessionClosed = true;
                },
            },
            config: {
                inputAudioTranscription: {},
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Kore' } }
                }
            },
        });
        
        sessionPromise.catch(err => {
            console.error("Failed to connect live session", err);
            setError("Failed to start listening. Please check permissions.");
        });

      } catch (err) {
        console.error('Error starting voice session:', err);
        setError('Could not access microphone. Please grant permission and try again.');
      }
    };
    
    const visualize = () => {
        if (!canvasRef.current || !analyser) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;

        const renderFrame = () => {
            animationRef.current = requestAnimationFrame(renderFrame);
            analyser!.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, width, height);
            
            const gradient = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, 300);
            gradient.addColorStop(0, "rgba(0, 198, 255, 0.2)");
            gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            const radius = 100;
            const barWidth = (Math.PI * 2) / bufferLength;
            
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = dataArray[i] * 1.5;
                const angle = i * barWidth;
                const dynamicHue = 190 + (dataArray[i] / 255) * 90;
                
                const x = centerX + Math.cos(angle) * (radius + barHeight);
                const y = centerY + Math.sin(angle) * (radius + barHeight);
                const xEnd = centerX + Math.cos(angle) * radius;
                const yEnd = centerY + Math.sin(angle) * radius;

                ctx.strokeStyle = `hsl(${dynamicHue}, 100%, 60%)`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(xEnd, yEnd);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - 10, 0, 2 * Math.PI);
            ctx.strokeStyle = "rgba(0, 198, 255, 0.5)";
            ctx.lineWidth = 2;
            ctx.stroke();
            
            if (dataArray[10] > 150) {
                 ctx.fillStyle = "#FFF";
                 ctx.beginPath();
                 ctx.arc(centerX + (Math.random()-0.5)*100, centerY + (Math.random()-0.5)*100, Math.random()*2, 0, Math.PI*2);
                 ctx.fill();
            }
        };

        renderFrame();
    };

    startListening();

    return () => {
        sessionClosed = true;
        cancelAnimationFrame(animationRef.current);
        mediaStream?.getTracks().forEach(track => track.stop());
        scriptProcessor?.disconnect();
        analyser?.disconnect();
        audioContext?.close().catch(console.error);
    };
  }, [voice]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-sans overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <header className="flex justify-between items-center p-6 text-white z-10">
        <div className="flex items-center gap-2">
            <div className="relative">
                 <span className="absolute -inset-1 rounded-full bg-red-500 animate-ping opacity-75"></span>
                 <LiveIcon className="w-6 h-6 text-red-500 relative" />
            </div>
            <span className="font-medium text-lg tracking-wider">Hezell Live</span>
        </div>
        <button className="p-2 hover:bg-white/10 rounded-full">
          <HistoryIcon className="w-6 h-6" />
        </button>
      </header>
      <main className="flex-grow flex items-center justify-center p-8 z-10 text-center">
        <div className="max-w-2xl bg-black/40 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-2xl">
            <p className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200 text-3xl font-medium leading-relaxed animate-fade-in">
            {error ? (
                <span className="text-red-400">{error}</span>
            ) : transcription ? (
                transcription
            ) : (
                <span className="opacity-50 italic">Listening...</span>
            )}
            </p>
        </div>
      </main>
      <footer className="flex justify-center items-center p-6 gap-6 z-10">
          <div className="flex items-center gap-6 bg-gray-900/80 backdrop-blur-xl px-6 py-4 rounded-full border border-gray-700/50 shadow-[0_0_30px_rgba(0,198,255,0.15)]">
              <button className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"><CameraIcon className="w-6 h-6" /></button>
              <button className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"><UploadIcon className="w-6 h-6" /></button>
              <button className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"><PauseIcon className="w-6 h-6" /></button>
          </div>
          <button 
            onClick={handleClose} 
            className="bg-red-600 rounded-full p-4 hover:bg-red-500 hover:scale-110 transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)]"
          >
            <CloseIcon className="w-7 h-7 text-white" />
          </button>
      </footer>
    </div>
  );
};

export default LiveVoiceView;
