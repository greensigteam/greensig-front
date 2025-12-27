import React, { useState } from 'react';
import { BaseModal, ModalHeader, ModalBody, ModalFooter, ModalSize } from './BaseModal';
import { X } from 'lucide-react';
import { MODAL_DESIGN_TOKENS } from './modals/designTokens';

// ============================================================================
// TYPES
// ============================================================================

export interface DetailTab {
  /** Clé unique de l'onglet */
  key: string;

  /** Label affiché */
  label: string;

  /** Icône optionnelle */
  icon?: React.ReactNode;

  /** Contenu de l'onglet */
  content: React.ReactNode;

  /** Badge de notification (nombre) */
  badge?: number;

  /** Désactive l'onglet */
  disabled?: boolean;
}

export interface DetailModalProps {
  /** Contrôle la visibilité */
  isOpen: boolean;

  /** Callback de fermeture */
  onClose: () => void;

  /** Titre de la modale */
  title: string;

  /** Sous-titre optionnel */
  subtitle?: string;

  /** Icône du header */
  icon?: React.ReactNode;

  /** Image ou avatar à afficher dans le header */
  avatar?: string;

  /** Taille de la modale */
  size?: ModalSize;

  /** Liste des onglets */
  tabs?: DetailTab[];

  /** Onglet actif par défaut (clé) */
  defaultTab?: string;

  /** Callback quand l'onglet change */
  onTabChange?: (tabKey: string) => void;

  /** Contenu si pas d'onglets (modale simple) */
  children?: React.ReactNode;

  /** Actions à afficher dans le footer */
  actions?: React.ReactNode;

  /** Cache le footer complètement */
  hideFooter?: boolean;

  /** État de chargement */
  loading?: boolean;

  /** Classes CSS additionnelles pour le body */
  bodyClassName?: string;

  /** Utiliser gradient header (emerald-50 to teal-50) - opt-in, default false */
  useGradientHeader?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DetailModal: React.FC<DetailModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  avatar,
  size = 'xl',
  tabs,
  defaultTab,
  onTabChange,
  children,
  actions,
  hideFooter = false,
  loading = false,
  bodyClassName = '',
  useGradientHeader = false,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [activeTab, setActiveTab] = useState<string>(
    defaultTab || (tabs && tabs.length > 0 ? tabs[0].key : '')
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    onTabChange?.(tabKey);
  };

  // ============================================================================
  // COMPUTED
  // ============================================================================

  const currentTab = tabs?.find((t) => t.key === activeTab);
  const content = tabs ? currentTab?.content : children;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size={size}>
      {/* Header */}
      <div className={`p-6 border-b flex items-start gap-4 ${
        useGradientHeader
          ? `${MODAL_DESIGN_TOKENS.colors.gradients.header} ${MODAL_DESIGN_TOKENS.colors.borders.emerald}`
          : 'border-gray-200'
      }`}>
        {/* Avatar/Icon */}
        {(avatar || icon) && (
          <div className="flex-shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt={title}
                className={`w-16 h-16 rounded-full object-cover ring-2 ${
                  useGradientHeader ? 'ring-emerald-200' : 'ring-gray-200'
                }`}
              />
            ) : (
              <div className={`p-3 ${MODAL_DESIGN_TOKENS.borderRadius.full} ${MODAL_DESIGN_TOKENS.colors.backgrounds.emerald100}`}>
                {icon}
              </div>
            )}
          </div>
        )}

        {/* Title/Subtitle */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className={`p-2 ${MODAL_DESIGN_TOKENS.borderRadius.full} hover:bg-white/50 transition-colors flex-shrink-0`}
          aria-label="Fermer"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => !tab.disabled && handleTabChange(tab.key)}
                disabled={tab.disabled}
                className={`
                  relative flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap
                  border-b-2 -mb-px transition-all duration-200
                  ${
                    activeTab === tab.key
                      ? 'border-emerald-500 text-emerald-600 bg-gradient-to-r from-emerald-50/50 to-transparent'
                      : 'border-transparent text-gray-500 hover:text-emerald-600 hover:border-emerald-300'
                  }
                  ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`ml-1 px-2 py-0.5 ${MODAL_DESIGN_TOKENS.badges.emerald} ${MODAL_DESIGN_TOKENS.borderRadius.full}`}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <ModalBody
        className={`${loading ? 'opacity-60 pointer-events-none' : ''} ${bodyClassName}`}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Chargement...</p>
            </div>
          </div>
        ) : (
          content
        )}
      </ModalBody>

      {/* Footer */}
      {!hideFooter && actions && (
        <ModalFooter>{actions}</ModalFooter>
      )}
    </BaseModal>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Section d'information dans une modale de détail
 */
export const DetailSection: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
      {title}
    </h3>
    <div className="space-y-2">{children}</div>
  </div>
);

/**
 * Ligne d'information label/valeur
 */
export const DetailRow: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ label, value, icon, className = '' }) => (
  <div className={`flex items-start gap-3 ${className}`}>
    {icon && (
      <div className="flex-shrink-0 text-gray-400 mt-0.5">
        {icon}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <dt className="text-xs text-gray-500 font-medium">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{value}</dd>
    </div>
  </div>
);

/**
 * Grille d'informations
 */
export const DetailGrid: React.FC<{
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}> = ({ columns = 2, children, className = '' }) => {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[columns];

  return (
    <div className={`grid ${gridClass} gap-4 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Carte d'information avec bordure
 */
export const DetailCard: React.FC<{
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger';
  className?: string;
}> = ({ title, icon, children, variant = 'default', className = '' }) => {
  const variantClasses = {
    default: 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
    info: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
    success: 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200',
    warning: 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200',
    danger: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
  }[variant];

  return (
    <div className={`border rounded-lg p-4 ${variantClasses} ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          {title && (
            <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

/**
 * Liste avec séparateurs
 */
export const DetailList: React.FC<{
  items: Array<{
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
  }>;
  className?: string;
}> = ({ items, className = '' }) => (
  <dl className={`divide-y divide-gray-200 ${className}`}>
    {items.map((item, index) => (
      <div key={index} className="py-3 flex items-start gap-3">
        {item.icon && (
          <div className="flex-shrink-0 text-gray-400 mt-0.5">
            {item.icon}
          </div>
        )}
        <div className="flex-1 flex justify-between gap-4">
          <dt className="text-sm text-gray-500 font-medium">{item.label}</dt>
          <dd className="text-sm text-gray-900 text-right">{item.value}</dd>
        </div>
      </div>
    ))}
  </dl>
);

/**
 * Badge de statut dans une modale de détail
 */
export const DetailBadge: React.FC<{
  label: string;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}> = ({ label, variant = 'default', size = 'sm', className = '' }) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    info: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
  }[variant];

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variantClasses} ${sizeClasses} ${className}`}
    >
      {label}
    </span>
  );
};

/**
 * Timeline pour historique
 */
export const DetailTimeline: React.FC<{
  items: Array<{
    date: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'success' | 'info' | 'warning' | 'danger';
  }>;
  className?: string;
}> = ({ items, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {items.map((item, index) => {
      const variantClasses = {
        default: 'bg-gray-100 text-gray-600',
        success: 'bg-green-100 text-green-600',
        info: 'bg-blue-100 text-blue-600',
        warning: 'bg-amber-100 text-amber-600',
        danger: 'bg-red-100 text-red-600',
      }[item.variant || 'default'];

      return (
        <div key={index} className="flex gap-3">
          {/* Icon/Dot */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${variantClasses}`}>
            {item.icon || (
              <div className="w-2 h-2 rounded-full bg-current" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pb-4 border-b border-gray-200 last:border-b-0">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
              <time className="text-xs text-gray-500 flex-shrink-0">{item.date}</time>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

/**
 * Empty state pour onglets vides
 */
export const DetailEmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {icon && (
      <div className="mb-4 p-4 bg-gray-100 rounded-full text-gray-400">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>
    )}
    {action}
  </div>
);

// ============================================================================
// EXPORT
// ============================================================================

export default DetailModal;
