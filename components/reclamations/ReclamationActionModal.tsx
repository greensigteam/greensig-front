import React from 'react';
import { AlertCircle, X, Info, Edit2 } from 'lucide-react';
import { PremiumTextarea } from '../modals/PremiumFormComponents';

interface ReclamationActionModalProps {
  title: string;
  subtitle: string;
  warningTitle: string;
  warningMessage: string;
  warningColor: 'red' | 'orange';
  textareaLabel: string;
  textareaPlaceholder: string;
  textareaValue: string;
  onTextareaChange: (value: string) => void;
  infoItems: string[];
  infoTitle: string;
  infoTitleClassName?: string;
  confirmLabel: string;
  confirmColor: 'red' | 'orange';
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  extraContent?: React.ReactNode;
}

const colorMap = {
  red: {
    warning: 'bg-red-50 border-red-200',
    warningIcon: 'text-red-600',
    warningText: 'text-red-800',
    button: 'bg-red-600 hover:bg-red-700',
    alertIcon: 'text-red-600',
  },
  orange: {
    warning: 'bg-orange-50 border-orange-200',
    warningIcon: 'text-orange-600',
    warningText: 'text-orange-800',
    button: 'bg-orange-600 hover:bg-orange-700',
    alertIcon: 'text-orange-600',
  },
};

const ReclamationActionModal: React.FC<ReclamationActionModalProps> = ({
  title,
  subtitle,
  warningTitle,
  warningMessage,
  warningColor,
  textareaLabel,
  textareaPlaceholder,
  textareaValue,
  onTextareaChange,
  infoItems,
  infoTitle,
  infoTitleClassName,
  confirmLabel,
  confirmColor,
  isSubmitting,
  onConfirm,
  onCancel,
  extraContent,
}) => {
  const colors = colorMap[warningColor];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle className={`w-5 h-5 ${colors.alertIcon}`} />
              {title}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className={`${colors.warning} border rounded-lg p-4 flex items-start gap-3`}>
            <Info className={`w-5 h-5 ${colors.warningIcon} flex-shrink-0 mt-0.5`} />
            <div className={`text-sm ${colors.warningText}`}>
              <p className="font-semibold mb-1">{warningTitle}</p>
              <p>{warningMessage}</p>
            </div>
          </div>

          {extraContent}

          <PremiumTextarea
            value={textareaValue}
            onChange={onTextareaChange}
            label={textareaLabel}
            placeholder={textareaPlaceholder}
            icon={<Edit2 className="w-4 h-4" />}
            required
            variant="outlined"
            size="md"
            rows={5}
          />

          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            <p className={`font-semibold mb-1 ${infoTitleClassName || ''}`}>{infoTitle}</p>
            <ul className="list-disc list-inside space-y-1">
              {infoItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || !textareaValue.trim()}
            className={`px-4 py-2 ${colorMap[confirmColor].button} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReclamationActionModal;
