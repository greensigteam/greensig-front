/**
 * Premium Design Tokens - Niveau 3
 * Système de design avancé avec animations, glassmorphism, et variantes multiples
 */

export const PREMIUM_DESIGN_TOKENS = {
  // ============================================================================
  // ANIMATIONS
  // ============================================================================
  animations: {
    // Spring animations (smooth, natural)
    spring: {
      fast: 'transition-all duration-200 ease-out',
      medium: 'transition-all duration-300 ease-out',
      slow: 'transition-all duration-500 ease-out',
    },
    // Bounce effect
    bounce: 'transition-all duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]',
    // Smooth ease
    smooth: 'transition-all duration-300 ease-in-out',
    // Scale animations
    scaleUp: 'transform transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]',
    scaleUpSm: 'transform transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]',
    // Slide animations
    slideIn: 'animate-in slide-in-from-top-2 fade-in duration-300',
    slideInBottom: 'animate-in slide-in-from-bottom-2 fade-in duration-300',
    // Fade animations
    fadeIn: 'animate-in fade-in duration-200',
    fadeInSlow: 'animate-in fade-in duration-500',
  },

  // ============================================================================
  // GLASSMORPHISM
  // ============================================================================
  glass: {
    // Subtle glass effect
    subtle: 'bg-white/60 backdrop-blur-sm',
    // Medium glass effect
    medium: 'bg-white/70 backdrop-blur-md',
    // Strong glass effect
    strong: 'bg-white/80 backdrop-blur-lg',
    // Dark glass
    dark: 'bg-slate-900/60 backdrop-blur-md',
  },

  // ============================================================================
  // SHADOWS
  // ============================================================================
  shadows: {
    // Soft shadows
    soft: 'shadow-sm',
    // Medium shadows
    medium: 'shadow-md',
    // Strong shadows
    strong: 'shadow-lg',
    // Inner shadows
    inner: 'shadow-inner',
    // Colored shadows (emerald)
    emerald: 'shadow-lg shadow-emerald-500/20',
    emeraldStrong: 'shadow-xl shadow-emerald-500/30',
    // Colored shadows (blue)
    blue: 'shadow-lg shadow-blue-500/20',
    // Glow effect
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    glowStrong: 'shadow-[0_0_25px_rgba(16,185,129,0.4)]',
  },

  // ============================================================================
  // BORDERS
  // ============================================================================
  borders: {
    // Standard borders
    default: 'border border-slate-300',
    subtle: 'border border-slate-200',
    strong: 'border-2 border-slate-300',
    // Colored borders
    emerald: 'border border-emerald-500',
    emeraldStrong: 'border-2 border-emerald-500',
    blue: 'border border-blue-500',
    red: 'border border-red-500',
    // Gradient borders (requires special handling)
    gradientEmerald: 'border-2 border-transparent bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-padding',
  },

  // ============================================================================
  // BACKGROUNDS
  // ============================================================================
  backgrounds: {
    // Standard backgrounds
    white: 'bg-white',
    slate50: 'bg-slate-50',
    slate100: 'bg-slate-100',
    // Colored backgrounds
    emerald50: 'bg-emerald-50',
    emerald100: 'bg-emerald-100',
    emerald500: 'bg-emerald-500',
    blue50: 'bg-blue-50',
    blue100: 'bg-blue-100',
    red50: 'bg-red-50',
    red100: 'bg-red-100',
    // Gradient backgrounds
    gradientEmerald: 'bg-gradient-to-r from-emerald-50 to-teal-50',
    gradientEmeraldStrong: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    gradientBlue: 'bg-gradient-to-r from-blue-50 to-cyan-50',
    // Mesh gradients (modern effect)
    meshEmerald: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50',
  },

  // ============================================================================
  // FOCUS STATES
  // ============================================================================
  focus: {
    // Ring styles
    ring: 'focus:ring-2 focus:ring-offset-0 focus:outline-none',
    ringEmerald: 'focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-0 focus:outline-none',
    ringEmeraldStrong: 'focus:ring-4 focus:ring-emerald-500/30 focus:ring-offset-0 focus:outline-none',
    ringBlue: 'focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-0 focus:outline-none',
    // Border focus
    borderEmerald: 'focus:border-emerald-500',
    borderBlue: 'focus:border-blue-500',
    // Background focus
    bgEmerald: 'focus:bg-emerald-50/50',
    bgBlue: 'focus:bg-blue-50/50',
  },

  // ============================================================================
  // HOVER STATES
  // ============================================================================
  hover: {
    // Background hover
    bgSlate: 'hover:bg-slate-50',
    bgEmerald: 'hover:bg-emerald-50',
    bgBlue: 'hover:bg-blue-50',
    // Border hover
    borderSlate: 'hover:border-slate-400',
    borderEmerald: 'hover:border-emerald-500',
    // Shadow hover
    shadowMd: 'hover:shadow-md',
    shadowLg: 'hover:shadow-lg',
    // Scale hover (with transform)
    scale: 'hover:scale-[1.02]',
    scaleSm: 'hover:scale-[1.01]',
  },

  // ============================================================================
  // INPUT VARIANTS
  // ============================================================================
  inputVariants: {
    outlined: {
      base: 'border-2 border-slate-300 bg-white',
      focus: 'focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20',
      hover: 'hover:border-slate-400',
      disabled: 'disabled:bg-slate-50 disabled:border-slate-200',
    },
    filled: {
      base: 'border-0 bg-slate-100',
      focus: 'focus:bg-slate-50 focus:ring-2 focus:ring-emerald-500/40',
      hover: 'hover:bg-slate-50',
      disabled: 'disabled:bg-slate-50 disabled:opacity-60',
    },
    underlined: {
      base: 'border-0 border-b-2 border-slate-300 bg-transparent rounded-none px-0',
      focus: 'focus:border-emerald-500',
      hover: 'hover:border-slate-400',
      disabled: 'disabled:border-slate-200',
    },
    glass: {
      base: 'border border-white/20 bg-white/60 backdrop-blur-md',
      focus: 'focus:bg-white/80 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20',
      hover: 'hover:bg-white/70 hover:border-white/30',
      disabled: 'disabled:bg-white/40 disabled:opacity-60',
    },
  },

  // ============================================================================
  // BUTTON VARIANTS
  // ============================================================================
  buttonVariants: {
    primary: {
      base: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
      hover: 'hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30',
      active: 'active:scale-[0.98]',
      focus: 'focus:ring-4 focus:ring-emerald-500/30',
    },
    secondary: {
      base: 'bg-white border-2 border-slate-300 text-slate-700',
      hover: 'hover:bg-slate-50 hover:border-slate-400 hover:shadow-md',
      active: 'active:scale-[0.98]',
      focus: 'focus:ring-4 focus:ring-slate-500/20',
    },
    ghost: {
      base: 'bg-transparent text-slate-700',
      hover: 'hover:bg-slate-100',
      active: 'active:scale-[0.98]',
      focus: 'focus:ring-2 focus:ring-slate-500/20',
    },
    glass: {
      base: 'bg-white/60 backdrop-blur-md border border-white/20 text-slate-700',
      hover: 'hover:bg-white/80 hover:shadow-lg',
      active: 'active:scale-[0.98]',
      focus: 'focus:ring-4 focus:ring-emerald-500/20',
    },
  },

  // ============================================================================
  // SIZES
  // ============================================================================
  sizes: {
    input: {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-sm',
      lg: 'px-4 py-3.5 text-base',
      xl: 'px-5 py-4 text-base',
    },
    button: {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg',
    },
  },

  // ============================================================================
  // SPACING
  // ============================================================================
  spacing: {
    field: 'space-y-2',
    section: 'space-y-6',
    grid: 'gap-4',
  },

  // ============================================================================
  // TYPOGRAPHY
  // ============================================================================
  typography: {
    label: {
      base: 'text-sm font-medium text-slate-700',
      floating: 'text-xs font-medium text-slate-500 transition-all duration-200',
      floatingActive: 'text-xs font-medium text-emerald-600',
    },
    hint: 'text-xs text-slate-500',
    error: 'text-xs text-red-600 font-medium',
    placeholder: 'placeholder:text-slate-400',
  },

  // ============================================================================
  // VALIDATION STATES
  // ============================================================================
  validation: {
    error: {
      border: 'border-red-500',
      ring: 'focus:ring-red-500/40',
      bg: 'focus:bg-red-50/50',
      text: 'text-red-600',
    },
    success: {
      border: 'border-green-500',
      ring: 'focus:ring-green-500/40',
      bg: 'focus:bg-green-50/50',
      text: 'text-green-600',
    },
    warning: {
      border: 'border-amber-500',
      ring: 'focus:ring-amber-500/40',
      bg: 'focus:bg-amber-50/50',
      text: 'text-amber-600',
    },
  },

  // ============================================================================
  // DARK MODE (prepared for future)
  // ============================================================================
  dark: {
    bg: 'dark:bg-slate-800',
    text: 'dark:text-slate-100',
    border: 'dark:border-slate-600',
    placeholder: 'dark:placeholder:text-slate-500',
  },
} as const;

export type InputVariant = keyof typeof PREMIUM_DESIGN_TOKENS.inputVariants;
export type ButtonVariant = keyof typeof PREMIUM_DESIGN_TOKENS.buttonVariants;
export type InputSize = keyof typeof PREMIUM_DESIGN_TOKENS.sizes.input;
