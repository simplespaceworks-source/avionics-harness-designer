import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-panel border border-border shadow-2xl rounded-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
             <div className="bg-system-error/20 text-system-error p-1.5 rounded-lg">
               <AlertTriangle size={18} />
             </div>
             <h3 className="text-white font-medium">{title}</h3>
          </div>
          <button onClick={onCancel} className="text-text-muted hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-text-muted text-sm">{message}</p>
        </div>
        <div className="p-4 bg-canvas/50 border-t border-border/50 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-border">
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onCancel(); }} className="px-4 py-2 text-sm font-medium bg-system-error hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg">
            Confirm Action
          </button>
        </div>
      </div>
    </div>
  );
}
