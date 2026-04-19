import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { PREMIUM_DESIGN_TOKENS } from '../premiumDesignTokens';
import type { PremiumSelectProps } from './types';

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
  const validationClasses = validationState
    ? PREMIUM_DESIGN_TOKENS.validation[validationState]
    : null;

  const selectedOption = options.find((opt) => opt.value.toString() === (value ?? '').toString());
  const displayText = selectedOption ? selectedOption.label : placeholder || 'Sélectionner...';

  const filteredOptions = searchTerm
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
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
    <div
      ref={dropdownRef}
      className={`relative ${PREMIUM_DESIGN_TOKENS.spacing.field} ${className}`}
    >
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
                isFocused || isOpen
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
              absolute left-0 top-0 h-full flex items-center pl-4 z-10
              ${disabled ? 'opacity-60' : ''}
              ${isFocused || isOpen ? 'text-emerald-600' : 'text-slate-400'}
              ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
            `}
            >
              {icon}
            </div>
          )}

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
            {(!isFloatingLabel || shouldFloatLabel) && (
              <span className={hasValue ? 'text-slate-900' : 'text-slate-400'}>{displayText}</span>
            )}
          </button>

          <div
            className={`
            absolute right-0 top-0 h-full flex items-center pr-4 pointer-events-none
            ${isFocused || isOpen ? 'text-emerald-600' : 'text-slate-400'}
            ${PREMIUM_DESIGN_TOKENS.animations.spring.fast}
          `}
          >
            {error ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              <ChevronDown
                className={`w-5 h-5 ${isOpen ? 'transform rotate-180' : ''} transition-transform duration-200`}
              />
            )}
          </div>
        </div>

        {isOpen && (
          <div
            className={`
            absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200
            overflow-hidden ${PREMIUM_DESIGN_TOKENS.animations.slideIn}
          `}
          >
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

            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400 text-center">Aucun résultat</div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value.toString() === (value ?? '').toString();
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`
                        w-full px-4 py-3 text-left text-sm font-medium
                        transition-all duration-150
                        ${
                          isSelected
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
