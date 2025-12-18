import React, { useState } from 'react';
import {
  Layers,
  Maximize2,
  LayoutTemplate,
  Loader2,
  Printer,
  Ruler,
  Trash2,
  X,
  MousePointerClick,
  Pencil,
  Circle,
  Minus,
  Pentagon,
  Undo2,
  Redo2,
  FolderInput,
  FileOutput,
} from 'lucide-react';
import { Measurement, MeasurementType, DrawingMode } from '../../types';
import { useDrawing, getObjectTypesByGeometry } from '../../contexts/DrawingContext';
import ObjectTypeSelector from './ObjectTypeSelector';

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
  // Drawing tools props
  onImport?: () => void;
  onExport?: () => void;
}

/**
 * Floating Tools Panel component
 *
 * Features:
 * - View toggle button (fullscreen/panel)
 * - Layers panel toggle
 * - Drawing tools
 * - Measurement tools
 * - Selection mode
 * - PDF export button
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
  selectionCount = 0,
  onImport,
  onExport,
}) => {
  const [showMeasureTools, setShowMeasureTools] = useState(false);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [pendingDrawingMode, setPendingDrawingMode] = useState<DrawingMode | null>(null);

  // Drawing context
  const {
    isDrawing,
    drawingMode,
    currentGeometry,
    calculatedMetrics,
    setDrawingMode,
    startDrawing,
    cancelDrawing,
    canUndo,
    canRedo,
    undo,
    redo,
    getSelectedTypeInfo,
  } = useDrawing();

  const selectedTypeInfo = getSelectedTypeInfo();

  // Close all panels/modes helper
  const closeAllPanels = () => {
    setShowMeasureTools(false);
    setShowDrawingTools(false);
    setShowLayers(false);
    if (isMeasuring && onToggleMeasure) {
      onToggleMeasure(false);
    }
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection();
    }
  };

  const toggleLayersPanel = () => {
    if (showLayers) {
      setShowLayers(false);
    } else {
      closeAllPanels();
      setShowLayers(true);
    }
  };

  const toggleMeasureTool = () => {
    if (showMeasureTools) {
      setShowMeasureTools(false);
      if (isMeasuring && onToggleMeasure) {
        onToggleMeasure(false);
      }
    } else {
      closeAllPanels();
      setShowMeasureTools(true);
    }
  };

  const toggleDrawingTools = () => {
    if (showDrawingTools) {
      setShowDrawingTools(false);
    } else {
      closeAllPanels();
      setShowDrawingTools(true);
    }
  };

  const toggleSelection = () => {
    if (isSelectionMode) {
      onToggleSelection?.();
    } else {
      closeAllPanels();
      onToggleSelection?.();
    }
  };

  // Handle drawing mode button click
  const handleDrawingModeClick = (mode: DrawingMode) => {
    if (mode === drawingMode) {
      setDrawingMode('none');
      return;
    }

    const geometryType = mode === 'point' ? 'Point' : mode === 'line' ? 'LineString' : 'Polygon';
    const compatibleTypes = getObjectTypesByGeometry(geometryType);

    if (compatibleTypes.length === 1 && compatibleTypes[0]) {
      startDrawing(mode, compatibleTypes[0].id);
    } else if (compatibleTypes.length > 0) {
      setPendingDrawingMode(mode);
      setShowTypeSelector(true);
    }
  };

  // Handle object type selection
  const handleTypeSelect = (typeId: string) => {
    setShowTypeSelector(false);
    if (pendingDrawingMode) {
      startDrawing(pendingDrawingMode, typeId);
      setPendingDrawingMode(null);
    }
  };

  // Handle cancel drawing
  const handleCancelDrawing = () => {
    cancelDrawing();
    setShowTypeSelector(false);
    setPendingDrawingMode(null);
  };

  const hasMeasurements = measurements.length > 0;
  const isDrawingActive = isDrawing || drawingMode !== 'none';

  return (
    <div className="absolute top-24 right-4 pointer-events-auto flex flex-col gap-2 z-50 items-end">
      {/* Main button bar */}
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

        {/* Layers Toggle */}
        <button
          onClick={toggleLayersPanel}
          className={`p-3 transition-colors ${showLayers ? 'bg-emerald-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
          title="Gestion des couches"
        >
          <Layers className="w-5 h-5" />
        </button>

        <div className="h-px bg-slate-100 w-full" />

        {/* Drawing Tools Toggle */}
        <button
          onClick={toggleDrawingTools}
          className={`p-3 transition-colors ${showDrawingTools || isDrawingActive ? 'bg-emerald-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
          title="Outils de dessin"
        >
          <Pencil className="w-5 h-5" />
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
              onClick={toggleSelection}
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

        {/* PDF Export */}
        <button
          onClick={onExportPDF}
          disabled={isExporting}
          className={`p-3 transition-colors ${isExporting ? 'bg-emerald-600 text-white cursor-wait' : 'hover:bg-slate-50 text-slate-600'}`}
          title={isExporting ? "Export en cours..." : "Exporter en PDF"}
        >
          {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
        </button>
      </div>

      {/* ===== DRAWING TOOLS PANEL ===== */}
      {(showDrawingTools || isDrawingActive) && (
        <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-xl border border-white/20 p-3 ring-1 ring-black/5 w-64 animate-in slide-in-from-right-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-700 text-sm">Outils de dessin</h4>
            <button onClick={toggleDrawingTools} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Object Type Selector Modal */}
          {showTypeSelector && pendingDrawingMode && (
            <ObjectTypeSelector
              geometryType={
                pendingDrawingMode === 'point' ? 'Point' :
                pendingDrawingMode === 'line' ? 'LineString' : 'Polygon'
              }
              onSelect={handleTypeSelect}
              onClose={() => {
                setShowTypeSelector(false);
                setPendingDrawingMode(null);
              }}
            />
          )}

          {/* Drawing Buttons */}
          <div className="mb-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Dessiner</div>
            <div className="flex gap-1 bg-slate-50 rounded-lg p-1">
              <button
                onClick={() => handleDrawingModeClick('point')}
                className={`flex-1 p-2 rounded-md transition-all flex flex-col items-center gap-0.5 ${
                  drawingMode === 'point'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'hover:bg-white text-slate-600 hover:shadow-sm'
                }`}
                title="Dessiner un point"
              >
                <Circle className="w-4 h-4" />
                <span className="text-[9px] font-medium">Point</span>
              </button>
              <button
                onClick={() => handleDrawingModeClick('line')}
                className={`flex-1 p-2 rounded-md transition-all flex flex-col items-center gap-0.5 ${
                  drawingMode === 'line'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'hover:bg-white text-slate-600 hover:shadow-sm'
                }`}
                title="Dessiner une ligne"
              >
                <Minus className="w-4 h-4" />
                <span className="text-[9px] font-medium">Ligne</span>
              </button>
              <button
                onClick={() => handleDrawingModeClick('polygon')}
                className={`flex-1 p-2 rounded-md transition-all flex flex-col items-center gap-0.5 ${
                  drawingMode === 'polygon'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'hover:bg-white text-slate-600 hover:shadow-sm'
                }`}
                title="Dessiner un polygone"
              >
                <Pentagon className="w-4 h-4" />
                <span className="text-[9px] font-medium">Surface</span>
              </button>
            </div>
          </div>

          {/* Import/Export Buttons */}
          <div className="mb-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Données</div>
            <div className="flex gap-2">
              <button
                onClick={onImport}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg transition-colors text-xs font-medium border border-transparent hover:border-emerald-200"
                title="Importer des données"
              >
                <FolderInput className="w-3.5 h-3.5" />
                Importer
              </button>
              <button
                onClick={onExport}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg transition-colors text-xs font-medium border border-transparent hover:border-blue-200"
                title="Exporter des données"
              >
                <FileOutput className="w-3.5 h-3.5" />
                Exporter
              </button>
            </div>
          </div>

          {/* Undo/Redo Buttons */}
          <div className="mb-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Historique</div>
            <div className="flex gap-2">
              <button
                onClick={undo}
                disabled={!canUndo}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                  canUndo
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                    : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                }`}
                title="Annuler (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Annuler
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                  canRedo
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                    : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                }`}
                title="Rétablir (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
                Rétablir
              </button>
            </div>
          </div>

          {/* Current Drawing Status */}
          {(isDrawing || currentGeometry) && (
            <div className="border-t border-slate-100 pt-3">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">En cours</div>

              {selectedTypeInfo && (
                <div className="flex items-center gap-2 mb-2 bg-slate-50 rounded-lg px-2 py-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full ring-1 ring-white shadow"
                    style={{ backgroundColor: selectedTypeInfo.color }}
                  />
                  <span className="text-xs font-medium text-slate-700">
                    {selectedTypeInfo.name}
                  </span>
                </div>
              )}

              {/* Metrics display */}
              {calculatedMetrics && (
                <div className="text-[10px] space-y-1 bg-emerald-50 rounded-lg p-2 mb-2 border border-emerald-100">
                  {calculatedMetrics.area_m2 !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-emerald-600">Surface:</span>
                      <span className="font-semibold text-emerald-800">
                        {calculatedMetrics.area_m2 > 10000
                          ? `${calculatedMetrics.area_hectares?.toFixed(2)} ha`
                          : `${calculatedMetrics.area_m2.toFixed(1)} m²`}
                      </span>
                    </div>
                  )}
                  {calculatedMetrics.length_m !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-emerald-600">Longueur:</span>
                      <span className="font-semibold text-emerald-800">
                        {calculatedMetrics.length_m > 1000
                          ? `${calculatedMetrics.length_km?.toFixed(2)} km`
                          : `${calculatedMetrics.length_m.toFixed(1)} m`}
                      </span>
                    </div>
                  )}
                  {calculatedMetrics.perimeter_m !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-emerald-600">Périmètre:</span>
                      <span className="font-semibold text-emerald-800">
                        {calculatedMetrics.perimeter_m.toFixed(1)} m
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Cancel button */}
              <button
                onClick={handleCancelDrawing}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
                Annuler le dessin
              </button>
            </div>
          )}

          {/* Help text */}
          {!isDrawing && !currentGeometry && (
            <p className="text-[10px] text-slate-400 italic text-center pt-2 border-t border-slate-100">
              Sélectionnez un outil pour commencer
            </p>
          )}
        </div>
      )}

      {/* ===== MEASUREMENT TOOLS PANEL ===== */}
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
            >
              📏 Distance
            </button>
            <button
              onClick={() => onToggleMeasure?.(true, 'area')}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md border transition-colors ${isMeasuring && measurementType === 'area' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
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
