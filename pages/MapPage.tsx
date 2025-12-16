import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { VEG_LEGEND, HYDRO_LEGEND, SITE_LEGEND } from '../constants';
import { MapLayerType, Coordinates, OverlayState, MapObjectDetail, Measurement, MeasurementType } from '../types';
import { MOCK_SITES } from '../services/mockData';
import { searchObjects, geoJSONToLatLng, fetchAllSites, SiteFrontend, exportPDF, downloadBlob } from '../services/api';
import { useSearch } from '../hooks/useSearch';
import { useGeolocation } from '../hooks/useGeolocation';
import { useMapContext } from '../contexts/MapContext';
import { useToast } from '../contexts/ToastContext';
import { useSelection } from '../contexts/SelectionContext';
import { useDrawing } from '../contexts/DrawingContext';
import logger from '../services/logger';

// ✅ IMPORT SUB-COMPONENTS
import { MapSearchBar } from '../components/map/MapSearchBar';
import { MapFloatingTools } from '../components/map/MapFloatingTools';
import { MapObjectDetailCard } from '../components/map/MapObjectDetailCard';
import { MapLayersPanel } from '../components/map/MapLayersPanel';
import { MapZoomControls } from '../components/map/MapZoomControls';
import { SelectionPanel } from '../components/map/SelectionPanel';
import ObjectTypeSelector from '../components/map/ObjectTypeSelector';
import CreateObjectModal from '../components/CreateObjectModal';
import ImportWizard from '../components/import/ImportWizard';
import ExportPanel from '../components/export/ExportPanel';

// Types pour la symbologie
interface SymbologyConfig {
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
}

// Configuration par défaut de la symbologie
const createDefaultSymbology = (): Record<string, SymbologyConfig> => {
  const config: Record<string, SymbologyConfig> = {};

  SITE_LEGEND.forEach(item => {
    config[item.type] = {
      fillColor: item.color,
      fillOpacity: 0.2,
      strokeColor: item.color,
      strokeWidth: 3
    };
  });

  VEG_LEGEND.forEach(item => {
    config[item.type] = {
      fillColor: item.color,
      fillOpacity: 0.6,
      strokeColor: item.color,
      strokeWidth: 2
    };
  });

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

interface MapPageProps {
  activeLayerId: MapLayerType;
  setActiveLayerId: (id: MapLayerType) => void;
  setTargetLocation: (loc: { coordinates: Coordinates; zoom?: number } | null) => void;
  setUserLocation?: (loc: Coordinates | null) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  getCurrentZoom: () => number;
  getMapCenter?: () => Coordinates | null;
  getMapElement?: () => HTMLDivElement | null;
  exportMapCanvas?: () => Promise<string | null>;
  isPanelOpen?: boolean;
  onToggleMap?: () => void;
  overlays: OverlayState;
  onToggleOverlay: (key: keyof OverlayState) => void;
  selectedObject?: MapObjectDetail | null;
  onCloseObjectDetail?: () => void;
  isSidebarCollapsed: boolean;
  isRouting?: boolean;
  setIsRouting?: (isRouting: boolean) => void;
  onToggleLayer?: (layerId: string, visible: boolean) => void;
  clusteringEnabled?: boolean;
  setClusteringEnabled?: (enabled: boolean) => void;
  isMeasuring?: boolean;
  measurementType?: MeasurementType;
  onToggleMeasure?: (active: boolean, type?: MeasurementType) => void;
  measurements?: Measurement[];
  currentMeasurement?: Measurement | null;
  onClearMeasurements?: () => void;
  onRemoveMeasurement?: (id: string) => void;
}

export const MapPage: React.FC<MapPageProps> = ({
  activeLayerId,
  setActiveLayerId,
  setTargetLocation,
  setUserLocation,
  onZoomIn,
  onZoomOut,
  getCurrentZoom,
  getMapCenter,
  exportMapCanvas,
  isPanelOpen = true,
  onToggleMap,
  selectedObject,
  onCloseObjectDetail,
  isSidebarCollapsed,
  onToggleLayer,
  clusteringEnabled = true,
  setClusteringEnabled,
  isMeasuring,
  measurementType,
  onToggleMeasure,
  measurements,
  currentMeasurement,
  onClearMeasurements,
  onRemoveMeasurement
}) => {
  // ✅ USE MAP CONTEXT - Replaces window communication
  const mapContext = useMapContext();

  // ✅ USE TOAST - For user notifications
  const { showToast } = useToast();

  // ✅ USE SELECTION - For multi-object selection
  const { toggleSelectionMode, isSelectionMode, selectedObjects, getSelectedIds } = useSelection();

  // ✅ USE DRAWING - For drawing/editing tools
  const {
    drawingMode,
    setDrawingMode,
    editingMode,
    setEditingMode,
    isDrawing,
    drawnGeometry,
    clearDrawnGeometry,
    pendingObjectType,
    setPendingObjectType,
    calculatedMetrics,
  } = useDrawing();

  // ========== STATE MANAGEMENT ==========
  const [showLayers, setShowLayers] = useState(false);
  const [showZoomWarning, setShowZoomWarning] = useState(false);

  // ✅ Import/Export modals state
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // Sites dynamiques chargés depuis l'API
  const [sites, setSites] = useState<SiteFrontend[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);

  // États pour les onglets Filtres/Symbologie
  const [layersPanelTab, setLayersPanelTab] = useState<'layers' | 'filters' | 'symbology'>('layers');
  const [symbologyConfig] = useState<Record<string, SymbologyConfig>>(createDefaultSymbology);

  const [isExporting, setIsExporting] = useState(false);

  // ========== LOAD SITES FROM API ==========
  useEffect(() => {
    const loadSites = async () => {
      try {
        setSitesLoading(true);
        const loadedSites = await fetchAllSites();
        setSites(loadedSites);
        logger.info(`MapPage: ${loadedSites.length} sites chargés depuis l'API`);
      } catch (error) {
        logger.error('Erreur chargement sites:', error);
      } finally {
        setSitesLoading(false);
      }
    };
    loadSites();
  }, []);

  // ✅ Memoize mapped sites to prevent infinite loop
  const mappedSites = useMemo(() => sites.map(s => ({
    id: s.id,
    name: s.name,
    code_site: s.code_site,
    coordinates: s.coordinates
  })), [sites]);

  // ========== SEARCH HOOK ==========
  const {
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    showSuggestions,
    setShowSuggestions,
    isSearching,
    setIsSearching,
    searchResult,
    setSearchResult,
    searchContainerRef,
    handleSuggestionClick: hookHandleSuggestionClick
  } = useSearch({
    sites: mappedSites,
    debounceMs: 300,
    maxSuggestions: 5,
    minQueryLength: 2
  });

  // Override hook's handleSuggestionClick to also update targetLocation
  const handleSuggestionClick = (suggestion: typeof searchSuggestions[0]) => {
    hookHandleSuggestionClick(suggestion);
    if (suggestion.coordinates) {
      setTargetLocation({ coordinates: suggestion.coordinates, zoom: 18 });
    }
  };

  // ========== GEOLOCATION HOOK ==========
  const {
    requestGeolocation
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
    onSuccess: (result) => {
      setSearchResult({
        name: "Ma position",
        description: `Localisation GPS (précision: ${result.accuracy.toFixed(0)}m)`,
        coordinates: result.coordinates,
        zoom: 18
      });
      if (setUserLocation) {
        setUserLocation(result.coordinates);
      }
      setTargetLocation({ coordinates: result.coordinates, zoom: 18 });
      setIsSearching(false);
    },
    onError: (error) => {
      setIsSearching(false);
      alert(error.message);
    }
  });

  // ========== HANDLERS ==========
  const handleGeolocation = () => {
    setIsSearching(true);
    requestGeolocation();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResult(null);

    try {
      const query = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // 1. Recherche dans les sites API
      const matchedSite = sites.find(s => {
        const name = s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const desc = s.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const code = (s.code_site || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cat = s.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return name.includes(query) || desc.includes(query) || code.includes(query) || cat.includes(query);
      });

      if (matchedSite) {
        setSearchResult({
          name: matchedSite.name,
          description: `${matchedSite.category} - ${matchedSite.description}`,
          coordinates: matchedSite.coordinates,
          zoom: 18,
          objectId: matchedSite.id?.toString() || `site-${matchedSite.name}`,
          objectType: 'Site'
        });
        setTargetLocation({ coordinates: matchedSite.coordinates, zoom: 18 });
        setIsSearching(false);
        return;
      }

      // 2. Recherche API Django
      try {
        const apiResults = await searchObjects(searchQuery);
        if (apiResults && apiResults.length > 0) {
          const firstResult = apiResults[0];
          if (!firstResult) return; // TypeScript null safety

          if (firstResult.location) {
            const coords = geoJSONToLatLng(firstResult.location.coordinates);
            setSearchResult({
              name: firstResult.name,
              description: `${firstResult.type} (API)`,
              coordinates: coords,
              zoom: 18,
              objectId: firstResult.id?.toString() || `object-${firstResult.name}`,
              objectType: firstResult.type
            });
            setTargetLocation({ coordinates: coords, zoom: 18 });
            setIsSearching(false);
            return;
          }
        }
      } catch (error) {
        logger.error('Erreur recherche API Django:', error);
      }

      // 3. Fallback: données mock
      const mockSite = MOCK_SITES.find(s => s.name.toLowerCase().includes(query));
      if (mockSite) {
        setSearchResult({
          name: mockSite.name,
          description: `Site - ${mockSite.address}`,
          coordinates: mockSite.coordinates,
          zoom: 18,
          objectId: `mock-${mockSite.name}`,
          objectType: 'Site'
        });
        setTargetLocation({ coordinates: mockSite.coordinates, zoom: 18 });
        setIsSearching(false);
        return;
      }

      // 4. Fallback: Nominatim
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data && data.length > 0) {
          const result = data[0];
          const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
          setSearchResult({
            name: result.display_name,
            description: `Résultat externe (${result.type})`,
            coordinates: coords,
            zoom: 16
          });
          setTargetLocation({ coordinates: coords, zoom: 16 });
        } else {
          alert("Aucun résultat trouvé pour cette recherche.");
        }
      } catch (error) {
        logger.error("Error during Nominatim search:", error);
        alert("Une erreur est survenue lors de la recherche externe. Vérifiez votre connexion internet.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleZoomOutClick = () => {
    const currentZoom = getCurrentZoom();
    if (currentZoom <= 3) {
      setShowZoomWarning(true);
    } else {
      onZoomOut();
    }
  };

  const confirmZoomOut = () => {
    onZoomOut();
    setShowZoomWarning(false);
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      const btn = document.activeElement as HTMLElement;
      if (btn) btn.blur();

      const mapImageBase64 = await exportMapCanvas?.();
      if (!mapImageBase64) {
        throw new Error("Impossible d'exporter l'image de la carte");
      }

      const center = getMapCenter?.() || { lat: 32.219, lng: -7.934 };
      const zoom = getCurrentZoom();

      const contextVisibleLayers = mapContext.getVisibleLayers();
      const visibleLayers: Record<string, boolean> = {};
      const layerMapping: Record<string, string> = {
        'Site': 'sites',
        'Arbre': 'arbres',
        'Gazon': 'gazons',
        'Palmier': 'palmiers',
        'Arbuste': 'arbustes',
        'Vivace': 'vivaces',
        'Cactus': 'cactus',
        'Graminee': 'graminees',
        'Puit': 'puits',
        'Pompe': 'pompes',
        'Vanne': 'vannes',
        'Clapet': 'clapets',
        'Canalisation': 'canalisations',
        'Aspersion': 'aspersions',
        'Goutte': 'gouttes',
        'Ballon': 'ballons'
      };

      Object.entries(contextVisibleLayers).forEach(([key, value]) => {
        // Use mapping if available, otherwise fallback to lowercase
        const backendKey = layerMapping[key] || key.toLowerCase().replace(/\s+/g, '');
        visibleLayers[backendKey] = value;
      });

      const pdfBlob = await exportPDF({
        title: 'Export Carte GreenSIG',
        mapImageBase64,
        visibleLayers,
        center: [center.lng, center.lat],
        zoom
      });

      const date = new Date().toISOString().split('T')[0];
      downloadBlob(pdfBlob, `greensig_carte_${date}.pdf`);

      // ✅ Success toast
      showToast(`PDF exporté avec succès: greensig_carte_${date}.pdf`, 'success');

    } catch (error) {
      logger.error("Erreur lors de l'export PDF:", error);

      // ✅ Error toast (replaces alert)
      showToast(
        "Erreur lors de la génération du PDF. Vérifiez que le serveur backend est accessible.",
        'error',
        7000 // 7 seconds for errors
      );
    } finally {
      setIsExporting(false);
    }
  };

  // ✅ Helper function to toggle map layer via MapContext
  const toggleMapLayerVisibility = (layerId: string, visible: boolean) => {
    // Use MapContext instead of window
    mapContext.toggleMapLayer(layerId, visible);

    if (onToggleLayer) onToggleLayer(layerId, visible);
  };


  // ✅ Sync local symbology config to MapContext (initial setup only)
  useEffect(() => {
    Object.entries(symbologyConfig).forEach(([type, config]) => {
      mapContext.updateLayerSymbology(type, config);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Show type selector when a geometry is drawn
  useEffect(() => {
    if (drawnGeometry && !pendingObjectType) {
      setShowTypeSelector(true);
    }
  }, [drawnGeometry, pendingObjectType]);

  // ✅ Show create modal when type is selected
  useEffect(() => {
    if (pendingObjectType && drawnGeometry) {
      setShowTypeSelector(false);
      setShowCreateModal(true);
    }
  }, [pendingObjectType, drawnGeometry]);

  // ✅ Handle object type selection
  const handleTypeSelected = (typeId: string) => {
    setPendingObjectType(typeId);
    setShowTypeSelector(false);
  };

  // ✅ Handle create modal close
  const handleCreateModalClose = () => {
    setShowCreateModal(false);
    clearDrawnGeometry();
  };

  // ✅ Handle object created successfully
  const handleObjectCreated = (objectData: any) => {
    showToast(`${pendingObjectType} créé avec succès!`, 'success');
    setShowCreateModal(false);
    clearDrawnGeometry();
    // Trigger a refresh of map data
    window.dispatchEvent(new CustomEvent('refresh-map-data'));
  };

  // ✅ Handle import success
  const handleImportSuccess = (count: number, type: string) => {
    showToast(`${count} ${type}(s) importé(s) avec succès!`, 'success');
    setShowImportWizard(false);
    // Trigger a refresh of map data
    window.dispatchEvent(new CustomEvent('refresh-map-data'));
  };

  // ========== RENDER ==========
  return (
    <>
      {/* 1. Search Bar Component */}
      <MapSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        isSearching={isSearching}
        searchSuggestions={searchSuggestions}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        onSuggestionClick={handleSuggestionClick}
        onGeolocation={handleGeolocation}
        searchContainerRef={searchContainerRef}
        searchResult={searchResult}
        setSearchResult={setSearchResult}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* 2. Floating Tools Component (includes drawing tools) */}
      <MapFloatingTools
        isPanelOpen={isPanelOpen}
        onToggleMap={onToggleMap}
        showLayers={showLayers}
        setShowLayers={setShowLayers}
        isExporting={isExporting}
        onExportPDF={handleExportPDF}
        isMeasuring={isMeasuring}
        measurementType={measurementType}
        onToggleMeasure={onToggleMeasure}
        measurements={measurements}
        currentMeasurement={currentMeasurement}
        onClearMeasurements={onClearMeasurements}
        onRemoveMeasurement={onRemoveMeasurement}
        isSelectionMode={isSelectionMode}
        onToggleSelection={toggleSelectionMode}
        selectionCount={selectedObjects.length}
        onImport={() => setShowImportWizard(true)}
        onExport={() => setShowExportPanel(true)}
      />

      {/* 3. Selection Panel */}
      <SelectionPanel
        onCreateIntervention={() => {
          // TODO: Navigate to intervention creation page with selected objects
          showToast(`Création d'intervention pour ${selectedObjects.length} objets`, 'info');
        }}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* 4. Object Detail Card */}
      <MapObjectDetailCard
        selectedObject={selectedObject || null}
        onClose={onCloseObjectDetail}
      />

      {/* 4. Layers Panel Component */}
      <MapLayersPanel
        showLayers={showLayers}
        setShowLayers={setShowLayers}
        layersPanelTab={layersPanelTab}
        setLayersPanelTab={setLayersPanelTab}
        activeLayerId={activeLayerId}
        setActiveLayerId={setActiveLayerId}
        layerVisibility={mapContext.visibleLayers}
        toggleMapLayerVisibility={toggleMapLayerVisibility}
        clusteringEnabled={clusteringEnabled}
        setClusteringEnabled={setClusteringEnabled}
      />

      {/* 5. Zoom Controls Component */}
      <MapZoomControls
        onZoomIn={onZoomIn}
        onZoomOut={handleZoomOutClick}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* 6. Object Type Selector Modal */}
      {showTypeSelector && drawnGeometry && (
        <ObjectTypeSelector
          isOpen={showTypeSelector}
          onClose={() => {
            setShowTypeSelector(false);
            clearDrawnGeometry();
          }}
          onSelect={handleTypeSelected}
          geometryType={drawnGeometry.type as 'Point' | 'LineString' | 'Polygon'}
        />
      )}

      {/* 7. Create Object Modal */}
      {showCreateModal && pendingObjectType && drawnGeometry && (
        <CreateObjectModal
          isOpen={showCreateModal}
          onClose={handleCreateModalClose}
          objectType={pendingObjectType}
          geometry={drawnGeometry}
          metrics={calculatedMetrics}
          onSuccess={handleObjectCreated}
        />
      )}

      {/* 8. Import Wizard Modal */}
      <ImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onSuccess={handleImportSuccess}
      />

      {/* 9. Export Panel Modal */}
      <ExportPanel
        isOpen={showExportPanel}
        onClose={() => setShowExportPanel(false)}
        selectedType={selectedObjects.length > 0 ? selectedObjects[0]?.type : undefined}
        selectedIds={getSelectedIds()}
      />

      {/* Zoom Warning Modal */}
      {showZoomWarning && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 pointer-events-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 p-3 rounded-full shrink-0">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">Zoom trop éloigné</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    À ce niveau de zoom, les détails des infrastructures ne seront plus visibles. Voulez-vous continuer ?
                  </p>
                </div>
                <button onClick={() => setShowZoomWarning(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setShowZoomWarning(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all"
              >
                Annuler
              </button>
              <button
                onClick={confirmZoomOut}
                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
