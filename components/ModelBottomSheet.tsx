
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
    { id: 'gemini-2.5-flash', name: 'Hezell Flash 2.5', description: 'Cepat, cerdas, & stabil. Pilihan terbaik harian.', tag: 'RECOMMENDED' },
    { id: 'gemini-flash-lite-latest', name: 'Hezell Lite 2.0', description: 'Paling ringan & hemat kuota. Respon instan.', tag: 'STABLE' },
    { id: 'gemini-3-pro-preview', name: 'Hezell Pro 3.0', description: 'Logika tinggi. (Mungkin butuh akun berbayar/Limit).', tag: 'HIGH USAGE' },
    { id: 'gemini-2.5-flash-image', name: 'Hezell Image', description: 'Membuat gambar AI. (Perlu Billing Aktif).', tag: 'PAID' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Sheet */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[70] bg-[#121212] rounded-t-[30px] shadow-2xl transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? 'translate-y-0' : 'translate-y-full'} max-h-[80vh] overflow-y-auto border-t border-gray-800`}
      >
        <div className="sticky top-0 bg-[#121212]/95 backdrop-blur-md z-10 p-4 border-b border-gray-800">
            <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-bold text-center text-white tracking-wide">Pilih Neural Engine</h2>
            <p className="text-xs text-center text-gray-400 mt-1">Pilih otak AI yang sesuai kebutuhan Anda</p>
        </div>

        <div className="p-4 space-y-3 pb-8">
            {modelOptions.map((option) => (
                <button
                    key={option.id}
                    onClick={() => { onModelChange(option.id); onClose(); }}
                    className={`relative w-full text-left p-4 rounded-2xl border transition-all duration-200 group ${
                        model === option.id 
                        ? 'bg-gray-800 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                        : 'bg-gray-900/40 border-gray-800 hover:bg-gray-800'
                    }`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-base font-bold ${model === option.id ? 'text-white' : 'text-gray-300'}`}>
                                    {option.name}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    option.tag === 'HIGH USAGE' ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' :
                                    option.tag === 'STABLE' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                                    option.tag === 'PAID' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                                    'text-blue-400 border-blue-500/30 bg-blue-500/10'
                                }`}>
                                    {option.tag}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">{option.description}</p>
                        </div>
                        {model === option.id && (
                            <div className="bg-blue-500 rounded-full p-1">
                                <CheckIcon className="w-4 h-4 text-white" />
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
