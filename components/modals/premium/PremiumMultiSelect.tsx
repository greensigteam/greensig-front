import React, { useState, useMemo } from 'react';
import { AlertCircle, ChevronDown, X, Search } from 'lucide-react';
import { PREMIUM_DESIGN_TOKENS } from '../premiumDesignTokens';
import type { PremiumMultiSelectProps } from './types';

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
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const safeValues = values || [];
  const selectedOptions = options.filter((opt) => safeValues.includes(opt.value));
  const hasValue = safeValues.length > 0;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const toggleOption = (optionValue: string | number) => {
    if (safeValues.includes(optionValue)) {
      onChange(safeValues.filter((v) => v !== optionValue));
    } else {
      onChange([...safeValues, optionValue]);
    }
  };

  const removeOption = (optionValue: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(safeValues.filter((v) => v !== optionValue));
  };

  const isFloatingLabel = label && variant !== 'underlined';
  const shouldFloatLabel = isFocused || hasValue || isOpen;

  const variantClasses = {
    base:
      variant === 'outlined'
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

  const sizeClasses =
    size === 'sm'
      ? 'text-sm py-2 px-3'
      : size === 'lg'
        ? 'text-base py-4 px-4'
        : 'text-sm py-3 px-4';

  const validationClasses = error
    ? { border: 'border-red-500', ring: 'ring-4 ring-red-500/20' }
    : undefined;

  return (
    <div className={`relative ${className}`}>
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

        {isFloatingLabel && (
          <label
            className={`
              absolute pointer-events-none transition-all duration-200 ease-out z-20
              ${
                shouldFloatLabel
                  ? `left-3 -top-3 bg-gradient-to-r from-white via-white to-white px-3 text-xs font-semibold shadow-sm`
                  : `left-${icon ? '11' : '4'} top-3 text-sm font-medium`
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
          <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
            {selectedOptions.length > 0
              ? selectedOptions.map((opt) => (
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
              : (isFocused || isOpen) && <span className="text-slate-400">{placeholder}</span>}
          </div>
        </button>

        <div className="absolute right-0 top-0 h-full flex items-center pr-4 pointer-events-none">
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-30 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
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
                    ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-700'
                    }
                  `}
                >
                  <span>{option.label}</span>
                  {isSelected && <span className="text-emerald-600 text-base">✓</span>}
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

      {(hint || error) && (
        <div
          className={`flex items-center gap-1.5 mt-1.5 text-xs ${error ? 'text-red-600' : 'text-slate-500'}`}
        >
          {error && <AlertCircle className="w-3.5 h-3.5" />}
          <span>{error || hint}</span>
        </div>
      )}
    </div>
  );
};
