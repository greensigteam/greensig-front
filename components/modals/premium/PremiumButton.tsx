import React from 'react';
import { PREMIUM_DESIGN_TOKENS } from '../premiumDesignTokens';
import type { PremiumButtonProps } from './types';

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
