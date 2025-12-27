/**
 * Design Tokens for Modal Components
 *
 * Centralized design system extracted from QuickTaskCreator.tsx
 * to ensure consistency across all modals in the GreenSIG application.
 *
 * @module designTokens
 */

export const MODAL_DESIGN_TOKENS = {
  /**
   * Color palette and gradients
   */
  colors: {
    primary: 'emerald-600',
    primaryHover: 'emerald-700',
    primaryRing: 'emerald-500',
    secondary: 'gray-700',

    gradients: {
      /** Header gradient (emerald to teal) */
      header: 'bg-gradient-to-r from-emerald-50 to-teal-50',
      /** Card/section gradient */
      card: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      /** Sidebar gradient */
      sidebar: 'bg-gradient-to-br from-gray-50 to-gray-100',
      /** Date/time section gradient */
      dateSection: 'bg-gradient-to-br from-emerald-50 to-teal-50',
    },

    borders: {
      default: 'border-gray-200',
      active: 'border-emerald-500',
      hover: 'hover:border-emerald-500',
      emerald: 'border-emerald-100',
      emerald200: 'border-emerald-200',
    },

    backgrounds: {
      emerald50: 'bg-emerald-50',
      emerald100: 'bg-emerald-100',
      gray50: 'bg-gray-50',
      gray100: 'bg-gray-100',
      white: 'bg-white',
    },

    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-500',
      tertiary: 'text-gray-400',
      emerald: 'text-emerald-600',
      emeraldDark: 'text-emerald-700',
      emeraldLight: 'text-emerald-900',
    },
  },

  /**
   * Animation classes
   */
  animations: {
    /** Basic fade in */
    fadeIn: 'animate-in fade-in duration-200',
    /** Modal entry with zoom effect (QuickTaskCreator style) */
    modalZoom: 'animate-in zoom-in-95 fade-in duration-200',
    /** Slide in from right (for step transitions) */
    slideRight: 'animate-in slide-in-from-right-4 duration-300',
    /** Slide in from bottom */
    slideBottom: 'animate-in slide-in-from-bottom-8 fade-in duration-300',
    /** Backdrop fade */
    backdropFade: 'animate-in fade-in duration-200',
  },

  /**
   * Spacing and layout
   */
  spacing: {
    /** Header padding */
    headerPadding: 'px-6 py-3',
    /** Body/content padding */
    bodyPadding: 'p-6',
    /** Footer padding */
    footerPadding: 'px-8 py-5',
    /** Sidebar width */
    sidebarWidth: 'w-80',
    /** Section spacing (vertical) */
    sectionSpacing: 'space-y-6',
    /** Item gaps */
    gap2: 'gap-2',
    gap3: 'gap-3',
    gap4: 'gap-4',
  },

  /**
   * Button styles
   */
  buttons: {
    /** Primary button (emerald) */
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed',
    /** Secondary button (white/gray) */
    secondary: 'bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
    /** Danger button (red) */
    danger: 'bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed',
    /** Button padding */
    padding: 'px-6 py-3',
    /** Button padding compact */
    paddingCompact: 'px-4 py-2',
  },

  /**
   * Input field styles
   */
  inputs: {
    /** Base input style */
    base: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all',
    /** Search input (with icon padding) */
    search: 'w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm placeholder:text-gray-400',
    /** Textarea */
    textarea: 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none',
    /** Select/dropdown */
    select: 'px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-gray-700',
  },

  /**
   * Card/section styles
   */
  cards: {
    /** Selection card (unselected) */
    selectionDefault: 'group relative p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-lg transition-all text-left cursor-pointer',
    /** Selection card (selected) */
    selectionActive: 'relative p-6 bg-emerald-50 border-2 border-emerald-500 rounded-xl shadow-lg text-left',
    /** Info box */
    infoBox: 'flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700',
    /** Warning box */
    warningBox: 'flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700',
    /** Error box */
    errorBox: 'flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700',
    /** Success box */
    successBox: 'flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-700',
  },

  /**
   * Typography
   */
  typography: {
    /** Modal title */
    modalTitle: 'text-xl font-bold text-gray-900',
    /** Section heading */
    sectionHeading: 'text-xl font-semibold text-gray-900',
    /** Form label */
    formLabel: 'text-sm font-medium text-gray-700',
    /** Label uppercase (small) */
    labelCaps: 'text-xs font-medium text-gray-500 uppercase tracking-wide',
    /** Body text */
    bodyText: 'text-sm text-gray-900',
    /** Secondary text */
    secondaryText: 'text-sm text-gray-500',
    /** Tertiary text (smallest) */
    tertiaryText: 'text-xs text-gray-400',
    /** Badge text */
    badgeText: 'text-xs font-medium',
  },

  /**
   * Badge/pill styles
   */
  badges: {
    /** Emerald badge */
    emerald: 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700',
    /** Gray badge */
    gray: 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700',
    /** Blue badge */
    blue: 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700',
    /** Selected count badge */
    selectedCount: 'bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5',
  },

  /**
   * Step indicator styles
   */
  stepIndicator: {
    /** Completed step */
    completed: 'bg-emerald-600 text-white shadow-md shadow-emerald-200',
    /** Current step */
    current: 'bg-white text-emerald-600 shadow-md ring-3 ring-emerald-100',
    /** Upcoming step */
    upcoming: 'bg-gray-200 text-gray-400',
    /** Connector line (completed) */
    connectorCompleted: 'bg-emerald-600',
    /** Connector line (upcoming) */
    connectorUpcoming: 'bg-gray-200',
    /** Container gradient */
    containerGradient: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100',
  },

  /**
   * Empty state styles
   */
  emptyState: {
    container: 'text-center py-12 text-gray-500',
    icon: 'w-12 h-12 mx-auto mb-3 text-gray-300',
    title: 'font-medium mb-1',
    description: 'text-sm text-gray-400',
  },

  /**
   * Border radius
   */
  borderRadius: {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    full: 'rounded-full',
  },

  /**
   * Shadow styles
   */
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
    emerald: 'shadow-lg shadow-emerald-200',
    red: 'shadow-lg shadow-red-200',
  },
} as const;

/**
 * Helper function to combine token classes
 */
export const combineTokens = (...tokens: string[]): string => {
  return tokens.filter(Boolean).join(' ');
};

/**
 * Type-safe token accessor
 */
export type ModalDesignTokens = typeof MODAL_DESIGN_TOKENS;
