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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-blue-400" />
            <h2 className="text-white font-semibold">Transcription API Key</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Groq recommended banner */}
        <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl mb-4">
          <Zap size={16} className="text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-green-300 text-sm font-medium">Groq is recommended (free &amp; fast)</p>
            <p className="text-green-600 text-xs mt-0.5">Free tier · no billing required · faster than OpenAI</p>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 mt-1.5 underline"
            >
              <ExternalLink size={10} /> Get free Groq key → console.groq.com/keys
            </a>
          </div>
        </div>

        <input
          type="password"
          placeholder="gsk_... (Groq)  or  sk-... (OpenAI)"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && key.trim() && handleSave()}
          className="w-full bg-slate-900 border border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2.5 text-slate-200 text-sm outline-none placeholder:text-slate-600 mb-3 font-mono"
          autoFocus
        />

        {/* Live key type indicator */}
        {key && (
          <p className={`text-xs mb-3 ${isGroq ? 'text-green-400' : isOpenAI ? 'text-blue-400' : 'text-slate-500'}`}>
            {isGroq ? '✓ Groq key detected — routes to api.groq.com' :
             isOpenAI ? '✓ OpenAI key detected' :
             'Key format not recognised — should start with gsk_ or sk-'}
          </p>
        )}

        <p className="text-xs text-slate-600 mb-5">
          Key is saved in your browser only and sent directly to the server with each audio chunk.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-slate-600 text-slate-400 rounded-lg hover:border-slate-500 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saved ? <><CheckCircle2 size={14} /> Saved!</> : 'Save Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
