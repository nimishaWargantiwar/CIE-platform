// ==========================================
// Modal Component — Reusable dialog
// ==========================================

import { useEffect } from 'react';
import { HiX } from 'react-icons/hi';

export default function Modal({ show, onClose, title, children, wide = false }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (show) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={onClose} />

      {/* Content */}
      <div className={`relative z-10 mx-4 rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.95)] backdrop-blur ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
            <HiX className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
