import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ZoomWarningModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

const ZoomWarningModal: React.FC<ZoomWarningModalProps> = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 pointer-events-auto">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 scale-100 animate-in zoom-in-95 duration-200">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="bg-orange-100 p-3 rounded-full shrink-0">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">Zoom trop éloigné</h3>
            <p className="text-sm text-slate-500 mt-1">
              À ce niveau de zoom, les détails des infrastructures ne seront plus visibles.
              Voulez-vous continuer ?
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
        >
          Confirmer
        </button>
      </div>
    </div>
  </div>
);

export default ZoomWarningModal;
