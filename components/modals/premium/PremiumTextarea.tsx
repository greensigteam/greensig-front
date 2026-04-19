import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { PREMIUM_DESIGN_TOKENS } from '../premiumDesignTokens';
import type { PremiumTextareaProps } from './types';

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
  const validationClasses = validationState
    ? PREMIUM_DESIGN_TOKENS.validation[validationState]
    : null;

  const charCount = value?.toString().length || 0;
  const showCharCount = maxLength && maxLength > 0;

  return (
    <div className={`relative ${PREMIUM_DESIGN_TOKENS.spacing.field} ${className}`}>
      <div className="relative">
        {isFloatingLabel && (
          <label
            className={`
              absolute pointer-events-none transition-all duration-200 ease-out z-20
              ${
                shouldFloatLabel
                  ? 'left-3 -top-3 bg-gradient-to-r from-white via-white to-white px-3 text-xs font-semibold shadow-sm'
                  : `left-4 top-3 text-sm font-medium`
              }
              ${
                isFocused
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

        {label && variant === 'underlined' && (
          <label className={`block ${PREMIUM_DESIGN_TOKENS.typography.label.base} mb-1.5`}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

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

      {(hint || error) && (
        <div className={`flex items-start gap-1.5 ${PREMIUM_DESIGN_TOKENS.animations.slideIn}`}>
          {error && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
          <p
            className={
              error ? PREMIUM_DESIGN_TOKENS.typography.error : PREMIUM_DESIGN_TOKENS.typography.hint
            }
          >
            {error || hint}
          </p>
        </div>
      )}
    </div>
  );
};
