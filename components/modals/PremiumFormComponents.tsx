/**
 * Premium Form Components - Niveau 3
 * Composants de formulaire modernes avec floating labels, animations, glassmorphism
 */

import React, { useState, useRef, useEffect, forwardRef, useMemo } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, ChevronDown, X, Search } from 'lucide-react';
import { PREMIUM_DESIGN_TOKENS, InputVariant, InputSize } from './premiumDesignTokens';

// ============================================================================
// TYPES
// ============================================================================

export interface PremiumInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'datetime-local' | 'time';
  value: string | number;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  success?: boolean;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  variant?: InputVariant;
  size?: InputSize;
  min?: number | string;
  max?: number | string;
  step?: number;
  minLength?: number;
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export interface PremiumSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: Array<{ value: string | number; label: string; icon?: React.ReactNode }>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  variant?: InputVariant;
  size?: InputSize;
  className?: string;
}

export interface PremiumTextareaProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  rows?: number;
  variant?: InputVariant;
  size?: InputSize;
  maxLength?: number;
  autoResize?: boolean;
  className?: string;
}

export interface PremiumButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export interface PremiumSearchableSelectProps {
  value: string | number | null;
  onChange: (value: string | number) => void;
  options: Array<{ value: string | number; label: string }>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  variant?: InputVariant;
  size?: InputSize;
  searchPlaceholder?: string;
  emptyMessage?: string;
  footerAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  className?: string;
}

export interface PremiumMultiSelectProps {
  values?: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  options: Array<{ value: string | number; label: string }>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  variant?: InputVariant;
  size?: InputSize;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
}

// ============================================================================
// PREMIUM INPUT COMPONENT
// ============================================================================

export const PremiumInput = forwardRef<HTMLInputElement, PremiumInputProps>(({
  type = 'text',
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  required = false,
  error,
  success = false,
  hint,
  icon,
  iconRight,
  variant = 'outlined',
  size = 'md',
  min,
  max,
  step,
  minLength,
  maxLength,
  autoFocus = false,
  className = '',
  onBlur,
  onFocus,
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);

  const variantClasses = PREMIUM_DESIGN_TOKENS.inputVariants[variant];
  const sizeClasses = PREMIUM_DESIGN_TOKENS.sizes.input[size];

  useEffect(() => {
    setHasValue(!!value && value.toString().trim() !== '');
  }, [value]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const isFloatingLabel = label && variant !== 'underlined';
  // Pour les champs date/time, le label doit toujours flotter car le navigateur affiche toujours un format
  const isDateTimeField = ['date', 'datetime-local', 'time'].includes(type);
  const shouldFloatLabel = isFocused || hasValue || isDateTimeField;

  // Determine validation state
  const validationState = error ? 'error' : success ? 'success' : null;
  const validationClasses = validationState ? PREMIUM_DESIGN_TOKENS.validation[validationState] : null;

  // Password toggle for password inputs
  const actualType = type === 'password' && showPassword ? 'text' : type;
  const showPasswordToggle = type === 'password';

  return (
    <div className={`relative ${PREMIUM_DESIGN_TOKENS.spacing.field} ${className}`}>
      {/* Container with relative positioning for floating label */}
      <div className="relative">
        {/* Floating Label */}
        {isFloatingLabel && (
          <label
            className={`
              absolute pointer-events-none transition-all duration-200 ease-out z-20
              ${shouldFloatLabel
                ? 'left-3 -top-3 bg-gradient-to-r from-white via-white to-white px-3 text-xs font-semibold shadow-sm'
                : `top-1/2 -translate-y-1/2 ${sizeClasses.split(' ')[1]} text-sm font-medium ${icon ? 'left-12' : 'left-4'}`
              }
              ${isFocused
                ? 'text-emerald-700'
                : error
                  ? 'text-red-600'
                  : shouldFloatLabel
                    ? 'text-slate-600'
                    : 'text-slate-500'
              }
              ${disabled ? 'opacity-60' : ''}
            `}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Static Label (for underlined variant) */}
        {label && variant === 'underlined' && (
          <label className={`block ${PREMIUM_DESIGN_TOKENS.typography.label.base} mb-1.5`}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {icon && (
            <div className={`
              absolute left-0 top-0 h-full flex items-center pl-4
              ${disabled ? 'opacity-60' : ''}
              ${isFocused ? 'text-emerald-600' : 'text-slate-400'}
              ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
            `}>
              {icon}
            </div>
          )}

          {/* Input Element */}
          <input
            ref={ref}
            type={actualType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={!isFloatingLabel || isFocused ? placeholder : ''}
            disabled={disabled}
            required={required}
            min={min}
            max={max}
            step={step}
            minLength={minLength}
            maxLength={maxLength}
            autoFocus={autoFocus}
            className={`
              w-full rounded-lg
              ${sizeClasses}
              ${icon ? 'pl-11' : ''}
              ${iconRight || showPasswordToggle ? 'pr-11' : ''}
              ${variantClasses.base}
              ${variantClasses.hover}
              ${validationClasses ? validationClasses.border : variantClasses.focus}
              ${validationClasses ? validationClasses.ring : ''}
              ${variantClasses.disabled}
              ${PREMIUM_DESIGN_TOKENS.typography.placeholder}
              ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
              ${PREMIUM_DESIGN_TOKENS.shadows.soft}
              font-medium
              focus:outline-none
            `}
          />

          {/* Right Icons */}
          <div className="absolute right-0 top-0 h-full flex items-center pr-4 gap-2">
            {/* Validation Icons */}
            {error && (
              <AlertCircle className={`w-5 h-5 text-red-500 ${PREMIUM_DESIGN_TOKENS.animations.fadeIn}`} />
            )}
            {success && (
              <CheckCircle2 className={`w-5 h-5 text-green-500 ${PREMIUM_DESIGN_TOKENS.animations.fadeIn}`} />
            )}

            {/* Password Toggle */}
            {showPasswordToggle && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={disabled}
                className={`
                  text-slate-400 hover:text-slate-600 transition-colors
                  disabled:opacity-60 disabled:cursor-not-allowed
                `}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}

            {/* Custom Right Icon */}
            {iconRight && !showPasswordToggle && (
              <div className={`
                ${disabled ? 'opacity-60' : ''}
                ${isFocused ? 'text-emerald-600' : 'text-slate-400'}
                ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
              `}>
                {iconRight}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hint or Error Message */}
      {(hint || error) && (
        <div className={`flex items-start gap-1.5 ${PREMIUM_DESIGN_TOKENS.animations.slideIn}`}>
          {error && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
          <p className={error ? PREMIUM_DESIGN_TOKENS.typography.error : PREMIUM_DESIGN_TOKENS.typography.hint}>
            {error || hint}
          </p>
        </div>
      )}
    </div>
  );
});

PremiumInput.displayName = 'PremiumInput';

// ============================================================================
// PREMIUM SELECT COMPONENT (Custom Dropdown)
// ============================================================================

export const PremiumSelect: React.FC<PremiumSelectProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder,
  disabled = false,
  required = false,
  error,
  hint,
  icon,
  variant = 'outlined',
  size = 'md',
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const variantClasses = PREMIUM_DESIGN_TOKENS.inputVariants[variant];
  const sizeClasses = PREMIUM_DESIGN_TOKENS.sizes.input[size];

  useEffect(() => {
    const val = value?.toString().trim() || '';
    setHasValue(val !== '');
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isFloatingLabel = label && variant !== 'underlined';
  const shouldFloatLabel = isFocused || hasValue || isOpen;

  const validationState = error ? 'error' : null;
  const validationClasses = validationState ? PREMIUM_DESIGN_TOKENS.validation[validationState] : null;

  const selectedOption = options.find(opt => opt.value.toString() === value.toString());
  const displayText = selectedOption ? selectedOption.label : placeholder || 'Sélectionner...';

  // Filter options based on search
  const filteredOptions = searchTerm
    ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue.toString());
    setIsOpen(false);
    setIsFocused(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setIsFocused(!isOpen);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${PREMIUM_DESIGN_TOKENS.spacing.field} ${className}`}>
      <div className="relative">
        {/* Floating Label */}
        {isFloatingLabel && (
          <label
            className={`
              absolute pointer-events-none transition-all duration-200 ease-out z-20
              ${shouldFloatLabel
                ? 'left-3 -top-3 bg-gradient-to-r from-white via-white to-white px-3 text-xs font-semibold shadow-sm'
                : `top-1/2 -translate-y-1/2 ${sizeClasses.split(' ')[1]} text-sm font-medium ${icon ? 'left-12' : 'left-4'}`
              }
              ${isFocused || isOpen
                ? 'text-emerald-700'
                : error
                  ? 'text-red-600'
                  : shouldFloatLabel
                    ? 'text-slate-600'
                    : 'text-slate-500'
              }
              ${disabled ? 'opacity-60' : ''}
            `}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Static Label */}
        {label && variant === 'underlined' && (
          <label className={`block ${PREMIUM_DESIGN_TOKENS.typography.label.base} mb-1.5`}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {/* Left Icon */}
          {icon && (
            <div className={`
              absolute left-0 top-0 h-full flex items-center pl-4 z-10
              ${disabled ? 'opacity-60' : ''}
              ${isFocused || isOpen ? 'text-emerald-600' : 'text-slate-400'}
              ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
            `}>
              {icon}
            </div>
          )}

          {/* Select Button */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={disabled}
            className={`
              w-full rounded-lg text-left appearance-none cursor-pointer
              min-h-[2.875rem]
              ${sizeClasses}
              ${icon ? 'pl-11' : ''}
              pr-11
              ${variantClasses.base}
              ${variantClasses.hover}
              ${validationClasses ? validationClasses.border : isOpen ? 'border-emerald-500 ring-4 ring-emerald-500/20' : variantClasses.focus}
              ${validationClasses ? validationClasses.ring : ''}
              ${variantClasses.disabled}
              ${!hasValue ? PREMIUM_DESIGN_TOKENS.typography.placeholder : ''}
              ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
              ${PREMIUM_DESIGN_TOKENS.shadows.soft}
              font-medium
              focus:outline-none
            `}
          >
            {/* Afficher le texte seulement si le label flotte (ouvert ou a une valeur) */}
            {(!isFloatingLabel || shouldFloatLabel) && (
              <span className={hasValue ? 'text-slate-900' : 'text-slate-400'}>
                {displayText}
              </span>
            )}
          </button>

          {/* Chevron Icon */}
          <div className={`
            absolute right-0 top-0 h-full flex items-center pr-4 pointer-events-none
            ${isFocused || isOpen ? 'text-emerald-600' : 'text-slate-400'}
            ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
          `}>
            {error ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              <ChevronDown className={`w-5 h-5 ${isOpen ? 'transform rotate-180' : ''} transition-transform duration-200`} />
            )}
          </div>
        </div>

        {/* Custom Dropdown */}
        {isOpen && (
          <div className={`
            absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200
            overflow-hidden ${PREMIUM_DESIGN_TOKENS.animations.slideIn}
          `}>
            {/* Search Input (if more than 5 options) */}
            {options.length > 5 && (
              <div className="p-3 border-b border-slate-100">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400 text-center">
                  Aucun résultat
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value.toString() === value.toString();
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`
                        w-full px-4 py-3 text-left text-sm font-medium
                        transition-all duration-150
                        ${isSelected
                          ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-600'
                          : 'text-slate-700 hover:bg-slate-50 border-l-4 border-transparent'
                        }
                        flex items-center gap-3
                      `}
                    >
                      {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                      <span className="flex-1">{option.label}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hint or Error */}
      {(hint || error) && (
        <div className={`flex items-start gap-1.5 ${PREMIUM_DESIGN_TOKENS.animations.slideIn}`}>
          {error && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
          <p className={error ? PREMIUM_DESIGN_TOKENS.typography.error : PREMIUM_DESIGN_TOKENS.typography.hint}>
            {error || hint}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PREMIUM TEXTAREA COMPONENT
// ============================================================================

export const PremiumTextarea: React.FC<PremiumTextareaProps> = ({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  required = false,
  error,
  hint,
  rows = 4,
  variant = 'outlined',
  size = 'md',
  maxLength,
  autoResize = false,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const variantClasses = PREMIUM_DESIGN_TOKENS.inputVariants[variant];
  const sizeClasses = PREMIUM_DESIGN_TOKENS.sizes.input[size];

  useEffect(() => {
    setHasValue(!!value && value.toString().trim() !== '');
  }, [value]);

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value, autoResize]);

  const isFloatingLabel = label && variant !== 'underlined';
  const shouldFloatLabel = isFocused || hasValue;
  const validationState = error ? 'error' : null;
  const validationClasses = validationState ? PREMIUM_DESIGN_TOKENS.validation[validationState] : null;

  const charCount = value?.toString().length || 0;
  const showCharCount = maxLength && maxLength > 0;

  return (
    <div className={`relative ${PREMIUM_DESIGN_TOKENS.spacing.field} ${className}`}>
      <div className="relative">
        {/* Floating Label */}
        {isFloatingLabel && (
          <label
            className={`
              absolute pointer-events-none transition-all duration-200 ease-out z-20
              ${shouldFloatLabel
                ? 'left-3 -top-3 bg-gradient-to-r from-white via-white to-white px-3 text-xs font-semibold shadow-sm'
                : `left-4 top-3 text-sm font-medium`
              }
              ${isFocused
                ? 'text-emerald-700'
                : error
                  ? 'text-red-600'
                  : shouldFloatLabel
                    ? 'text-slate-600'
                    : 'text-slate-500'
              }
              ${disabled ? 'opacity-60' : ''}
            `}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Static Label */}
        {label && variant === 'underlined' && (
          <label className={`block ${PREMIUM_DESIGN_TOKENS.typography.label.base} mb-1.5`}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Textarea Element */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={!isFloatingLabel || isFocused ? placeholder : ''}
          disabled={disabled}
          required={required}
          rows={autoResize ? 1 : rows}
          maxLength={maxLength}
          className={`
            w-full rounded-lg resize-none
            ${sizeClasses}
            ${variantClasses.base}
            ${variantClasses.hover}
            ${validationClasses ? validationClasses.border : variantClasses.focus}
            ${validationClasses ? validationClasses.ring : ''}
            ${variantClasses.disabled}
            ${PREMIUM_DESIGN_TOKENS.typography.placeholder}
            ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
            ${PREMIUM_DESIGN_TOKENS.shadows.soft}
            font-medium
            focus:outline-none
          `}
        />

        {/* Character Count */}
        {showCharCount && (
          <div className="absolute bottom-2 right-4 text-xs text-slate-400 pointer-events-none">
            <span className={charCount > maxLength ? 'text-red-500 font-medium' : ''}>
              {charCount}
            </span>
            <span className="text-slate-300 mx-0.5">/</span>
            <span>{maxLength}</span>
          </div>
        )}
      </div>

      {/* Hint or Error */}
      {(hint || error) && (
        <div className={`flex items-start gap-1.5 ${PREMIUM_DESIGN_TOKENS.animations.slideIn}`}>
          {error && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
          <p className={error ? PREMIUM_DESIGN_TOKENS.typography.error : PREMIUM_DESIGN_TOKENS.typography.hint}>
            {error || hint}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PREMIUM BUTTON COMPONENT
// ============================================================================

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  className = '',
}) => {
  const variantClasses = PREMIUM_DESIGN_TOKENS.buttonVariants[variant];
  const sizeClasses = PREMIUM_DESIGN_TOKENS.sizes.button[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${fullWidth ? 'w-full' : ''}
        ${sizeClasses}
        ${variantClasses.base}
        ${variantClasses.hover}
        ${variantClasses.active}
        ${variantClasses.focus}
        ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
        ${PREMIUM_DESIGN_TOKENS.shadows.soft}
        rounded-lg font-semibold
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none
        ${className}
      `}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Chargement...</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
          {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
        </>
      )}
    </button>
  );
};

// ============================================================================
// PREMIUM SEARCHABLE SELECT COMPONENT (avec recherche intégrée)
// ============================================================================

export const PremiumSearchableSelect: React.FC<PremiumSearchableSelectProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder = 'Sélectionner...',
  disabled = false,
  required = false,
  error,
  hint,
  icon,
  variant = 'outlined',
  size = 'md',
  searchPlaceholder = 'Rechercher...',
  emptyMessage = 'Aucun résultat trouvé',
  footerAction,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find(opt => opt.value === value);
  const hasValue = value !== null && value !== undefined && value !== '';

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const isFloatingLabel = label && variant !== 'underlined';
  const shouldFloatLabel = isFocused || hasValue || isOpen;

  // Variant styles
  const variantClasses = {
    base: variant === 'outlined'
      ? 'bg-white border-slate-200'
      : variant === 'filled'
        ? 'bg-slate-50 border-slate-200'
        : variant === 'underlined'
          ? 'bg-transparent border-b-2 border-slate-300 rounded-none px-0'
          : 'bg-white border-slate-200',
    hover: !disabled ? 'hover:border-slate-300' : '',
    focus: 'focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/20',
    disabled: disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer',
  };

  const sizeClasses = size === 'sm' ? 'text-sm py-2 px-3' : size === 'lg' ? 'text-base py-4 px-4' : 'text-sm py-3 px-4';

  const validationClasses = error
    ? { border: 'border-red-500', ring: 'ring-4 ring-red-500/20' }
    : undefined;

  return (
    <div className={`relative ${className}`}>
      {/* Main Button */}
      <div className="relative">
        {/* Left Icon */}
        {icon && (
          <div className={`
            absolute left-0 top-0 h-full flex items-center pl-4 z-10
            ${disabled ? 'opacity-60' : ''}
            ${isFocused || isOpen ? 'text-emerald-600' : 'text-slate-400'}
            ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
          `}>
            {icon}
          </div>
        )}

        {/* Floating Label */}
        {isFloatingLabel && (
          <label
            className={`
              absolute pointer-events-none transition-all duration-200 ease-out z-20
              ${shouldFloatLabel
                ? `left-3 -top-3 bg-gradient-to-r from-white via-white to-white px-3 text-xs font-semibold shadow-sm`
                : `left-${icon ? '11' : '4'} top-3 text-sm font-medium`
              }
              ${isFocused || isOpen
                ? 'text-emerald-700'
                : error
                  ? 'text-red-600'
                  : shouldFloatLabel
                    ? 'text-slate-600'
                    : 'text-slate-500'
              }
              ${disabled ? 'opacity-60' : ''}
            `}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={`
            w-full rounded-lg text-left appearance-none
            min-h-[2.875rem]
            ${sizeClasses}
            ${icon ? 'pl-11' : ''}
            pr-11
            ${variantClasses.base}
            ${variantClasses.hover}
            ${validationClasses ? validationClasses.border : isOpen ? 'border-emerald-500 ring-4 ring-emerald-500/20' : variantClasses.focus}
            ${validationClasses ? validationClasses.ring : ''}
            ${variantClasses.disabled}
            ${!hasValue ? PREMIUM_DESIGN_TOKENS.typography.placeholder : ''}
            ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
            ${PREMIUM_DESIGN_TOKENS.shadows.soft}
            font-medium
            focus:outline-none
          `}
        >
          {/* Afficher le texte seulement si focus/open OU si une valeur est sélectionnée */}
          {(isFocused || isOpen || hasValue) && (
            <span className={hasValue ? 'text-slate-900' : 'text-slate-400'}>
              {selectedOption?.label || placeholder}
            </span>
          )}
        </button>

        {/* Chevron Icon */}
        <div className="absolute right-0 top-0 h-full flex items-center pr-4 pointer-events-none">
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-30 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search */}
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex-1 overflow-y-auto">
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 text-sm text-slate-700 hover:text-emerald-700 transition-colors font-medium"
              >
                {option.label}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-4 py-8 text-sm text-slate-400 text-center italic">
                {emptyMessage}
              </div>
            )}
          </div>

          {/* Footer Action */}
          {footerAction && (
            <div className="border-t border-slate-200 p-2 bg-slate-50">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  footerAction.onClick();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 hover:shadow-sm"
              >
                {footerAction.icon}
                {footerAction.label}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hint or Error */}
      {(hint || error) && (
        <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${error ? 'text-red-600' : 'text-slate-500'}`}>
          {error && <AlertCircle className="w-3.5 h-3.5" />}
          <span>{error || hint}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PREMIUM MULTI SELECT COMPONENT (sélection multiple avec chips)
// ============================================================================

export const PremiumMultiSelect: React.FC<PremiumMultiSelectProps> = ({
  values,
  onChange,
  options,
  label,
  placeholder = 'Sélectionner...',
  disabled = false,
  required = false,
  error,
  hint,
  icon,
  variant = 'outlined',
  size = 'md',
  searchPlaceholder = 'Rechercher...',
  emptyMessage = 'Aucun résultat trouvé',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Ensure values is always an array
  const safeValues = values || [];
  const selectedOptions = options.filter(opt => safeValues.includes(opt.value));
  const hasValue = safeValues.length > 0;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const toggleOption = (optionValue: string | number) => {
    if (safeValues.includes(optionValue)) {
      onChange(safeValues.filter(v => v !== optionValue));
    } else {
      onChange([...safeValues, optionValue]);
    }
  };

  const removeOption = (optionValue: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(safeValues.filter(v => v !== optionValue));
  };

  const isFloatingLabel = label && variant !== 'underlined';
  const shouldFloatLabel = isFocused || hasValue || isOpen;

  // Variant styles
  const variantClasses = {
    base: variant === 'outlined'
      ? 'bg-white border-slate-200'
      : variant === 'filled'
        ? 'bg-slate-50 border-slate-200'
        : variant === 'underlined'
          ? 'bg-transparent border-b-2 border-slate-300 rounded-none px-0'
          : 'bg-white border-slate-200',
    hover: !disabled ? 'hover:border-slate-300' : '',
    focus: 'focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/20',
    disabled: disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer',
  };

  const sizeClasses = size === 'sm' ? 'text-sm py-2 px-3' : size === 'lg' ? 'text-base py-4 px-4' : 'text-sm py-3 px-4';

  const validationClasses = error
    ? { border: 'border-red-500', ring: 'ring-4 ring-red-500/20' }
    : undefined;

  return (
    <div className={`relative ${className}`}>
      {/* Main Button */}
      <div className="relative">
        {/* Left Icon */}
        {icon && (
          <div className={`
            absolute left-0 top-0 h-full flex items-center pl-4 z-10
            ${disabled ? 'opacity-60' : ''}
            ${isFocused || isOpen ? 'text-emerald-600' : 'text-slate-400'}
            ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
          `}>
            {icon}
          </div>
        )}

        {/* Floating Label */}
        {isFloatingLabel && (
          <label
            className={`
              absolute pointer-events-none transition-all duration-200 ease-out z-20
              ${shouldFloatLabel
                ? `left-3 -top-3 bg-gradient-to-r from-white via-white to-white px-3 text-xs font-semibold shadow-sm`
                : `left-${icon ? '11' : '4'} top-3 text-sm font-medium`
              }
              ${isFocused || isOpen
                ? 'text-emerald-700'
                : error
                  ? 'text-red-600'
                  : shouldFloatLabel
                    ? 'text-slate-600'
                    : 'text-slate-500'
              }
              ${disabled ? 'opacity-60' : ''}
            `}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={`
            w-full rounded-lg text-left appearance-none
            min-h-[3.25rem]
            ${sizeClasses}
            ${icon ? 'pl-11' : ''}
            pr-11
            ${variantClasses.base}
            ${variantClasses.hover}
            ${validationClasses ? validationClasses.border : isOpen ? 'border-emerald-500 ring-4 ring-emerald-500/20' : variantClasses.focus}
            ${validationClasses ? validationClasses.ring : ''}
            ${variantClasses.disabled}
            ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
            ${PREMIUM_DESIGN_TOKENS.shadows.soft}
            font-medium
            focus:outline-none
          `}
        >
          {/* Chips */}
          <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
            {selectedOptions.length > 0 ? (
              selectedOptions.map(opt => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium border border-emerald-200"
                >
                  {opt.label}
                  <span
                    onClick={(e) => removeOption(opt.value, e)}
                    className="hover:text-red-600 cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </span>
              ))
            ) : (
              /* Afficher le placeholder seulement si focus/open */
              (isFocused || isOpen) && <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
        </button>

        {/* Chevron Icon */}
        <div className="absolute right-0 top-0 h-full flex items-center pr-4 pointer-events-none">
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-30 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search */}
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex-1 overflow-y-auto">
            {filteredOptions.map((option) => {
              const isSelected = safeValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleOption(option.value)}
                  className={`
                    w-full px-4 py-2.5 text-left text-sm flex items-center justify-between
                    transition-colors font-medium
                    ${isSelected
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-700'
                    }
                  `}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <span className="text-emerald-600 text-base">✓</span>
                  )}
                </button>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className="px-4 py-8 text-sm text-slate-400 text-center italic">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hint or Error */}
      {(hint || error) && (
        <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${error ? 'text-red-600' : 'text-slate-500'}`}>
          {error && <AlertCircle className="w-3.5 h-3.5" />}
          <span>{error || hint}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================

export default {
  Input: PremiumInput,
  Select: PremiumSelect,
  Textarea: PremiumTextarea,
  Button: PremiumButton,
  SearchableSelect: PremiumSearchableSelect,
  MultiSelect: PremiumMultiSelect,
};
