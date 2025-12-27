import React, { type FC } from 'react';
import { Sparkles } from 'lucide-react';
import { MODAL_DESIGN_TOKENS } from './designTokens';

// ============================================================================
// TYPES
// ============================================================================

export interface SummaryItem {
  /** Display label (optional) */
  label?: string;
  /** Value to display (can be text or React node) */
  value: React.ReactNode;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Optional custom styling for value */
  valueClassName?: string;
}

export interface SummarySection {
  /** Section title */
  title: string;
  /** Section icon (optional) */
  icon?: React.ReactNode;
  /** List of items to display */
  items: SummaryItem[];
  /** Maximum height before scrolling (optional) */
  maxHeight?: string;
  /** Number of items to show before "show more" (optional) */
  limit?: number;
}

export interface SummaryPanelProps {
  /** Panel title (optional, defaults to "Résumé") */
  title?: string;
  /** Header icon (optional, defaults to Sparkles) */
  headerIcon?: React.ReactNode;
  /** List of sections to display */
  sections: SummarySection[];
  /** Optional class name for container */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * SummaryPanel Component
 *
 * Right sidebar panel for displaying a real-time summary of form data.
 * Extracted from QuickTaskCreator.tsx and made reusable.
 *
 * Features:
 * - Gradient background (gray-50 to gray-100)
 * - Header with icon and title
 * - Collapsible sections with labels
 * - Item limit with "show more" indicator
 * - Scroll support for long content
 * - Emerald-themed highlights
 *
 * @example
 * ```tsx
 * <SummaryPanel
 *   sections={[
 *     {
 *       title: 'Quand',
 *       items: [
 *         { label: 'Date', value: '15 janvier 2025', icon: <Calendar /> },
 *         { label: 'Heure', value: '09:00 → 17:00', icon: <Clock /> }
 *       ]
 *     },
 *     {
 *       title: 'Participants',
 *       items: [
 *         { value: 'Équipe A', icon: <Users /> },
 *         { value: 'Équipe B', icon: <Users /> }
 *       ],
 *       limit: 3
 *     }
 *   ]}
 * />
 * ```
 */
export const SummaryPanel: FC<SummaryPanelProps> = ({
  title = 'Résumé',
  headerIcon,
  sections,
  className = '',
}) => {
  const defaultHeaderIcon = <Sparkles className="w-4 h-4 text-emerald-600" />;

  return (
    <div
      className={`${MODAL_DESIGN_TOKENS.colors.gradients.sidebar} ${MODAL_DESIGN_TOKENS.spacing.bodyPadding} ${MODAL_DESIGN_TOKENS.borderRadius.lg} border ${MODAL_DESIGN_TOKENS.colors.borders.default} space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 ${MODAL_DESIGN_TOKENS.colors.backgrounds.emerald100} ${MODAL_DESIGN_TOKENS.borderRadius.md} flex items-center justify-center`}>
          {headerIcon || defaultHeaderIcon}
        </div>
        <h3 className={`font-semibold ${MODAL_DESIGN_TOKENS.colors.text.primary}`}>
          {title}
        </h3>
      </div>

      {/* Sections */}
      {sections.map((section, sectionIndex) => (
        <SummarySectionComponent key={sectionIndex} section={section} />
      ))}
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Internal component for rendering a single summary section
 */
const SummarySectionComponent: FC<{ section: SummarySection }> = ({ section }) => {
  const { title, icon, items, maxHeight, limit } = section;

  // Apply limit if specified
  const displayItems = limit ? items.slice(0, limit) : items;
  const hasMore = limit && items.length > limit;
  const remainingCount = hasMore ? items.length - limit : 0;

  return (
    <div className="space-y-1">
      {/* Section Title */}
      <div className={`${MODAL_DESIGN_TOKENS.typography.labelCaps}`}>
        {icon && <span className="mr-1">{icon}</span>}
        {title}
        {items.length > 0 && ` (${items.length})`}
      </div>

      {/* Items */}
      <div
        className={`space-y-1 ${maxHeight ? `max-h-${maxHeight} overflow-y-auto` : ''}`}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {displayItems.map((item, itemIndex) => (
          <SummaryItemComponent key={itemIndex} item={item} />
        ))}

        {/* "Show more" indicator */}
        {hasMore && (
          <div className={`${MODAL_DESIGN_TOKENS.typography.tertiaryText} italic`}>
            +{remainingCount} autre{remainingCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Internal component for rendering a single summary item
 */
const SummaryItemComponent: FC<{ item: SummaryItem }> = ({ item }) => {
  const { label, value, icon, valueClassName } = item;

  // If no label, render as simple item with icon
  if (!label) {
    return (
      <div className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1 border border-gray-200">
        {icon && <span className="w-3 h-3 text-gray-400">{icon}</span>}
        <span className={valueClassName || 'text-gray-700 truncate'}>{value}</span>
      </div>
    );
  }

  // Render with label + value
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon && <span className="w-4 h-4 text-gray-400">{icon}</span>}
      <span className={valueClassName || `font-medium ${MODAL_DESIGN_TOKENS.colors.text.primary}`}>
        {value}
      </span>
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS FOR COMMON PATTERNS
// ============================================================================

/**
 * Pre-styled badge for important values (emerald theme)
 */
export const SummaryBadge: FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 ${className}`}>
      <span className="text-sm font-medium text-emerald-700">{children}</span>
    </div>
  );
};

/**
 * Pre-styled empty state for sections with no data
 */
export const SummaryEmpty: FC<{ message?: string }> = ({ message = 'Aucune information' }) => {
  return (
    <div className={`${MODAL_DESIGN_TOKENS.typography.tertiaryText} italic py-2`}>
      {message}
    </div>
  );
};

export default SummaryPanel;
