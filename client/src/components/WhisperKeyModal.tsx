import React, { useState } from 'react';
import { Key, X, ExternalLink, CheckCircle2, Zap } from 'lucide-react';

interface WhisperKeyModalProps {
  onSave: (key: string) => void;
  onClose: () => void;
  currentKey: string;
}

export function WhisperKeyModal({ onSave, onClose, currentKey }: WhisperKeyModalProps) {
  const [key, setKey] = useState(currentKey);
  const [saved, setSaved] = useState(false);

  const isGroq = key.startsWith('gsk_');
  const isOpenAI = key.startsWith('sk-');

  const handleSave = () => {
    onSave(key.trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-7 w-full max-w-md shadow-xl animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
              <Key size={17} className="text-[#4F46E5]" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Transcription API Key</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Groq recommended banner */}
        <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl mb-5">
          <Zap size={16} className="text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-green-700 font-semibold">Groq is recommended — free &amp; fast</p>
            <p className="text-green-600 text-sm mt-0.5">Free tier · no billing required · faster than OpenAI</p>
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 mt-2 underline">
              <ExternalLink size={12} /> Get free Groq key →
            </a>
          </div>
        </div>

        <input
          type="password"
          placeholder="gsk_… (Groq)  or  sk-… (OpenAI)"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && key.trim() && handleSave()}
          className="w-full bg-gray-50 border border-gray-300 focus:border-[#4F46E5] rounded-xl px-4 py-3 text-gray-900 text-sm outline-none placeholder:text-gray-400 mb-3 font-mono"
          autoFocus
        />

        {key && (
          <p className={`text-sm mb-3 font-medium ${isGroq ? 'text-green-600' : isOpenAI ? 'text-[#4F46E5]' : 'text-gray-400'}`}>
            {isGroq ? '✓ Groq key detected — routes to api.groq.com' :
             isOpenAI ? '✓ OpenAI key detected' :
             'Key format not recognised — should start with gsk_ or sk-'}
          </p>
        )}

        <p className="text-sm text-gray-400 mb-6">
          Saved in your browser only and sent directly to the server with each audio chunk.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-500 rounded-xl hover:border-gray-400 hover:text-gray-900 text-sm font-medium transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!key.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#4F46E5] hover:bg-[#3730a3] disabled:opacity-40 text-white rounded-xl text-sm font-semibold shadow-lg shadow-[#4F46E5]/20 transition-all">
            {saved ? <><CheckCircle2 size={15} /> Saved!</> : 'Save Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
