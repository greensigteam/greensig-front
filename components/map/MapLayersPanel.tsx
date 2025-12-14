import React from 'react';
import { Layers, Filter, Grid, X, MapIcon, ImageIcon, Mountain, Navigation, Trees } from 'lucide-react';
import { MAP_LAYERS, VEG_LEGEND, HYDRO_LEGEND, SITE_LEGEND } from '../../constants';
import type { MapLayerType } from '../../types';
import { useMapContext } from '../../contexts/MapContext';

interface MapLayersPanelProps {
  showLayers: boolean;
  setShowLayers: (show: boolean) => void;
  layersPanelTab: 'layers' | 'filters' | 'symbology';
  setLayersPanelTab: (tab: 'layers' | 'filters' | 'symbology') => void;
  activeLayerId: MapLayerType;
  setActiveLayerId: (id: MapLayerType) => void;
  layerVisibility: Record<string, boolean>;
  toggleMapLayerVisibility: (layerId: string, visible: boolean) => void;
  clusteringEnabled: boolean;
  setClusteringEnabled?: (enabled: boolean) => void;
}

export const MapLayersPanel: React.FC<MapLayersPanelProps> = ({
  showLayers,
  setShowLayers,
  layersPanelTab,
  setLayersPanelTab,
  activeLayerId,
  setActiveLayerId,
  layerVisibility,
  toggleMapLayerVisibility,
  clusteringEnabled,
  setClusteringEnabled
}) => {
  // ✅ Use MapContext for batch operations
  const mapContext = useMapContext();

  if (!showLayers) return null;

  return (
    <div className="absolute top-4 right-16 pointer-events-auto w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 animate-slide-in origin-top-right ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] z-50">
      <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white/50">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-slate-800 text-sm tracking-tight">Couches Cartographiques</h3>
        </div>
        <button
          onClick={() => setShowLayers(false)}
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Onglets */}
      <div className="flex p-2 bg-slate-50 border-b border-slate-100">
        <button
          onClick={() => setLayersPanelTab('layers')}
          className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg transition-all ${layersPanelTab === 'layers' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Layers className="w-3 h-3" /> COUCHES
          </span>
        </button>
        <button
          onClick={() => setLayersPanelTab('filters')}
          className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg transition-all ${layersPanelTab === 'filters' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Filter className="w-3 h-3" /> FILTRES
          </span>
        </button>
        <button
          onClick={() => setLayersPanelTab('symbology')}
          className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg transition-all ${layersPanelTab === 'symbology' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Grid className="w-3 h-3" /> SYMBOLES
          </span>
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {/* Onglet COUCHES */}
        {layersPanelTab === 'layers' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Base Maps Section */}
            <div className="mb-6">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapIcon className="w-3 h-3" /> Fonds de plan
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {Object.values(MAP_LAYERS).map(layer => {
                  let Icon = MapIcon;
                  if (layer.id === 'SATELLITE') Icon = ImageIcon;
                  if (layer.id === 'TERRAIN') Icon = Mountain;
                  if (layer.id === 'NAVIGATION') Icon = Navigation;

                  const isActive = activeLayerId === layer.id;

                  return (
                    <button
                      key={layer.id}
                      onClick={() => setActiveLayerId(layer.id)}
                      className={`
                        relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-200 group
                        ${isActive
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-1 ring-emerald-500/20'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'}
                      `}
                    >
                      <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-white shadow-sm text-slate-400 group-hover:text-slate-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-bold truncate w-full text-center">
                        {layer.name.split(' ')[0]}
                      </span>
                      {isActive && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-2 ring-white"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Options Cartographiques */}
            <div className="mb-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Trees className="w-3 h-3" /> Options
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-md ${clusteringEnabled ? 'bg-blue-50 text-blue-600' : 'bg-white text-slate-400'}`}>
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium">Clustering</span>
                  </div>
                  <label className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${clusteringEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                    <input type="checkbox" className="hidden" checked={clusteringEnabled} onChange={(e) => setClusteringEnabled?.(e.target.checked)} />
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${clusteringEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onglet FILTRES */}
        {layersPanelTab === 'filters' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-sm font-semibold text-gray-800 mb-2">Recherche par Type</div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  // ✅ Batch update - Set all layers visible at once
                  mapContext.setAllLayersVisibility(true);
                }}
                className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg transition-colors border border-emerald-200"
              >
                Tout sélectionner
              </button>
              <button
                onClick={() => {
                  // ✅ Batch update - Set all layers invisible at once
                  mapContext.setAllLayersVisibility(false);
                }}
                className="flex-1 py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors border border-red-200"
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
                  <div key={item.type} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded transition-colors">
                    <input
                      type="checkbox"
                      id={`filter-${item.type}`}
                      checked={layerVisibility[item.type] !== false}
                      onChange={(e) => {
                        const visible = e.target.checked;
                        toggleMapLayerVisibility(item.type, visible);
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
              <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Végétation
              </div>
              <div className="space-y-1 pl-1">
                {VEG_LEGEND.map(item => (
                  <div key={item.type} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded transition-colors">
                    <input
                      type="checkbox"
                      id={`filter-${item.type}`}
                      checked={layerVisibility[item.type] !== false}
                      onChange={(e) => {
                        const visible = e.target.checked;
                        toggleMapLayerVisibility(item.type, visible);
                      }}
                      className="w-4 h-4 rounded text-green-600 focus:ring-green-500 cursor-pointer border-gray-300"
                    />
                    <label htmlFor={`filter-${item.type}`} className="flex items-center gap-2 cursor-pointer flex-1 select-none">
                      <span className="w-4 h-4 rounded shadow-sm border border-black/10" style={{ backgroundColor: item.color }}></span>
                      <span className="text-sm text-gray-700 font-medium">{item.type}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Hydraulique Section */}
            <div className="mb-3">
              <div className="text-xs font-semibold text-cyan-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                Hydraulique
              </div>
              <div className="space-y-1 pl-1">
                {HYDRO_LEGEND.map(item => (
                  <div key={item.type} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded transition-colors">
                    <input
                      type="checkbox"
                      id={`filter-${item.type}`}
                      checked={layerVisibility[item.type] !== false}
                      onChange={(e) => {
                        const visible = e.target.checked;
                        toggleMapLayerVisibility(item.type, visible);
                      }}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer border-gray-300"
                    />
                    <label htmlFor={`filter-${item.type}`} className="flex items-center gap-2 cursor-pointer flex-1 select-none">
                      <span className="w-4 h-4 rounded shadow-sm border border-black/10" style={{ backgroundColor: item.color }}></span>
                      <span className="text-sm text-gray-700 font-medium">{item.type}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Onglet SYMBOLOGIE - Simplified */}
        {layersPanelTab === 'symbology' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-sm font-semibold text-gray-800 mb-1">Gestion de la Symbologie</div>
            <div className="text-xs text-gray-500 mb-4">Personnalisez l'apparence des couches.</div>
            {/* Symbology controls would go here */}
            <p className="text-xs text-slate-500">Configuration symbologie disponible pour les couches de végétation et hydrologie.</p>
          </div>
        )}
      </div>
    </div>
  );
};
