import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  MapPin,
  Minus,
  Pentagon,
  Square,
  Pencil,
  Trash2,
  RefreshCw,
  Save,
  Download,
  X,
  Info,
  Wrench
} from 'lucide-react';
import { VEG_LEGEND, HYDRO_LEGEND, SITE_LEGEND } from '../constants';

interface LeftPanelProps {
  onToggleLayer?: (layerId: string, visible: boolean) => void;
  isSidebarCollapsed?: boolean;
}

type DrawingTool = 'Point' | 'LineString' | 'Polygon' | null;

interface SymbologyConfig {
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
}

// Default symbology configuration based on ALL legends
const createDefaultSymbology = (): Record<string, SymbologyConfig> => {
  const config: Record<string, SymbologyConfig> = {};

  // Sites
  SITE_LEGEND.forEach(item => {
    config[item.type] = {
      fillColor: item.color,
      fillOpacity: 0.2,
      strokeColor: item.color,
      strokeWidth: 3
    };
  });

  // Végétation
  VEG_LEGEND.forEach(item => {
    config[item.type] = {
      fillColor: item.color,
      fillOpacity: 0.6,
      strokeColor: item.color,
      strokeWidth: 2
    };
  });

  // Hydrologie
  HYDRO_LEGEND.forEach(item => {
    config[item.type] = {
      fillColor: item.color,
      fillOpacity: 0.8,
      strokeColor: item.color,
      strokeWidth: 2
    };
  });

  return config;
};

const LeftPanel: React.FC<LeftPanelProps> = ({ onToggleLayer, isSidebarCollapsed = true }) => {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'filter' | 'symbology' | 'drawing'>('filter');
  const [activeTool, setActiveTool] = useState<DrawingTool>(null);
  const [symbologyConfig, setSymbologyConfig] = useState<Record<string, SymbologyConfig>>(createDefaultSymbology);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const resetAllFilters = () => {
    setStatusFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');

    // Reset visual checkboxes - ALL layers (Sites + Vég + Hydro)
    const newVisibility: Record<string, boolean> = {};

    [...SITE_LEGEND, ...VEG_LEGEND, ...HYDRO_LEGEND].forEach(item => {
      newVisibility[item.type] = true;
      if (onToggleLayer) onToggleLayer(item.type, true);
    });

    setLayerVisibility(newVisibility);
  };

  // Toggle expanded state for a symbology item
  const toggleExpanded = (type: string) => {
    setExpandedItems(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Update symbology for a specific type
  const updateSymbology = (type: string, field: keyof SymbologyConfig, value: string | number) => {
    setSymbologyConfig(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));

    // Notify the map about the style change
    if ((window as any).updateLayerSymbology) {
      (window as any).updateLayerSymbology(type, { ...symbologyConfig[type], [field]: value });
    }
  };

  // Reset symbology for a specific type
  const resetSymbology = (type: string) => {
    const vegItem = VEG_LEGEND.find(v => v.type === type);
    const hydroItem = HYDRO_LEGEND.find(h => h.type === type);
    const item = vegItem || hydroItem;

    if (item) {
      const defaultConfig: SymbologyConfig = {
        fillColor: item.color,
        fillOpacity: vegItem ? 0.6 : 0.8,
        strokeColor: item.color,
        strokeWidth: 2
      };
      setSymbologyConfig(prev => ({ ...prev, [type]: defaultConfig }));

      if ((window as any).updateLayerSymbology) {
        (window as any).updateLayerSymbology(type, defaultConfig);
      }
    }
  };

  // Expose symbology config to window for map access
  useEffect(() => {
    (window as any).getSymbologyConfig = () => symbologyConfig;
  }, [symbologyConfig]);

  // Adjust position based on sidebar state
  // Sidebar collapsed is 80px (approx 5rem) -> Panel at 100px
  // Sidebar expanded is 256px (approx 16rem) -> Panel at 280px
  const leftPosition = isSidebarCollapsed ? 'left-[90px]' : 'left-[280px]';

  return (
    <div
      className={`absolute top-20 z-[1000] transition-all duration-300 ease-in-out ${leftPosition}`}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="relative flex items-start">
        {/* Main Content Area */}
        <div
          className={`
            bg-white/95 backdrop-blur-sm shadow-xl rounded-lg border border-gray-200 overflow-hidden
            transition-all duration-300 ease-in-out
            ${open ? 'w-[320px] opacity-100' : 'w-0 opacity-0 border-none'}
          `}
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50/80 sticky top-0 z-10">
            <div className="font-bold text-gray-700 flex items-center gap-2">
              <span>🛠️</span> Outils Carte
            </div>
            {/* Close X (optional, since we have the tab) */}
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-lg mb-4">
              <button
                onClick={() => setActiveTab('filter')}
                className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${activeTab === 'filter' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >FILTRES</button>
              <button
                onClick={() => setActiveTab('symbology')}
                className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${activeTab === 'symbology' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >SYMBOLOGIE</button>
              <button
                onClick={() => setActiveTab('drawing')}
                className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${activeTab === 'drawing' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >DESSIN</button>
            </div>

            {/* Filter Content */}
            {activeTab === 'filter' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="text-sm font-semibold text-gray-800 mb-2">Recherche par Type</div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => {
                      // Select All - Sites + Végétation + Hydrologie
                      const newVisibility: Record<string, boolean> = {};

                      [...SITE_LEGEND, ...VEG_LEGEND, ...HYDRO_LEGEND].forEach(item => {
                        newVisibility[item.type] = true;
                        if (onToggleLayer) onToggleLayer(item.type, true);
                      });

                      setLayerVisibility(prev => ({ ...prev, ...newVisibility }));
                    }}
                    className="flex-1 py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded transition-colors border border-emerald-200"
                  >
                    Tout sélectionner
                  </button>
                  <button
                    onClick={() => {
                      // Deselect All
                      const newVisibility: Record<string, boolean> = {};

                      [...SITE_LEGEND, ...VEG_LEGEND, ...HYDRO_LEGEND].forEach(item => {
                        newVisibility[item.type] = false;
                        if (onToggleLayer) onToggleLayer(item.type, false);
                      });

                      setLayerVisibility(prev => ({ ...prev, ...newVisibility }));
                    }}
                    className="flex-1 py-1 px-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded transition-colors border border-red-200"
                  >
                    Tout désélectionner
                  </button>
                </div>

                {/* Sites Section */}
                <div className="mb-3">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Sites
                  </div>
                  <div className="space-y-1 pl-1">
                    {SITE_LEGEND.map(item => (
                      <div
                        key={item.type}
                        className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          id={`filter-${item.type}`}
                          checked={layerVisibility[item.type] !== false}
                          onChange={(e) => {
                            const visible = e.target.checked;
                            setLayerVisibility(prev => ({ ...prev, [item.type]: visible }));
                            if (onToggleLayer) onToggleLayer(item.type, visible);
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-gray-300"
                        />
                        <label htmlFor={`filter-${item.type}`} className="flex items-center gap-2 cursor-pointer flex-1 select-none">
                          <span className="w-4 h-4 rounded shadow-sm border border-black/10" style={{ backgroundColor: item.color }}></span>
                          <span className="text-sm text-gray-700 font-medium">{item.type}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Végétation Section */}
                <div className="mb-3">
                  <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Végétation
                  </div>
                  <div className="space-y-1 pl-1">
                    {VEG_LEGEND.map(item => (
                      <div
                        key={item.type}
                        className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          id={`filter-${item.type}`}
                          checked={layerVisibility[item.type] !== false}
                          onChange={(e) => {
                            const visible = e.target.checked;
                            setLayerVisibility(prev => ({ ...prev, [item.type]: visible }));
                            if (onToggleLayer) onToggleLayer(item.type, visible);
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer border-gray-300"
                        />
                        <label htmlFor={`filter-${item.type}`} className="flex items-center gap-2 cursor-pointer flex-1 select-none">
                          <span className="w-4 h-4 rounded shadow-sm border border-black/10" style={{ backgroundColor: item.color }}></span>
                          <span className="text-sm text-gray-700 font-medium">{item.type}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hydrologie Section */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-cyan-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                    Hydrologie
                  </div>
                  <div className="space-y-1 pl-1">
                    {HYDRO_LEGEND.map(item => (
                      <div
                        key={item.type}
                        className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          id={`filter-${item.type}`}
                          checked={layerVisibility[item.type] !== false}
                          onChange={(e) => {
                            const visible = e.target.checked;
                            setLayerVisibility(prev => ({ ...prev, [item.type]: visible }));
                            if (onToggleLayer) onToggleLayer(item.type, visible);
                          }}
                          className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer border-gray-300"
                        />
                        <label htmlFor={`filter-${item.type}`} className="flex items-center gap-2 cursor-pointer flex-1 select-none">
                          <span className="w-4 h-4 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: item.color }}></span>
                          <span className="text-sm text-gray-700 font-medium">{item.type}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 uppercase flex items-center gap-2">
                      État / Statut
                    </label>
                    <select
                      className="w-full text-sm p-2 rounded border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        console.log("Filter by status:", e.target.value);
                      }}
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="service" className="text-green-600">En Service / Actif</option>
                      <option value="maintenance" className="text-orange-600">En Maintenance</option>
                      <option value="hors_service" className="text-red-600">Hors Service</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 uppercase flex items-center gap-2">
                      Filtre Temporel
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-gray-500 mb-0.5 block">Du</span>
                        <input
                          type="date"
                          value={startDateFilter}
                          onChange={(e) => setStartDateFilter(e.target.value)}
                          className="w-full text-xs p-1.5 rounded border border-gray-300 focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 mb-0.5 block">Au</span>
                        <input
                          type="date"
                          value={endDateFilter}
                          onChange={(e) => setEndDateFilter(e.target.value)}
                          className="w-full text-xs p-1.5 rounded border border-gray-300 focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={resetAllFilters}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Réinitialiser les filtres
                  </button>
                </div>
              </div>
            )}

            {/* Symbology Content */}
            {activeTab === 'symbology' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="text-sm font-semibold text-gray-800 mb-1">Gestion de la Symbologie</div>
                <div className="text-xs text-gray-500 mb-4">Personnalisez l'apparence des couches de végétation et d'hydrologie.</div>

                {/* Vegetation Section */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Végétation
                  </div>
                  <div className="space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                    {VEG_LEGEND.map(item => {
                      const config = symbologyConfig[item.type];
                      const isExpanded = expandedItems[item.type];
                      const Icon = item.icon;

                      return (
                        <div key={item.type} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                          {/* Header */}
                          <div
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleExpanded(item.type)}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded border-2 border-white shadow-sm"
                                style={{ backgroundColor: config?.fillColor || item.color }}
                              />
                              <Icon className="w-4 h-4" style={{ color: config?.fillColor || item.color }} />
                              <span className="text-sm font-medium text-gray-700">{item.type}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>

                          {/* Controls */}
                          {isExpanded && (
                            <div className="p-3 pt-0 space-y-3 border-t border-gray-100 bg-gray-50">
                              {/* Fill Color */}
                              <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-600">Couleur de remplissage</label>
                                <input
                                  type="color"
                                  value={config?.fillColor || item.color}
                                  onChange={(e) => updateSymbology(item.type, 'fillColor', e.target.value)}
                                  className="w-8 h-6 rounded cursor-pointer border border-gray-300"
                                />
                              </div>

                              {/* Opacity */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs text-gray-600">Opacité</label>
                                  <span className="text-xs text-gray-500">{Math.round((config?.fillOpacity || 0.6) * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={(config?.fillOpacity || 0.6) * 100}
                                  onChange={(e) => updateSymbology(item.type, 'fillOpacity', Number(e.target.value) / 100)}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                              </div>

                              {/* Stroke Color */}
                              <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-600">Couleur de contour</label>
                                <input
                                  type="color"
                                  value={config?.strokeColor || item.color}
                                  onChange={(e) => updateSymbology(item.type, 'strokeColor', e.target.value)}
                                  className="w-8 h-6 rounded cursor-pointer border border-gray-300"
                                />
                              </div>

                              {/* Stroke Width */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs text-gray-600">Épaisseur contour</label>
                                  <span className="text-xs text-gray-500">{config?.strokeWidth || 2}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  value={config?.strokeWidth || 2}
                                  onChange={(e) => updateSymbology(item.type, 'strokeWidth', Number(e.target.value))}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                              </div>

                              {/* Reset Button */}
                              <button
                                onClick={() => resetSymbology(item.type)}
                                className="w-full py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded flex items-center justify-center gap-1 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Réinitialiser
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hydrology Section */}
                <div>
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Hydrologie
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {HYDRO_LEGEND.map(item => {
                      const config = symbologyConfig[item.type];
                      const isExpanded = expandedItems[item.type];

                      return (
                        <div key={item.type} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                          {/* Header */}
                          <div
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleExpanded(item.type)}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: config?.fillColor || item.color }}
                              />
                              <span className="text-sm font-medium text-gray-700">{item.type}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>

                          {/* Controls */}
                          {isExpanded && (
                            <div className="p-3 pt-0 space-y-3 border-t border-gray-100 bg-gray-50">
                              {/* Fill Color */}
                              <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-600">Couleur</label>
                                <input
                                  type="color"
                                  value={config?.fillColor || item.color}
                                  onChange={(e) => updateSymbology(item.type, 'fillColor', e.target.value)}
                                  className="w-8 h-6 rounded cursor-pointer border border-gray-300"
                                />
                              </div>

                              {/* Opacity */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs text-gray-600">Opacité</label>
                                  <span className="text-xs text-gray-500">{Math.round((config?.fillOpacity || 0.8) * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={(config?.fillOpacity || 0.8) * 100}
                                  onChange={(e) => updateSymbology(item.type, 'fillOpacity', Number(e.target.value) / 100)}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                              </div>

                              {/* Stroke Width */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs text-gray-600">Épaisseur</label>
                                  <span className="text-xs text-gray-500">{config?.strokeWidth || 2}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  value={config?.strokeWidth || 2}
                                  onChange={(e) => updateSymbology(item.type, 'strokeWidth', Number(e.target.value))}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                              </div>

                              {/* Reset Button */}
                              <button
                                onClick={() => resetSymbology(item.type)}
                                className="w-full py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded flex items-center justify-center gap-1 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Réinitialiser
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Drawing Content */}
            {activeTab === 'drawing' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="text-sm font-semibold text-gray-800 mb-1">Outils de Dessin</div>
                <div className="text-xs text-gray-500 mb-2">Créez et mesurez des éléments sur la carte.</div>

                {/* Active tool indicator */}
                {activeTool && (
                  <div className="mb-4 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                      Mode actif :
                      {activeTool === 'Point' && <><MapPin className="w-3 h-3" /> Point</>}
                      {activeTool === 'LineString' && <><Minus className="w-3 h-3" /> Ligne</>}
                      {activeTool === 'Polygon' && <><Pentagon className="w-3 h-3" /> Polygone</>}
                    </span>
                    <button
                      onClick={() => {
                        setActiveTool(null);
                        if ((window as any).leafletDrawing?.deactivateDrawing) {
                          (window as any).leafletDrawing.deactivateDrawing();
                        }
                      }}
                      className="ml-auto text-emerald-600 hover:text-emerald-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    title="Dessiner un Point"
                    className={`p-3 border rounded-lg flex flex-col items-center transition-all group shadow-sm hover:shadow-md ${activeTool === 'Point'
                      ? 'bg-emerald-500 border-emerald-600 text-white ring-2 ring-emerald-300'
                      : 'bg-white border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-gray-700'
                      }`}
                    onClick={() => {
                      const newTool = activeTool === 'Point' ? null : 'Point';
                      setActiveTool(newTool);
                      if (newTool) {
                        if ((window as any).leafletDrawing?.activateDrawing) {
                          (window as any).leafletDrawing.activateDrawing('Point');
                        } else if ((window as any).olDrawing?.activateDrawing) {
                          (window as any).olDrawing.activateDrawing('Point');
                        }
                      } else {
                        if ((window as any).leafletDrawing?.deactivateDrawing) {
                          (window as any).leafletDrawing.deactivateDrawing();
                        } else if ((window as any).olDrawing?.deactivateDrawing) {
                          (window as any).olDrawing.deactivateDrawing();
                        }
                      }
                    }}
                  >
                    <MapPin className={`w-5 h-5 mb-1 transition-transform ${activeTool === 'Point' ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Point</span>
                  </button>

                  <button
                    title="Dessiner une Ligne"
                    className={`p-3 border rounded-lg flex flex-col items-center transition-all group shadow-sm hover:shadow-md ${activeTool === 'LineString'
                      ? 'bg-emerald-500 border-emerald-600 text-white ring-2 ring-emerald-300'
                      : 'bg-white border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-gray-700'
                      }`}
                    onClick={() => {
                      const newTool = activeTool === 'LineString' ? null : 'LineString';
                      setActiveTool(newTool);
                      if (newTool) {
                        if ((window as any).leafletDrawing?.activateDrawing) {
                          (window as any).leafletDrawing.activateDrawing('LineString');
                        } else if ((window as any).olDrawing?.activateDrawing) {
                          (window as any).olDrawing.activateDrawing('LineString');
                        }
                      } else {
                        if ((window as any).leafletDrawing?.deactivateDrawing) {
                          (window as any).leafletDrawing.deactivateDrawing();
                        } else if ((window as any).olDrawing?.deactivateDrawing) {
                          (window as any).olDrawing.deactivateDrawing();
                        }
                      }
                    }}
                  >
                    <Minus className={`w-5 h-5 mb-1 transition-transform ${activeTool === 'LineString' ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Ligne</span>
                  </button>

                  <button
                    title="Dessiner une Zone"
                    className={`p-3 border rounded-lg flex flex-col items-center transition-all group shadow-sm hover:shadow-md ${activeTool === 'Polygon'
                      ? 'bg-emerald-500 border-emerald-600 text-white ring-2 ring-emerald-300'
                      : 'bg-white border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-gray-700'
                      }`}
                    onClick={() => {
                      const newTool = activeTool === 'Polygon' ? null : 'Polygon';
                      setActiveTool(newTool);
                      if (newTool) {
                        if ((window as any).leafletDrawing?.activateDrawing) {
                          (window as any).leafletDrawing.activateDrawing('Polygon');
                        } else if ((window as any).olDrawing?.activateDrawing) {
                          (window as any).olDrawing.activateDrawing('Polygon');
                        }
                      } else {
                        if ((window as any).leafletDrawing?.deactivateDrawing) {
                          (window as any).leafletDrawing.deactivateDrawing();
                        } else if ((window as any).olDrawing?.deactivateDrawing) {
                          (window as any).olDrawing.deactivateDrawing();
                        }
                      }
                    }}
                  >
                    <Pentagon className={`w-5 h-5 mb-1 transition-transform ${activeTool === 'Polygon' ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Polygone</span>
                  </button>
                </div>

                <div className="mb-4 space-y-2">
                  <label className="text-xs font-medium text-gray-700 uppercase">Type de Végétation</label>
                  <select
                    id="vegetationTypeSelect"
                    className="w-full text-sm p-2 rounded border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    onChange={(e) => {
                      if ((window as any).leafletDrawing?.setVegetationType) {
                        (window as any).leafletDrawing.setVegetationType(e.target.value);
                      }
                    }}
                  >
                    <option value="">Aucun (dessin simple)</option>
                    <option value="Arbres">Arbres</option>
                    <option value="Arbustes">Arbustes</option>
                    <option value="Palmier">Palmier</option>
                    <option value="Gazon">Gazon</option>
                    <option value="Vivaces">Vivaces</option>
                    <option value="Cactus">Cactus</option>
                    <option value="Graminées">Graminées</option>
                    <option value="Annuelle">Annuelle</option>
                  </select>
                </div>

                <div className="mb-4 space-y-2">
                  <label className="text-xs font-medium text-gray-700 uppercase">Couleur du tracé</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      defaultValue="#ff6600"
                      className="flex-1 h-9 rounded cursor-pointer border border-gray-300"
                      onChange={(e) => {
                        if ((window as any).leafletDrawing?.changeDrawingColor) {
                          (window as any).leafletDrawing.changeDrawingColor(e.target.value);
                        } else if ((window as any).olDrawing?.changeDrawingColor) {
                          (window as any).olDrawing.changeDrawingColor(e.target.value);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-6">Actions</div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    className={`col-span-1 py-2 px-3 border text-xs font-medium rounded shadow-sm flex items-center justify-center gap-1.5 transition ${activeTool
                      ? 'bg-orange-50 border-orange-300 hover:bg-orange-100 text-orange-700'
                      : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    onClick={() => {
                      setActiveTool(null);
                      if ((window as any).leafletDrawing?.deactivateDrawing) {
                        (window as any).leafletDrawing.deactivateDrawing();
                      } else if ((window as any).olDrawing?.deactivateDrawing) {
                        (window as any).olDrawing.deactivateDrawing();
                      }
                    }}
                  >
                    <Square className="w-3.5 h-3.5" />
                    Arrêter
                  </button>
                  <button
                    className="col-span-1 py-2 px-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded shadow-sm flex items-center justify-center gap-1.5 transition"
                    onClick={() => {
                      if ((window as any).leafletDrawing?.activateModify) {
                        (window as any).leafletDrawing.activateModify();
                      } else if ((window as any).olDrawing?.activateModify) {
                        (window as any).olDrawing.activateModify();
                      }
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Modifier
                  </button>

                  <button
                    className="col-span-1 py-2 px-3 bg-red-50 border border-red-100 hover:bg-red-100 text-red-700 text-xs font-medium rounded shadow-sm flex items-center justify-center gap-1.5 transition"
                    onClick={() => {
                      if ((window as any).leafletDrawing?.deleteLastDrawing) {
                        (window as any).leafletDrawing.deleteLastDrawing();
                      } else if ((window as any).olDrawing?.deleteLastDrawing) {
                        (window as any).olDrawing.deleteLastDrawing();
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                  <button
                    className="col-span-1 py-2 px-3 bg-red-50 border border-red-100 hover:bg-red-100 text-red-700 text-xs font-medium rounded shadow-sm flex items-center justify-center gap-1.5 transition"
                    onClick={() => {
                      if ((window as any).leafletDrawing?.clearDrawings) {
                        (window as any).leafletDrawing.clearDrawings();
                      } else if ((window as any).olDrawing?.clearDrawings) {
                        (window as any).olDrawing.clearDrawings();
                      }
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tout effacer
                  </button>

                  <div className="col-span-2 h-px bg-gray-200 my-1"></div>

                  <button
                    className="col-span-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-md flex items-center justify-center gap-2 transition"
                    onClick={() => {
                      if ((window as any).leafletDrawing?.saveDrawingsToVegetation) {
                        (window as any).leafletDrawing.saveDrawingsToVegetation();
                      } else if ((window as any).olDrawing?.saveDrawingsToVegetation) {
                        (window as any).olDrawing.saveDrawingsToVegetation();
                      }
                    }}
                  >
                    <Save className="w-4 h-4" />
                    Sauvegarder dans végétation
                  </button>

                  <button
                    className="col-span-2 py-2.5 px-3 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded shadow-md flex items-center justify-center gap-2 transition"
                    onClick={() => {
                      let data = null;
                      if ((window as any).leafletDrawing?.exportDrawingsAsGeoJSON) {
                        data = (window as any).leafletDrawing.exportDrawingsAsGeoJSON();
                      } else if ((window as any).olDrawing?.exportDrawingsAsGeoJSON) {
                        data = (window as any).olDrawing.exportDrawingsAsGeoJSON();
                      }
                      if (!data || (data.features && data.features.length === 0)) {
                        alert('Aucun dessin à exporter');
                        return;
                      }
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'dessins_export.geojson';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Exporter GeoJSON
                  </button>
                </div>

                {/* Instructions */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    Instructions
                  </div>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li className="flex items-center gap-1"><MapPin className="w-3 h-3" /> <strong>Point:</strong> Cliquez pour placer</li>
                    <li className="flex items-center gap-1"><Minus className="w-3 h-3" /> <strong>Ligne/Polygone:</strong> Cliquez pour ajouter, double-clic pour terminer</li>
                    <li className="flex items-center gap-1"><X className="w-3 h-3" /> <strong>Annuler:</strong> Clic droit ou Échap</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Side Tab Toggle Button - Positioned exactly to the right of the panel content */}
        <button
          onClick={() => setOpen(s => !s)}
          className={`
            flex items-center justify-center
            w-8 h-12 
            bg-white border-y border-r border-gray-300 rounded-r-lg shadow-md
            text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all
            ${!open ? 'ml-0' : '-ml-px'} 
            z-0
          `}
          title={open ? "Fermer le panneau" : "Ouvrir les outils"}
        >
          <span className={`text-lg font-bold transform transition-transform duration-300 ${open ? 'rotate-180' : 'rotate-0'}`}>
            ▶
          </span>
        </button>
      </div>
    </div>
  );
};

export default LeftPanel;
