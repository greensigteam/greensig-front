import React, { useState, useRef, useEffect } from 'react';
import { Lock } from 'lucide-react';

interface PermissionButtonProps {
  /** Whether the user has permission to perform this action */
  hasPermission: boolean;
  /** Message to show when user doesn't have permission */
  permissionMessage?: string;
  /** Click handler (only called if hasPermission is true) */
  onClick: () => void;
  /** Button content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** CSS classes when button is disabled */
  disabledClassName?: string;
  /** Button title/tooltip when enabled */
  title?: string;
  /** Whether to show a lock icon when disabled */
  showLockIcon?: boolean;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Whether button is in loading state */
  isLoading?: boolean;
  /** Variant style */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

/**
 * PermissionButton - A button that shows as disabled with tooltip when user lacks permission
 *
 * Instead of hiding buttons entirely, this component shows them in a disabled state
 * with a tooltip explaining why the action is not available. This provides better UX
 * by making users aware of the system's capabilities.
 *
 * @example
 * ```tsx
 * <PermissionButton
 *   hasPermission={permissions.canDeleteSite(site)}
 *   permissionMessage="Seuls les administrateurs peuvent supprimer des sites"
 *   onClick={() => handleDelete(site)}
 *   variant="danger"
 * >
 *   <Trash2 className="w-4 h-4" />
 *   Supprimer
 * </PermissionButton>
 * ```
 */
export function PermissionButton({
  hasPermission,
  permissionMessage = "Vous n'avez pas les permissions nécessaires",
  onClick,
  children,
  className = '',
  disabledClassName = '',
  title,
  showLockIcon = true,
  type = 'button',
  isLoading = false,
  variant = 'secondary',
}: PermissionButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [showTooltip]);

  // Base styles by variant
  const variantStyles = {
    primary: hasPermission
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
      : 'bg-slate-200 text-slate-400 cursor-not-allowed',
    secondary: hasPermission
      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
      : 'bg-slate-100 text-slate-400 cursor-not-allowed',
    danger: hasPermission
      ? 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700'
      : 'bg-slate-100 text-slate-400 cursor-not-allowed',
    ghost: hasPermission
      ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
      : 'text-slate-400 cursor-not-allowed',
  };

  const handleClick = () => {
    if (hasPermission && !isLoading) {
      onClick();
    } else if (!hasPermission) {
      setShowTooltip(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setShowTooltip(false), 3000);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type={type}
        onClick={handleClick}
        disabled={isLoading}
        className={`
          inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm
          transition-all duration-200
          ${variantStyles[variant]}
          ${hasPermission ? '' : disabledClassName}
          ${className}
        `}
        title={hasPermission ? title : undefined}
        aria-disabled={!hasPermission}
      >
        {!hasPermission && showLockIcon && <Lock className="w-3.5 h-3.5 opacity-60" />}
        {children}
      </button>

      {/* Tooltip for disabled state */}
      {!hasPermission && showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-xs whitespace-normal">
            <div className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
              <span>{permissionMessage}</span>
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * PermissionIconButton - A smaller icon-only button with permission handling
 */
interface PermissionIconButtonProps {
  hasPermission: boolean;
  permissionMessage?: string;
  onClick: () => void;
  icon: React.ReactNode;
  className?: string;
  title?: string;
}

export function PermissionIconButton({
  hasPermission,
  permissionMessage = 'Action non autorisée',
  onClick,
  icon,
  className = '',
  title,
}: PermissionIconButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (hasPermission) {
      onClick();
    } else {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        className={`
          p-2 rounded-lg transition-colors
          ${
            hasPermission
              ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              : 'text-slate-300 cursor-not-allowed'
          }
          ${className}
        `}
        title={hasPermission ? title : undefined}
        aria-disabled={!hasPermission}
      >
        {icon}
      </button>

      {!hasPermission && showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>{permissionMessage}</span>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
          </div>
        </div>
      )}
    </div>
  );
}

export default PermissionButton;
