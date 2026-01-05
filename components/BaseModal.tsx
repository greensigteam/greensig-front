import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MODAL_DESIGN_TOKENS } from './modals/designTokens';

// ============================================================================
// TYPES
// ============================================================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface BaseModalProps {
  /** Contrôle la visibilité de la modale */
  isOpen: boolean;

  /** Callback appelé lors de la fermeture */
  onClose: () => void;

  /** Taille de la modale */
  size?: ModalSize;

  /** Permet la fermeture en cliquant sur le backdrop */
  closeOnOutsideClick?: boolean;

  /** Permet la fermeture avec la touche ESC */
  closeOnEscape?: boolean;

  /** Affiche le bouton X de fermeture dans le header */
  showCloseButton?: boolean;

  /** Contenu de la modale */
  children: React.ReactNode;

  /** Classes CSS additionnelles pour le conteneur de la modale */
  className?: string;

  /** Classes CSS additionnelles pour le backdrop */
  backdropClassName?: string;

  /** Z-index de la modale */
  zIndex?: number;

  /** Variant d'animation d'entrée */
  animationVariant?: 'fade' | 'zoom' | 'slide';
}

// ============================================================================
// SIZE MAPPINGS
// ============================================================================

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full mx-4',
};

// ============================================================================
// ANIMATION MAPPINGS
// ============================================================================

const ANIMATION_CLASSES: Record<'fade' | 'zoom' | 'slide', string> = {
  fade: MODAL_DESIGN_TOKENS.animations.fadeIn,
  zoom: MODAL_DESIGN_TOKENS.animations.modalZoom, // QuickTaskCreator style
  slide: MODAL_DESIGN_TOKENS.animations.slideBottom,
};

// ============================================================================
// COMPONENT
// ============================================================================

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  size = 'md',
  closeOnOutsideClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  children,
  className = '',
  backdropClassName = '',
  zIndex = 2000, // Augmenté pour être sûr d'être au-dessus de tout (cartes, headers, etc.)
  animationVariant = 'zoom',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // ============================================================================
  // SCROLL LOCK
  // ============================================================================

  useEffect(() => {
    if (isOpen) {
      // Sauvegarder l'élément actuellement focusé
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Bloquer le scroll du body
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        // Restaurer le scroll
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        // Restaurer le focus
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen]);

  // ============================================================================
  // KEYBOARD HANDLING (ESC)
  // ============================================================================

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // ============================================================================
  // FOCUS TRAP
  // ============================================================================

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus sur le premier élément focusable
    if (firstElement) {
      firstElement.focus();
    }

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // ============================================================================
  // OUTSIDE CLICK HANDLER
  // ============================================================================

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnOutsideClick && event.target === event.currentTarget) {
        onClose();
      }
    },
    [closeOnOutsideClick, onClose]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${backdropClassName}`}
      style={{ zIndex }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${MODAL_DESIGN_TOKENS.animations.backdropFade}`}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className={`
          relative bg-white rounded-2xl shadow-2xl w-full
          ${SIZE_CLASSES[size]}
          max-h-[90vh] overflow-hidden
          flex flex-col
          ${ANIMATION_CLASSES[animationVariant]}
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (si activé) */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Fermer la modale"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );

  // Render dans un portal pour éviter les problèmes de z-index
  return createPortal(modalContent, document.body);
};

// ============================================================================
// SOUS-COMPOSANTS HELPER
// ============================================================================

/**
 * Header standard pour les modales
 */
export const ModalHeader: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, icon, className = '' }) => (
  <div className={`p-6 border-b border-slate-200 ${className}`}>
    <div className="flex items-center gap-3">
      {icon && (
        <div className="p-3 rounded-full bg-emerald-100 flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-slate-900 truncate">{title}</h2>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  </div>
);

/**
 * Body scrollable pour les modales
 */
export const ModalBody: React.FC<{
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}> = ({ children, className = '', noPadding = false }) => (
  <div
    className={`
      flex-1 overflow-y-auto
      ${noPadding ? '' : 'p-6'}
      ${className}
    `}
  >
    {children}
  </div>
);

/**
 * Footer avec actions pour les modales
 */
export const ModalFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`p-6 border-t border-slate-200 bg-slate-50 flex gap-3 ${className}`}>
    {children}
  </div>
);

// ============================================================================
// EXPORT
// ============================================================================

export default BaseModal;
