import React, { FormEvent } from 'react';
import { BaseModal, ModalHeader, ModalBody, ModalFooter, ModalSize } from './BaseModal';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { StepIndicator, type Step } from './modals/StepIndicator';
import { MODAL_DESIGN_TOKENS } from './modals/designTokens';

// ============================================================================
// TYPES
// ============================================================================

export interface FormModalProps {
  /** Contrôle la visibilité */
  isOpen: boolean;

  /** Callback de fermeture */
  onClose: () => void;

  /** Callback de soumission du formulaire */
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;

  /** Titre de la modale */
  title: string;

  /** Sous-titre optionnel */
  subtitle?: string;

  /** Icône du header */
  icon?: React.ReactNode;

  /** Taille de la modale */
  size?: ModalSize;

  /** État de chargement (désactive inputs et boutons) */
  loading?: boolean;

  /** Message d'erreur à afficher */
  error?: string | null;

  /** Contenu du formulaire */
  children: React.ReactNode;

  /** Label du bouton de soumission */
  submitLabel?: string;

  /** Label du bouton d'annulation */
  cancelLabel?: string;

  /** Variant du bouton submit */
  submitVariant?: 'primary' | 'danger' | 'success';

  /** Désactive le bouton submit */
  submitDisabled?: boolean;

  /** Actions additionnelles dans le footer (avant les boutons principaux) */
  additionalActions?: React.ReactNode;

  /** Cache le footer complètement */
  hideFooter?: boolean;

  /** Classes CSS additionnelles pour le formulaire */
  formClassName?: string;

  // ============================================================================
  // NOUVELLES PROPS - HARMONISATION AVEC QUICKTASKCREATOR
  // ============================================================================

  /** Support multi-étapes - liste des étapes */
  steps?: Step[];

  /** Support multi-étapes - étape courante */
  currentStep?: string;

  /** Support multi-étapes - étapes complétées */
  completedSteps?: string[];

  /** Afficher panneau de résumé (sidebar droite) */
  showSummary?: boolean;

  /** Contenu du panneau de résumé */
  summaryContent?: React.ReactNode;

  /** Utiliser gradient header (emerald-50 to teal-50) - opt-in, default false */
  useGradientHeader?: boolean;

  /** Variant d'animation */
  animationVariant?: 'fade' | 'zoom';
}

// ============================================================================
// VARIANT STYLES
// ============================================================================

const SUBMIT_VARIANT_CLASSES = {
  primary: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm',
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-sm',
  success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 shadow-sm',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  subtitle,
  icon,
  size = 'lg',
  loading = false,
  error = null,
  children,
  submitLabel = 'Enregistrer',
  cancelLabel = 'Annuler',
  submitVariant = 'primary',
  submitDisabled = false,
  additionalActions,
  hideFooter = false,
  formClassName = '',
  // Nouvelles props avec defaults
  steps,
  currentStep,
  completedSteps = [],
  showSummary = false,
  summaryContent,
  useGradientHeader = false,
  animationVariant = 'zoom',
}) => {
  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading || submitDisabled) return;

    await onSubmit(e);
  };

  const handleClose = () => {
    // Ne permet pas la fermeture pendant le chargement
    if (!loading) {
      onClose();
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size={size}
      closeOnOutsideClick={!loading}
      closeOnEscape={!loading}
      showCloseButton={!loading && !useGradientHeader}
    >
      {/* Ajout de min-h-0 pour permettre le scroll interne dans les flex containers imbriqués */}
      <form onSubmit={handleSubmit} className={`flex flex-col h-full min-h-0 ${formClassName}`}>
        {/* Header */}
        {useGradientHeader ? (
          <div className={`px-6 py-3 border-b flex items-center justify-between flex-shrink-0 ${
            MODAL_DESIGN_TOKENS.colors.gradients.header
          } ${MODAL_DESIGN_TOKENS.colors.borders.emerald}`}>
            <div className="flex items-center gap-3">
              {icon && (
                <div className={`w-8 h-8 ${MODAL_DESIGN_TOKENS.colors.backgrounds.emerald100} ${MODAL_DESIGN_TOKENS.borderRadius.lg} flex items-center justify-center`}>
                  {icon}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {!loading && (
              <button
                type="button"
                onClick={handleClose}
                className="p-2 hover:bg-white/50 rounded-full transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
        ) : (
          <ModalHeader title={title} subtitle={subtitle} icon={icon} />
        )}

        {/* Step Indicator (if steps provided) */}
        {steps && steps.length > 0 && (
          <StepIndicator
            steps={steps}
            currentStep={currentStep || steps[0].id}
            completedSteps={completedSteps}
          />
        )}

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 flex-shrink-0 animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">Erreur</p>
              <p className="text-sm text-red-600 mt-0.5 whitespace-pre-wrap">{error}</p>
            </div>
          </div>
        )}

        {/* Body - Two-column layout if summary enabled */}
        {showSummary && summaryContent ? (
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Main Content */}
            <div className={`flex-1 overflow-y-auto p-6 ${loading ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'}`}>
              {children}
            </div>

            {/* Summary Sidebar */}
            <div className={`${MODAL_DESIGN_TOKENS.spacing.sidebarWidth} border-l ${MODAL_DESIGN_TOKENS.colors.borders.default} ${MODAL_DESIGN_TOKENS.colors.gradients.sidebar} overflow-y-auto flex-shrink-0`}>
              {summaryContent}
            </div>
          </div>
        ) : (
          <ModalBody className={loading ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'}>
            {children}
          </ModalBody>
        )}

        {/* Footer */}
        {!hideFooter && (
          <ModalFooter>
            {/* Additional Actions (left side) */}
            {additionalActions && (
              <div className="flex-1 flex items-center gap-2">
                {additionalActions}
              </div>
            )}

            {/* Spacer if no additional actions */}
            {!additionalActions && <div className="flex-1" />}

            {/* Main Actions (right side) */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className={`${MODAL_DESIGN_TOKENS.buttons.paddingCompact} text-sm font-medium ${MODAL_DESIGN_TOKENS.buttons.secondary} transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
              >
                {cancelLabel}
              </button>

              <button
                type="submit"
                disabled={loading || submitDisabled}
                className={`
                  ${MODAL_DESIGN_TOKENS.buttons.paddingCompact} text-sm font-medium text-white
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${SUBMIT_VARIANT_CLASSES[submitVariant]}
                `}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </span>
                ) : (
                  submitLabel
                )}
              </button>
            </div>
          </ModalFooter>
        )}
      </form>
    </BaseModal>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Groupe de champs de formulaire avec label
 */
export const FormField: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}> = ({ label, required, error, hint, children, className = '', icon }) => (
  <div className={`space-y-1.5 ${className}`}>
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
      {icon && <span className="text-gray-400">{icon}</span>}
      {label}
      {required && <span className="text-red-500 ml-0.5" title="Champ obligatoire">*</span>}
    </label>
    {children}
    {hint && !error && (
      <p className="text-xs text-gray-500">{hint}</p>
    )}
    {error && (
      <p className="text-xs text-red-600 flex items-center gap-1 animate-in slide-in-from-top-1">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    )}
  </div>
);

/**
 * Grille responsive pour formulaires
 */
export const FormGrid: React.FC<{
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}> = ({ columns = 2, children, className = '' }) => {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[columns];

  return (
    <div className={`grid ${gridClass} gap-4 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Section de formulaire avec titre
 */
export const FormSection: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, description, children, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    <div className="border-b border-gray-200 pb-3">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      )}
    </div>
    {children}
  </div>
);

/**
 * Checkbox avec label
 */
export const FormCheckbox: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: string;
  className?: string;
}> = ({ label, checked, onChange, disabled, hint, className = '' }) => (
  <div className={`flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${className}`}>
    <div className="flex items-center h-5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-offset-0 disabled:opacity-50 cursor-pointer"
      />
    </div>
    <div className="flex-1 text-sm">
      <label className="font-medium text-gray-700 cursor-pointer select-none">
        {label}
      </label>
      {hint && (
        <p className="text-gray-500 mt-0.5">{hint}</p>
      )}
    </div>
  </div>
);

/**
 * Input standard
 */
export const FormInput: React.FC<{
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'datetime-local' | 'time';
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  required,
  min,
  max,
  step,
  className = '',
}) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    required={required}
    min={min}
    max={max}
    step={step}
    className={`
      w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900
      placeholder:text-gray-400
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      transition-all duration-200 ease-in-out
      shadow-sm hover:border-gray-400
      ${className}
    `}
  />
);

/**
 * Textarea standard
 */
export const FormTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  className?: string;
}> = ({
  value,
  onChange,
  placeholder,
  disabled,
  required,
  rows = 4,
  className = '',
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    required={required}
    rows={rows}
    className={`
      w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900
      placeholder:text-gray-400
      focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      transition-all duration-200 ease-in-out
      shadow-sm hover:border-gray-400
      resize-none
      ${className}
    `}
  />
);

/**
 * Select standard
 */
export const FormSelect: React.FC<{
  value: string | number;
  onChange: (value: string) => void;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required,
  className = '',
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      className={`
        w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900
        focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
        disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
        transition-all duration-200 ease-in-out
        shadow-sm hover:border-gray-400
        appearance-none
        ${className}
      `}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
);

// ============================================================================
// EXPORT
// ============================================================================

export default FormModal;
