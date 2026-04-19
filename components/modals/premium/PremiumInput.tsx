import { useState, useEffect, forwardRef } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { PREMIUM_DESIGN_TOKENS } from '../premiumDesignTokens';
import type { PremiumInputProps } from './types';

export const PremiumInput = forwardRef<HTMLInputElement, PremiumInputProps>(
  (
    {
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
    },
    ref,
  ) => {
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
    const isDateTimeField = ['date', 'datetime-local', 'time'].includes(type);
    const shouldFloatLabel = isFocused || hasValue || isDateTimeField;

    const validationState = error ? 'error' : success ? 'success' : null;
    const validationClasses = validationState
      ? PREMIUM_DESIGN_TOKENS.validation[validationState]
      : null;

    const actualType = type === 'password' && showPassword ? 'text' : type;
    const showPasswordToggle = type === 'password';

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
                  : `top-1/2 -translate-y-1/2 ${sizeClasses.split(' ')[1]} text-sm font-medium ${icon ? 'left-12' : 'left-4'}`
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

          <div className="relative">
            {icon && (
              <div
                className={`
              absolute left-0 top-0 h-full flex items-center pl-4
              ${disabled ? 'opacity-60' : ''}
              ${isFocused ? 'text-emerald-600' : 'text-slate-400'}
              ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
            `}
              >
                {icon}
              </div>
            )}

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

            <div className="absolute right-0 top-0 h-full flex items-center pr-4 gap-2">
              {error && (
                <AlertCircle
                  className={`w-5 h-5 text-red-500 ${PREMIUM_DESIGN_TOKENS.animations.fadeIn}`}
                />
              )}
              {success && (
                <CheckCircle2
                  className={`w-5 h-5 text-green-500 ${PREMIUM_DESIGN_TOKENS.animations.fadeIn}`}
                />
              )}

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

              {iconRight && !showPasswordToggle && (
                <div
                  className={`
                ${disabled ? 'opacity-60' : ''}
                ${isFocused ? 'text-emerald-600' : 'text-slate-400'}
                ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
              `}
                >
                  {iconRight}
                </div>
              )}
            </div>
          </div>
        </div>

        {(hint || error) && (
          <div className={`flex items-start gap-1.5 ${PREMIUM_DESIGN_TOKENS.animations.slideIn}`}>
            {error && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
            <p
              className={
                error
                  ? PREMIUM_DESIGN_TOKENS.typography.error
                  : PREMIUM_DESIGN_TOKENS.typography.hint
              }
            >
              {error || hint}
            </p>
          </div>
        )}
      </div>
    );
  },
);

PremiumInput.displayName = 'PremiumInput';
