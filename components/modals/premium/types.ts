import React from 'react';
import type { InputVariant, InputSize } from '../premiumDesignTokens';

export interface PremiumInputProps {
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'tel'
    | 'url'
    | 'date'
    | 'datetime-local'
    | 'time';
  value: string | number | undefined;
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
  value: string | number | undefined;
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
  icon?: React.ReactNode;
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
