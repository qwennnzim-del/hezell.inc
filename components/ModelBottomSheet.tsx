
import React from 'react';
import { ModelType } from '../types';
import { CheckIcon } from './Icons';

interface ModelBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  model: ModelType;
  onModelChange: (model: ModelType) => void;
}

const ModelBottomSheet: React.FC<ModelBottomSheetProps> = ({ isOpen, onClose, model, onModelChange }) => {
  const modelOptions: { id: ModelType; name: string; description: string; tag: string }[] = [
    { id: 'gemini-3-flash-preview', name: 'Hezell Neural Core (Flash)', description: 'Mesin utama Hezell yang seimbang, cerdas, dan instan.', tag: 'DEFAULT' },
    { id: 'gemini-flash-lite-latest', name: 'Hezell Neural Core (Lite)', description: 'Versi ringan untuk efisiensi energi dan kecepatan maksimal.', tag: 'SPEED' },
    { id: 'gemini-3-pro-preview', name: 'Hezell Neural Core (Ultra)', description: 'Logika tingkat tinggi untuk tugas kompleks dan analisis mendalam.', tag: 'UNLIMITED' },
    { id: 'gemini-2.5-flash-image', name: 'Hezell Vision Engine (Flux)', description: 'Model fotorealistik Flux dari HuggingFace untuk desain visual presisi.', tag: 'CREATIVE' },
  ];

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      <div 
        className={`fixed bottom-0 left-0 right-0 z-[70] bg-[#0A0A0A] rounded-t-[32px] shadow-2xl transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-y-0' : 'translate-y-full'} max-h-[85vh] overflow-y-auto border-t border-white/10`}
      >
        <div className="sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-md z-10 p-6 border-b border-white/5">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-black text-center text-white tracking-tight uppercase">Neural Architecture</h2>
            <p className="text-[10px] text-center text-gray-500 mt-2 font-bold tracking-widest uppercase">Select an engine by Hezell.Inc</p>
        </div>

        <div className="p-6 space-y-4 pb-12">
            {modelOptions.map((option) => (
                <button
                    key={option.id}
                    onClick={() => { onModelChange(option.id); onClose(); }}
                    className={`relative w-full text-left p-5 rounded-2xl border transition-all duration-300 group ${
                        model === option.id 
                        ? 'bg-white/5 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]' 
                        : 'bg-transparent border-white/5 hover:bg-white/[0.02] hover:border-white/10'
                    }`}
                >
                    <div className="flex justify-between items-start">
                        <div className="pr-8">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-base font-black tracking-tight ${model === option.id ? 'text-white' : 'text-gray-400'}`}>
                                    {option.name}
                                </span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                    option.tag === 'UNLIMITED' ? 'text-purple-400 border-purple-400/30' :
                                    option.tag === 'SPEED' ? 'text-yellow-400 border-yellow-400/30' :
                                    option.tag === 'CREATIVE' ? 'text-blue-400 border-blue-400/30' :
                                    'text-white/40 border-white/10'
                                }`}>
                                    {option.tag}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed font-light">{option.description}</p>
                        </div>
                        {model === option.id && (
                            <div className="bg-white text-black rounded-full p-1 shadow-lg">
                                <CheckIcon className="w-3 h-3" />
                            </div>
                        )}
                    </div>
                </button>
            ))}
        </div>
      </div>
    </>
  );
};

export default ModelBottomSheet;
