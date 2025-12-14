import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface MapZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  isSidebarCollapsed: boolean;
}

/**
 * Zoom Controls component
 *
 * Features:
 * - Zoom in/out buttons
 * - Fixed position (bottom-left)
 * - Responsive to sidebar state
 */
export const MapZoomControls: React.FC<MapZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  isSidebarCollapsed
}) => {
  return (
    <div
      className="absolute bottom-8 transition-all duration-300 pointer-events-auto flex flex-col gap-4 z-50"
      style={{ left: isSidebarCollapsed ? '88px' : '276px' }}
    >
      <div className="flex flex-col gap-2">
        <button
          onClick={onZoomIn}
          className="w-9 h-9 bg-white/90 backdrop-blur shadow-lg rounded-lg flex items-center justify-center text-slate-600 hover:text-emerald-600 border border-white/20 hover:bg-slate-50 transition-colors active:bg-slate-100"
          title="Zoom Avant"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="w-9 h-9 bg-white/90 backdrop-blur shadow-lg rounded-lg flex items-center justify-center text-slate-600 hover:text-emerald-600 border border-white/20 hover:bg-slate-50 transition-colors active:bg-slate-100"
          title="Zoom Arrière"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
