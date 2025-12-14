import React, { useState } from 'react';
import { Layers, Maximize2, LayoutTemplate, Loader2, Printer, Ruler, Trash2, X, MousePointerClick } from 'lucide-react';
import { Measurement, MeasurementType } from '../../types';

interface MapFloatingToolsProps {
  isPanelOpen: boolean;
  onToggleMap?: () => void;
  showLayers: boolean;
  setShowLayers: (show: boolean) => void;
  isExporting: boolean;
  onExportPDF: () => void;
  isMeasuring?: boolean;
  measurementType?: MeasurementType;
  onToggleMeasure?: (active: boolean, type?: MeasurementType) => void;
  measurements?: Measurement[];
  currentMeasurement?: Measurement | null;
  onClearMeasurements?: () => void;
  onRemoveMeasurement?: (id: string) => void;
  isSelectionMode?: boolean;
  onToggleSelection?: () => void;
  selectionCount?: number;
}

/**
 * Floating Tools Panel component
 *
 * Features:
 * - View toggle button (fullscreen/panel)
 * - Layers panel toggle
 * - PDF export button
 * - Measurement tools
 */
export const MapFloatingTools: React.FC<MapFloatingToolsProps> = ({
  isPanelOpen,
  onToggleMap,
  showLayers,
  setShowLayers,
  isExporting,
  onExportPDF,
  isMeasuring,
  measurementType,
  onToggleMeasure,
  measurements = [],
  currentMeasurement,
  onClearMeasurements,
  onRemoveMeasurement,
  isSelectionMode,
  onToggleSelection,
  selectionCount = 0
}) => {
  const [showMeasureTools, setShowMeasureTools] = useState(false);

  const toggleMeasureTool = () => {
    setShowMeasureTools(!showMeasureTools);
    if (showMeasureTools && isMeasuring && onToggleMeasure) {
      onToggleMeasure(false); // Close and stop measuring
    }
  };

  const hasMeasurements = measurements.length > 0;

  return (
    <div className="absolute top-24 right-4 pointer-events-auto flex flex-col gap-2 z-50 items-end">
      <div className="bg-white/90 backdrop-blur-md shadow-xl rounded-xl border border-white/20 overflow-hidden flex flex-col ring-1 ring-black/5 w-12">
        {/* View Toggle Button */}
        {onToggleMap && (
          <>
            <button
              onClick={onToggleMap}
              className={`p-3 transition-colors ${!isPanelOpen ? 'bg-emerald-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
              title={isPanelOpen ? "Carte Plein Écran" : "Afficher le Panneau"}
            >
              {isPanelOpen ? <Maximize2 className="w-5 h-5" /> : <LayoutTemplate className="w-5 h-5" />}
            </button>
            <div className="h-px bg-slate-100 w-full" />
          </>
        )}

        <button
          onClick={() => setShowLayers(!showLayers)}
          className={`p-3 transition-colors ${showLayers ? 'bg-emerald-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
          title="Gestion des couches"
        >
          <Layers className="w-5 h-5" />
        </button>

        <div className="h-px bg-slate-100 w-full" />

        {/* Measurement Toggle */}
        <button
          onClick={toggleMeasureTool}
          className={`p-3 transition-colors ${showMeasureTools || isMeasuring ? 'bg-emerald-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
          title="Outils de mesure"
        >
          <Ruler className="w-5 h-5" />
        </button>

        <div className="h-px bg-slate-100 w-full" />

        {/* Selection Toggle */}
        {onToggleSelection && (
          <>
            <button
              onClick={onToggleSelection}
              className={`p-3 transition-colors relative ${isSelectionMode ? 'bg-yellow-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
              title="Sélection multiple"
            >
              <MousePointerClick className="w-5 h-5" />
              {selectionCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-white">
                  {selectionCount}
                </span>
              )}
            </button>
            <div className="h-px bg-slate-100 w-full" />
          </>
        )}

        <button
          onClick={onExportPDF}
          disabled={isExporting}
          className={`p-3 transition-colors ${isExporting ? 'bg-emerald-600 text-white cursor-wait' : 'hover:bg-slate-50 text-slate-600'}`}
          title={isExporting ? "Export en cours..." : "Exporter en PDF"}
        >
          {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
        </button>
      </div>

      {/* Expanded Measurement Panel */}
      {(showMeasureTools || isMeasuring) && (
        <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-xl border border-white/20 p-3 ring-1 ring-black/5 w-64 animate-in slide-in-from-right-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-700 text-sm">Mesures</h4>
            <button onClick={toggleMeasureTool} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => onToggleMeasure?.(true, 'distance')}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md border transition-colors ${isMeasuring && measurementType === 'distance' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              aria-label="Mesurer une distance sur la carte"
            >
              📏 Distance
            </button>
            <button
              onClick={() => onToggleMeasure?.(true, 'area')}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md border transition-colors ${isMeasuring && measurementType === 'area' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              aria-label="Mesurer une surface sur la carte"
            >
              📐 Surface
            </button>
          </div>

          <p className="text-[10px] text-slate-500 mb-3 italic">
            {isMeasuring
              ? (measurementType === 'distance' ? 'Cliquez pour placer des points. Double-cliquez pour terminer.' : 'Cliquez pour dessiner un polygone. Double-cliquez pour terminer.')
              : 'Sélectionnez un outil pour commencer.'}
          </p>

          {(currentMeasurement || hasMeasurements) && (
            <div className="border-t border-slate-100 pt-3">
              {currentMeasurement && (
                <div className="mb-2 bg-emerald-50 p-2 rounded border border-emerald-100">
                  <div className="text-[10px] uppercase font-bold text-emerald-600 mb-0.5">En cours</div>
                  <div className="font-mono font-bold text-emerald-800 text-lg leading-none">{currentMeasurement.value}</div>
                </div>
              )}

              {measurements.map((m, i) => (
                <div key={m.id || i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{m.type === 'distance' ? '📏' : '📐'}</span>
                    <span className="font-mono text-sm font-medium text-slate-700">{m.value}</span>
                  </div>
                  {onRemoveMeasurement && (
                    <button onClick={() => onRemoveMeasurement(m.id)} className="text-slate-300 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

              {onClearMeasurements && (hasMeasurements || currentMeasurement) && (
                <button
                  onClick={onClearMeasurements}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs text-red-600 hover:bg-red-50 py-1.5 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Tout effacer
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

