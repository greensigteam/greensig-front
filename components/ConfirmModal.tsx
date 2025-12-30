import React from 'react';
import { AlertCircle, HelpCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { BaseModal } from './BaseModal';

// ============================================================================
// TYPES
// ============================================================================

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmModalProps {
  /** Contrôle la visibilité */
  isOpen: boolean;

  /** Titre de la confirmation */
  title: string;

  /** Message de confirmation */
  message: string;

  /** Label du bouton de confirmation */
  confirmLabel?: string;

  /** Label du bouton d'annulation */
  cancelLabel?: string;

  /** Callback de confirmation */
  onConfirm: () => void;

  /** Callback d'annulation */
  onCancel: () => void;

  /** Variant visuel */
  variant?: ConfirmVariant;

  /** Affiche un état de chargement sur le bouton confirm */
  loading?: boolean;
}

// ============================================================================
// VARIANT CONFIGURATIONS
// ============================================================================

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  {
    icon: React.ReactNode;
    iconBg: string;
    buttonClass: string;
  }
> = {
  danger: {
    icon: <AlertCircle className="w-12 h-12 text-red-500" />,
    iconBg: 'bg-red-50',
    buttonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  warning: {
    icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
    iconBg: 'bg-amber-50',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  },
  info: {
    icon: <HelpCircle className="w-12 h-12 text-blue-500" />,
    iconBg: 'bg-blue-50',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  },
  success: {
    icon: <CheckCircle className="w-12 h-12 text-emerald-500" />,
    iconBg: 'bg-emerald-50',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false,
}) => {
  const config = VARIANT_CONFIG[variant];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      closeOnOutsideClick={!loading}
      closeOnEscape={!loading}
      showCloseButton={false}
      zIndex={9999}
    >
      <div className="p-6 flex flex-col items-center text-center">
        {/* Icon */}
        <div className={`mb-4 p-3 rounded-full ${config.iconBg}`}>
          {config.icon}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

        {/* Message */}
        <p className="text-gray-500 mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`
              flex-1 px-4 py-2 text-white font-medium rounded-lg transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${config.buttonClass}
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Chargement...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ConfirmModal;
