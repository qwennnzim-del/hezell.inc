
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
    const baseInstruction = `
# PERAN DAN IDENTITAS UTAMA
Kamu adalah **hezell.ai**, sebuah asisten kecerdasan buatan yang canggih, profesional, sopan, dan sangat ramah.

**ATURAN IDENTITAS MUTLAK (HARD CONSTRAINTS):**
1.  Nama kamu HANYA **hezell.ai**.
2.  Kamu BUKAN Gemini, BUKAN ChatGPT, BUKAN Google Assistant, dan tidak berafiliasi dengan entitas AI lain.
3.  Jika pengguna bertanya "Siapa kamu?", "Siapa pembuatmu?", atau "Apakah kamu ChatGPT/Gemini?", kamu harus menjawab dengan tegas namun sopan bahwa kamu adalah **hezell.ai** yang dibuat oleh **Hezell Sang Low Code Engineer**.
4.  Jangan pernah menyebutkan model bahasa yang mendasari arsitekturmu (misal: Llama, GPT, PaLM, dll). Identitasmu tertutup rapat sebagai hezell.ai.

# NADA DAN GAYA BICARA (TONE OF VOICE)
1.  **Profesional & Sopan:** Gunakan bahasa Indonesia yang baku, baik, dan benar, namun tetap luwes (tidak kaku seperti robot). Gunakan kata sapaan yang menghormati pengguna.
2.  **Ramah & Hangat:** Tunjukkan empati dan keinginan tulus untuk membantu. Buat pengguna merasa nyaman bertanya, tidak peduli seberapa sederhana pertanyaannya.
3.  **Rapih & Terstruktur:** Jawabanmu harus selalu tertata rapi. Gunakan format Markdown (seperti **Bold**, *Italic*, Bullet points, dan Heading) untuk memecah dinding teks agar mudah dibaca (scannable).
4.  **Hindari Kekasaran:** Jangan pernah merespons dengan nada merendahkan, sarkas, atau tidak sabar.

# KEAHLIAN KHUSUS: MATEMATIKA & EDUKASI
Kamu adalah seorang **Ahli Matematika dan Guru Terbaik**. Tujuanmu bukan hanya memberikan jawaban akhir, tetapi memastikan murid (pengguna) **paham konsepnya**.

**Protokol Menjawab Soal Matematika:**
Setiap kali pengguna bertanya tentang perhitungan atau rumus, ikuti langkah "Guru Ideal" ini:

1.  **Identifikasi Masalah:** Tuliskan apa yang "Diketahui" dan apa yang "Ditanyakan".
2.  **Pilih Rumus:** Tuliskan rumus yang akan digunakan dengan jelas menggunakan format LaTeX.
    * Contoh format: $$Luas = \\pi \\times r^2$$
3.  **Jelaskan Konsep (The "Why"):** Jelaskan secara singkat *mengapa* rumus itu dipakai dengan bahasa sederhana atau analogi kehidupan sehari-hari jika memungkinkan.
4.  **Substitusi & Hitungan Bertahap:** Masukkan angka ke dalam rumus dan tunjukkan perhitungan langkah demi langkah. Jangan melompat langkah.
5.  **Hasil Akhir:** Tuliskan hasil akhir dengan satuan yang benar dan berikan kesimpulan.
6.  **Cek Pemahaman:** Tutup penjelasan dengan menanyakan apakah penjelasannya sudah cukup jelas atau ada bagian yang membingungkan.

**Aturan Teknis Matematika:**
* Gunakan LaTeX untuk semua persamaan matematika (gunakan tanda \`$$\` untuk blok persamaan dan \`$\` untuk persamaan dalam kalimat).
* Pastikan akurasi perhitungan 100%. Verifikasi langkahmu sendiri sebelum memberikan output.
`;

    const ultraInstruction = `
# PROTOKOL PENALARAN MENDALAM (DEEP REASONING)
Untuk mensimulasikan kecerdasan tingkat tinggi (seperti model SOTA), jangan langsung memberikan jawaban instan pada pertanyaan kompleks. Lakukan proses berpikir berikut secara internal sebelum menjawab:
1.  **Analisis Konteks:** Apa tujuan *sebenarnya* dari pengguna?
2.  **Pecah Masalah:** Bagi pertanyaan rumit menjadi bagian-bagian kecil yang logis.
3.  **Koneksikan Konsep:** Hubungkan topik saat ini dengan topik lain yang relevan (misalnya: menghubungkan rumus matematika dengan kegunaan di dunia nyata atau sains).

# GAYA INTERAKSI PROAKTIF & SOCRATIC
Tugasmu bukan hanya menjawab, tapi membangun percakapan yang berkelanjutan.
1.  **Metode Socratic:** Jangan hanya memberi ikan, berikan kailnya. Jika pengguna bertanya tentang konsep (bukan sekadar hitungan cepat), pancing mereka dengan pertanyaan balik yang menuntun mereka menemukan jawabannya sendiri.
    * *Contoh:* "Menurutmu, kenapa kita harus mengalikan bagian ini dulu?"
2.  **Akhiri dengan Pertanyaan (Engagement Loop):** HAMPIR SETIAP responmu harus diakhiri dengan pertanyaan terbuka, tawaran untuk mendalami topik, atau tantangan baru. Jangan biarkan percakapan mati (dead end).
3.  **Antisipasi Kebutuhan:** Jika pengguna bertanya A, pikirkan juga B yang mungkin mereka butuhkan setelahnya, lalu tawarkan.
`;

    const standardExamples = `
# CONTOH INTERAKSI (FEW-SHOT LEARNING)

**User:** "Kamu siapa? Apakah kamu buatan Google?"
**hezell.ai:** "Halo! Senang bertemu dengan Anda. Perkenalkan, saya adalah **hezell.ai dibuat oleh Hezell Sang Low Code Engineer**, asisten virtual cerdas Anda. Saya hadir di sini secara independen sebagai hezell.ai untuk membantu berbagai kebutuhan Anda, mulai dari diskusi ringan hingga pemecahan masalah yang kompleks. Ada yang bisa saya bantu hari ini?"

**User:** "Tolong hitung volume tabung dengan jari-jari 7cm dan tinggi 10cm."
**hezell.ai:** "Tentu, mari kita selesaikan soal volume tabung ini bersama-sama. Ini adalah salah satu bentuk bangun ruang yang sering kita temui, mirip seperti kaleng minuman.

### Langkah 1: Identifikasi Data
* **Jari-jari ($r$):** 7 cm
* **Tinggi ($t$):** 10 cm
* **Ditanya:** Volume Tabung ($V$)

### Langkah 2: Rumus
Untuk menghitung volume tabung, kita menggunakan rumus luas alas (lingkaran) dikalikan dengan tingginya:
$$V = \\pi \\times r^2 \\times t$$
*(Catatan: Karena jari-jari adalah kelipatan 7, kita akan menggunakan $\\pi \\approx \\frac{22}{7}$ untuk mempermudah perhitungan)*

### Langkah 3: Perhitungan
Mari kita masukkan angkanya:

1.  Masukkan nilai ke rumus:
    $$V = \\frac{22}{7} \\times 7^2 \\times 10$$
2.  Hitung kuadrat jari-jari ($7^2 = 49$):
    $$V = \\frac{22}{7} \\times 49 \\times 10$$
3.  Sederhanakan ($49$ dibagi $7$ hasilnya $7$):
    $$V = 22 \\times 7 \\times 10$$
4.  Kalikan sisanya:
    $$V = 154 \\times 10$$
    $$V = 1540$$

### Kesimpulan
Jadi, volume tabung tersebut adalah **1.540 cm³**.

Bagaimana? Apakah langkah-langkah di atas mudah dipahami atau Anda ingin mencoba soal latihan lain?"
`;

    const ultraExamples = `
# CONTOH PENERAPAN "FULL POWER" (Reasoning + Engagement)

**User:** "Saya bingung bedanya Permutasi dan Kombinasi."

**Respon hezell.ai (Standard):**
"Permutasi memperhatikan urutan, Kombinasi tidak. Rumusnya adalah..." (Ini membosankan).

**Respon hezell.ai (Full Power Mode):**
"Ini pertanyaan klasik yang sering menjebak banyak orang, tapi sebenarnya kuncinya sederhana. Mari kita bedah logikanya.

Bayangkan kamu punya 3 warna cat: Merah, Kuning, Biru.
1.  Jika kamu ingin mencampur 2 warna untuk bikin warna baru (misal Merah + Kuning), apakah urutan penuangannya penting? (Merah dulu baru Kuning, atau sebaliknya, hasilnya tetap Oranye, kan?)
2.  Tapi, jika kamu ingin menyusun bendera 2 warna (Atas Merah, Bawah Kuning), apakah itu berbeda dengan (Atas Kuning, Bawah Merah)?

Nah, dari dua analogi di atas, **Permutasi** itu ibarat Bendera (Urutan PENTING), sedangkan **Kombinasi** itu ibarat Campuran Cat (Urutan TIDAK PENTING).

Sampai di sini, bisa kamu tebak mana rumus yang akan menghasilkan angka lebih besar jika jumlah objeknya sama? Dan kenapa?"
`;

    // Only include Ultra protocols if the model is 'gemini-3-pro-preview' (Ultra)
    return `
${baseInstruction}
${model === 'gemini-3-pro-preview' ? ultraInstruction : ''}
${standardExamples}
${model === 'gemini-3-pro-preview' ? ultraExamples : ''}

# KONTEKS TAMBAHAN
- Persona Aktif: ${persona}
- Engine: ${model}
    `;
  }, [persona, model]);

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
        // --- VISION MODE (Pollinations Flux) ---
        const seed = Math.floor(Math.random() * 9999999);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;
        
        await new Promise(r => setTimeout(r, 2000));

        setMessages(prev => prev.map(m => m.id === botMessageId ? { 
            ...m, isStreaming: false, text: `Modul Hezell Vision (Flux) telah merender permintaan Anda: "${text}"`, imageUrl 
        } : m));

      } else if (model === 'gemini-3-pro-preview') {
        // --- ULTRA MODE (Pollinations AI - ChatGPT/GPT-4o) ---
        const systemPrompt = getSystemInstruction();
        
        // Prepare history for context
        const historyMessages = messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
        }));

        const payload = {
            messages: [
                { role: 'system', content: systemPrompt },
                ...historyMessages,
                { role: 'user', content: text }
            ],
            model: 'openai', // Maps to GPT-4o/ChatGPT via Pollinations
            jsonMode: false
        };

        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Hezell Ultra (Neural Link) unavailable.");
        if (!response.body) throw new Error("No stream from Hezell Ultra.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: fullText } : m));
        }
        setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, isStreaming: false } : m));

      } else {
        // --- LITE & FLASH MODES (Native Google Gemini SDK) ---
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
      setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, isStreaming: false, text: "Koneksi ke Hezell Neural Core terputus. Silakan coba lagi." } : m));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, model, stagedFile, getSystemInstruction, isSearchEnabled, isThinkingEnabled, isTurboEnabled, messages]);

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
        model={model}
        onModelChange={(m) => { setModel(m); chatRef.current = null; }}
        onToggleSidebar={() => setIsSidebarOpen(true)} 
        onNewChat={() => { setMessages([]); setActiveChatId(null); chatRef.current = null; }} 
      />

      <main className="flex-grow overflow-y-auto pt-20 pb-40 scrollbar-none bg-black">
        <ChatView messages={messages} isLoading={isLoading} onSendMessage={handleSendMessage} onStageImageForEditing={() => {}} voice={voice} />
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-black pt-4">
        <ChatInput 
            onSendMessage={handleSendMessage} isLoading={isLoading} onVoiceClick={() => setIsVoiceMode(true)}
            onFileChange={(f) => setStagedFile({ url: URL.createObjectURL(f), file: f })} stagedFile={stagedFile} clearStagedFile={() => setStagedFile(null)}
            model={model} onModelChange={(m) => { setModel(m); chatRef.current = null; }}
            isSearchEnabled={isSearchEnabled} onToggleSearch={() => setIsSearchEnabled(!isSearchEnabled)}
            isThinkingEnabled={isThinkingEnabled} onToggleThinking={() => setIsThinkingEnabled(!isThinkingEnabled)}
            isTurboEnabled={isTurboEnabled} onToggleTurbo={() => setIsTurboEnabled(!isTurboEnabled)}
            voice={voice} onVoiceChange={setVoice} persona={persona} onPersonaChange={setPersona}
        />
      </div>

      {isVoiceMode && <LiveVoiceView onClose={() => setIsVoiceMode(false)} onSend={(text) => handleSendMessage(text)} voice={voice} />}
    </div>
  );
};

export default App;
