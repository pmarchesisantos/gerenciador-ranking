
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#111827] w-full max-w-md border border-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${variant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-400 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-3 p-6 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 transition-all border border-transparent"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-white transition-all shadow-lg ${
              variant === 'danger' 
              ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' 
              : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
