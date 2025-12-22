import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, AlertTriangle } from 'lucide-react';
import { VEG_LEGEND, HYDRO_LEGEND, SITE_LEGEND } from '../constants';
import { MapLayerType, Coordinates, OverlayState, MapObjectDetail, Measurement, MeasurementType } from '../types';
import { MOCK_SITES } from '../services/mockData';
import { searchObjects, geoJSONToLatLng, fetchAllSites, SiteFrontend, exportPDF, downloadBlob, deleteInventoryItem, ImportExecuteResponse } from '../services/api';
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
import { SiteCarousel } from '../components/map/SiteCarousel';
import { CreateSiteModal } from '../components/map/CreateSiteModal';
import SiteEditModal from '../components/sites/SiteEditModal';
import CreateObjectModal from '../components/CreateObjectModal';
import ImportWizard from '../components/import/ImportWizard';
import ExportPanel from '../components/export/ExportPanel';
import TaskFormModal, { InventoryObjectOption } from '../components/planning/TaskFormModal';
import { ReclamationFormModal } from '../components/reclamations/ReclamationFormModal';
import { planningService } from '../services/planningService';
import { fetchEquipes } from '../services/usersApi';
import { fetchTypesReclamations, fetchUrgences } from '../services/reclamationsApi';
import { TypeTache, TacheCreate } from '../types/planning';
import { TypeReclamation, Urgence, Reclamation } from '../types/reclamations';
import { EquipeList } from '../types/users';
import { ReportDrawingMode } from '../components/map/MapFloatingTools';
import { GeoJSONGeometry, DrawingMode } from '../types';

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
  userRole?: string;
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
  overlays,
  onToggleOverlay,
  selectedObject,
  onCloseObjectDetail,
  isSidebarCollapsed,
  onToggleLayer,
  clusteringEnabled = false,
  setClusteringEnabled,
  isMeasuring,
  measurementType,
  onToggleMeasure,
  measurements,
  currentMeasurement,
  onClearMeasurements,
  onRemoveMeasurement,
  userRole
}) => {
  // ✅ USE MAP CONTEXT - Replaces window communication
  const mapContext = useMapContext();

  // ✅ USE TOAST - For user notifications
  const { showToast } = useToast();

  // ✅ USE NAVIGATE - For page navigation
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ USE SELECTION - For multi-object selection
  const { toggleSelectionMode, isSelectionMode, selectedObjects, getSelectedIds, addMultipleToSelection, setSelectionMode } = useSelection();

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
    startDrawing,
    cancelDrawing,
  } = useDrawing();

  // ✅ Clear persistent drawing state on mount to prevent "white page" issues
  useEffect(() => {
    clearDrawnGeometry();
    setDrawingMode('none');
    setPendingObjectType(null);
  }, []);

  // ========== STATE MANAGEMENT ==========
  const [showLayers, setShowLayers] = useState(false);
  const [showZoomWarning, setShowZoomWarning] = useState(false);

  // ✅ Import/Export modals state
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showCreateSiteModal, setShowCreateSiteModal] = useState(false);
  const [isCreatingSite, setIsCreatingSite] = useState(false);

  // Sites dynamiques chargés depuis l'API
  const [sites, setSites] = useState<SiteFrontend[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [isCarouselOpen, setIsCarouselOpen] = useState(true);
  const [editingSite, setEditingSite] = useState<SiteFrontend | null>(null);

  // États pour les onglets Filtres/Symbologie
  const [layersPanelTab, setLayersPanelTab] = useState<'layers' | 'filters' | 'symbology'>('layers');
  const [symbologyConfig] = useState<Record<string, SymbologyConfig>>(createDefaultSymbology);

  const [isExporting, setIsExporting] = useState(false);

  // Task Creation State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalInitialValues, setTaskModalInitialValues] = useState<Partial<TacheCreate>>({});
  const [taskPreSelectedObjects, setTaskPreSelectedObjects] = useState<InventoryObjectOption[]>([]);
  const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
  const [equipes, setEquipes] = useState<EquipeList[]>([]);

  // Reclamation/Report Problem State
  const [isReportingProblem, setIsReportingProblem] = useState(false);
  const [reportDrawingMode, setReportDrawingMode] = useState<ReportDrawingMode>('none');
  const [reportGeometry, setReportGeometry] = useState<GeoJSONGeometry | null>(null);
  const [showReclamationModal, setShowReclamationModal] = useState(false);
  const [typesReclamation, setTypesReclamation] = useState<TypeReclamation[]>([]);
  const [urgences, setUrgencesReclamation] = useState<Urgence[]>([]);

  // ========== HANDLE NAVIGATION FROM INVENTORY ==========
  useEffect(() => {
    const state = location.state as { highlightFromInventory?: boolean; selectedObjects?: any[] } | null;

    if (state?.highlightFromInventory && state?.selectedObjects?.length) {
      // Convert inventory objects to MapObjectDetail format
      const mapObjects: MapObjectDetail[] = state.selectedObjects.map((obj: any) => ({
        id: obj.id,
        type: obj.type,
        title: obj.title,
        subtitle: obj.subtitle || '',
        attributes: obj.attributes || {},
        geometry: obj.coordinates ? {
          type: 'Point' as const,
          coordinates: [obj.coordinates.lng, obj.coordinates.lat]
        } : undefined
      }));

      // Activate selection mode and add objects
      setSelectionMode(true);
      addMultipleToSelection(mapObjects);

      // Calculate bounding box and zoom to fit all objects
      if (state.selectedObjects.length > 0) {
        const coords = state.selectedObjects
          .filter((obj: any) => obj.coordinates?.lat && obj.coordinates?.lng)
          .map((obj: any) => obj.coordinates);

        if (coords.length > 0) {
          // Calculate center of all objects
          const avgLat = coords.reduce((sum: number, c: any) => sum + c.lat, 0) / coords.length;
          const avgLng = coords.reduce((sum: number, c: any) => sum + c.lng, 0) / coords.length;

          // Zoom to center with appropriate zoom level
          setTargetLocation({
            coordinates: { lat: avgLat, lng: avgLng },
            zoom: coords.length === 1 ? 18 : 16
          });
        }
      }

      // Show notification
      showToast(`${mapObjects.length} objet(s) affiché(s) sur la carte`, 'success');

      // Clear the navigation state to prevent re-processing on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

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

  // ✅ Adjust ScaleLine position when carousel opens/closes
  useEffect(() => {
    const scaleLine = document.querySelector('.ol-scale-line') as HTMLElement;
    if (scaleLine) {
      scaleLine.style.transition = 'all 0.3s ease';
      scaleLine.style.left = 'auto';
      scaleLine.style.right = '24px';
      scaleLine.style.bottom = isCarouselOpen ? '220px' : '24px';
    }
  }, [isCarouselOpen]);

  // ========== TASK MANAGEMENT ==========
  const loadTaskData = async () => {
    try {
      const [types, teamData] = await Promise.all([
        planningService.getTypesTaches(),
        fetchEquipes()
      ]);
      setTypesTaches(types);
      // Handle paginated response for equipes
      const teams = Array.isArray(teamData) ? teamData : (teamData as any).results || [];
      setEquipes(teams);
    } catch (err: any) {
      console.error("Error loading task data", err);
      showToast("Erreur lors du chargement des données de planification", "error");
    }
  };

  const handleCreateTask = async (object?: MapObjectDetail) => {
    // Load data if needed
    if (typesTaches.length === 0) {
      await loadTaskData();
    }

    const initialValues: Partial<TacheCreate> = {};
    const preSelected: InventoryObjectOption[] = [];

    if (object) {
      // Only add if ID is numeric (skip sites or non-inventory items if needed)
      const objId = Number(object.id);
      if (!isNaN(objId)) {
        // Try to get superficie from attributes (various possible keys)
        const superficieStr = object.attributes?.['superficie_calculee']
          || object.attributes?.['Surface (m²)']
          || object.attributes?.['area_sqm'];
        const superficie = superficieStr ? parseFloat(superficieStr) : undefined;

        preSelected.push({
          id: objId,
          type: object.type,
          nom: object.title,
          site: object.subtitle || '', // MapObjectDetail subtitle is site often
          soussite: object.attributes?.['Sous-site'],
          superficie: !isNaN(superficie as number) ? superficie : undefined
        });
      }
    }

    setTaskPreSelectedObjects(preSelected);
    setTaskModalInitialValues(initialValues);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (data: TacheCreate) => {
    try {
      await planningService.createTache(data);
      showToast("Tâche créée avec succès", "success");
      setIsTaskModalOpen(false);
      // Navigate to planning page after successful creation
      navigate('/planning');
    } catch (err: any) {
      console.error("Error creating task", err);
      showToast(err.message || "Erreur lors de la création de la tâche", "error");
    }
  };

  // ========== REPORT PROBLEM HANDLERS ==========

  // Load reclamation reference data
  const loadReclamationData = async () => {
    try {
      const [typesData, urgencesData] = await Promise.all([
        fetchTypesReclamations(),
        fetchUrgences()
      ]);
      setTypesReclamation(typesData);
      setUrgencesReclamation(urgencesData);
    } catch (err: any) {
      console.error("Error loading reclamation data", err);
      showToast("Erreur lors du chargement des données", "error");
    }
  };

  // Handle clicking "Signaler un problème" button
  const handleReportProblem = async () => {
    // Load reference data if needed
    if (typesReclamation.length === 0) {
      await loadReclamationData();
    }
    setIsReportingProblem(true);
    setReportDrawingMode('none');
    // Close other panels
    setShowLayers(false);
  };

  // Handle selecting a geometry type for reporting
  const handleStartReportDrawing = (mode: ReportDrawingMode) => {
    setReportDrawingMode(mode);
    // Activate drawing mode via context
    if (mode !== 'none') {
      startDrawing(mode as DrawingMode);
    }
  };

  // Handle canceling report mode
  const handleCancelReporting = () => {
    setIsReportingProblem(false);
    setReportDrawingMode('none');
    setReportGeometry(null);
    cancelDrawing();
    clearDrawnGeometry();
  };

  // Handle successful reclamation creation
  const handleReclamationSuccess = (reclamation: Reclamation) => {
    showToast(`Réclamation ${reclamation.numero_reclamation} créée avec succès`, "success");
    setShowReclamationModal(false);
    setReportGeometry(null);
    setIsReportingProblem(false);
    setReportDrawingMode('none');
    // Clear drawn geometry from map
    // Navigate to reclamations page
    navigate('/reclamations');
  };

  // Effect to detect when drawing is complete in reporting mode
  useEffect(() => {
    if (isReportingProblem && drawnGeometry && reportDrawingMode !== 'none' && !showReclamationModal) {
      // Drawing completed, open the reclamation modal
      setReportGeometry(drawnGeometry);
      setShowReclamationModal(true);
      setReportDrawingMode('none');
    }
  }, [isReportingProblem, drawnGeometry, reportDrawingMode, showReclamationModal]);

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

  // ✅ Show type selector when a geometry is drawn (for objects, not sites)
  useEffect(() => {
    if (drawnGeometry && !pendingObjectType && !isCreatingSite && !isReportingProblem) {
      setShowTypeSelector(true);
    }
  }, [drawnGeometry, pendingObjectType, isCreatingSite, isReportingProblem]);

  // ✅ Show site creation modal when polygon is drawn while creating a site
  useEffect(() => {
    if (isCreatingSite && drawnGeometry?.type === 'Polygon') {
      setShowCreateSiteModal(true);
    }
  }, [isCreatingSite, drawnGeometry]);

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
  // ✅ Handle import success
  const handleImportSuccess = (result: ImportExecuteResponse) => {
    showToast(`${result.summary.created} objet(s) importé(s) avec succès!`, 'success');
    setShowImportWizard(false);
    // Trigger a refresh of map data
    window.dispatchEvent(new CustomEvent('refresh-map-data'));
  };

  // ✅ Handle site carousel events
  const handleSiteHover = (siteId: string | null) => {
    // TODO: Highlight site on map when hovered
    console.log('Site hover:', siteId);
  };

  const handleSiteSelect = (site: SiteFrontend) => {
    // Zoom to site location
    if (site.coordinates) {
      setTargetLocation({
        coordinates: site.coordinates,
        zoom: 17
      });
    }
    showToast(`Site "${site.name}" sélectionné`, 'info');
  };

  const handleViewSite = (site: SiteFrontend) => {
    navigate(`/sites/${site.id}`);
  };

  const handleCreateSite = () => {
    // Start polygon drawing mode directly
    setIsCreatingSite(true);
    setDrawingMode('polygon');
    showToast('Dessinez le contour du site sur la carte', 'info');
  };

  // ✅ Handle site creation success
  const handleSiteCreated = (newSite: SiteFrontend) => {
    // Add the new site to the list
    setSites(prev => [...prev, newSite]);
    // Reset state
    setIsCreatingSite(false);
    setShowCreateSiteModal(false);
    clearDrawnGeometry();
    // Invalidate cache by forcing refresh next time
    fetchAllSites(true);
    // Trigger map refresh
    window.dispatchEvent(new CustomEvent('refresh-map-data'));
  };

  // ✅ Handle site creation modal close
  const handleCreateSiteModalClose = () => {
    setShowCreateSiteModal(false);
    setIsCreatingSite(false);
    clearDrawnGeometry();
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
        onReportProblem={handleReportProblem}
        isReportingProblem={isReportingProblem}
        reportDrawingMode={reportDrawingMode}
        onStartReportDrawing={handleStartReportDrawing}
        onCancelReporting={handleCancelReporting}
      />

      {/* 3. Selection Panel */}
      <SelectionPanel
        userRole={userRole}
        onCreateIntervention={async () => {
          // Load task data if needed
          if (typesTaches.length === 0) {
            await loadTaskData();
          }

          // Convert selected objects to the format expected by TaskFormModal
          const objectsForModal: InventoryObjectOption[] = selectedObjects.map(obj => {
            const superficieStr = obj.attributes?.['superficie_calculee']
              || obj.attributes?.['Surface (m²)']
              || obj.attributes?.['area_sqm'];
            const superficie = superficieStr ? parseFloat(superficieStr) : undefined;

            return {
              id: parseInt(obj.id, 10),
              type: obj.type,
              nom: obj.title || obj.type,
              site: obj.subtitle || '',
              soussite: obj.attributes?.sous_site_nom,
              superficie: !isNaN(superficie as number) ? superficie : undefined
            };
          });

          // Open modal directly instead of navigating
          setTaskPreSelectedObjects(objectsForModal);
          setTaskModalInitialValues({});
          setIsTaskModalOpen(true);
        }}
        onDeleteObjects={async () => {
          // Delete all selected objects
          let successCount = 0;
          let errorCount = 0;

          for (const obj of selectedObjects) {
            try {
              await deleteInventoryItem(obj.type, obj.id);
              successCount++;
            } catch (error) {
              logger.error(`Failed to delete ${obj.type} #${obj.id}:`, error);
              errorCount++;
            }
          }

          // Show result
          if (errorCount === 0) {
            showToast(`${successCount} objet${successCount > 1 ? 's supprimés' : ' supprimé'} avec succès`, 'success');
          } else {
            showToast(`${successCount} supprimé(s), ${errorCount} erreur(s)`, 'warning');
          }

          // Clear selection and refresh map
          window.dispatchEvent(new CustomEvent('refresh-map-data'));
        }}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* 4. Object Detail Card */}
      <MapObjectDetailCard
        selectedObject={selectedObject || null}
        onClose={onCloseObjectDetail}
        userRole={userRole}
        onViewCentreGest={() => {
          // Placeholder for future implementation
          console.log('View Centre Gest', selectedObject);
        }}
        onCreateTask={() => handleCreateTask(selectedObject || undefined)}
        onCreateReclamation={() => {
          if (selectedObject && (selectedObject.type === 'Site' || selectedObject.type === 'site')) {
            // Navigate to reclamations page with site pre-selected
            navigate('/reclamations', {
              state: {
                createFromSite: true,
                siteId: selectedObject.id,
                siteName: selectedObject.title
              }
            });
          }
        }}
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
        overlays={overlays}
        onToggleOverlay={onToggleOverlay}
      />

      {/* 5. Zoom Controls Component */}
      <MapZoomControls
        onZoomIn={onZoomIn}
        onZoomOut={handleZoomOutClick}
        isSidebarCollapsed={isSidebarCollapsed}
        isCarouselOpen={isCarouselOpen}
      />

      {/* 6. Object Type Selector Modal */}
      {showTypeSelector && drawnGeometry && !isReportingProblem && (
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

      {/* 10. Create Site Modal */}
      <CreateSiteModal
        isOpen={showCreateSiteModal}
        onClose={handleCreateSiteModalClose}
        onSuccess={handleSiteCreated}
        geometry={drawnGeometry as any}
        metrics={calculatedMetrics}
      />

      {/* 11. Site Carousel */}
      <SiteCarousel
        sites={sites}
        isLoading={sitesLoading}
        isSidebarCollapsed={isSidebarCollapsed}
        onSiteHover={handleSiteHover}
        onSiteSelect={handleSiteSelect}
        onViewSite={handleViewSite}
        onCreateSite={handleCreateSite}
        onEditSite={setEditingSite}
        onToggle={setIsCarouselOpen}
      />

      {/* 12. Site Edit Modal */}
      {editingSite && (
        <SiteEditModal
          site={editingSite}
          isOpen={!!editingSite}
          onClose={() => setEditingSite(null)}
          onSaved={(updatedSite) => {
            setSites(prev => prev.map(s => s.id === updatedSite.id ? updatedSite : s));
            fetchAllSites(true); // Refresh cache
            window.dispatchEvent(new CustomEvent('refresh-map-data')); // Refresh map
          }}
        />
      )}

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
      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <TaskFormModal
          initialValues={taskModalInitialValues}
          preSelectedObjects={taskPreSelectedObjects}
          typesTaches={typesTaches}
          equipes={equipes}
          onClose={() => setIsTaskModalOpen(false)}
          onSubmit={handleTaskSubmit}
        />
      )}

      {/* Reclamation/Report Problem Modal */}
      {showReclamationModal && reportGeometry && (
        <ReclamationFormModal
          isOpen={showReclamationModal}
          onClose={() => {
            setShowReclamationModal(false);
            setReportGeometry(null);
            setIsReportingProblem(false);
            clearDrawnGeometry();
          }}
          onSuccess={handleReclamationSuccess}
          geometry={reportGeometry}
          types={typesReclamation}
          urgences={urgences}
        />
      )}
    </>
  );
};
