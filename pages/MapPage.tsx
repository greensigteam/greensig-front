import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MapLayerType,
  Coordinates,
  OverlayState,
  MapObjectDetail,
  Measurement,
  MeasurementType,
  User,
  Role,
} from '../types';
import {
  fetchAllSites,
  SiteFrontend,
  deleteInventoryItem,
  ImportExecuteResponse,
} from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useMapSearch } from '../hooks/useMapSearch';
import { useMapContext } from '../contexts/MapContext';
import { useToast } from '../contexts/ToastContext';
import { useSelection } from '../contexts/SelectionContext';
import { useDrawing } from '../contexts/DrawingContext';
import { usePermissions } from '../hooks/usePermissions';
import { useMapTaskManagement } from '../hooks/useMapTaskManagement';
import { useMapReportProblem } from '../hooks/useMapReportProblem';
import { useMapPdfExport } from '../hooks/useMapPdfExport';
import { createDefaultSymbology } from '../utils/symbology';
import logger from '../services/logger';

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
import ZoomWarningModal from '../components/map/ZoomWarningModal';

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
  isPanelOpen: _isPanelOpen = true,
  onToggleMap: _onToggleMap,
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
  userRole,
}) => {
  // ✅ USE MAP CONTEXT - Replaces window communication
  const mapContext = useMapContext();

  // ✅ USE TOAST - For user notifications
  const { showToast } = useToast();

  // ✅ USE NAVIGATE - For page navigation
  const navigate = useNavigate();

  // ✅ USE PERMISSIONS - Role-based access control
  const tempUser: User | null = userRole
    ? { id: '1', name: 'User', email: 'user@example.com', role: userRole as Role }
    : null;
  const permissions = usePermissions(tempUser);
  const location = useLocation();

  // ✅ USE SELECTION - For multi-object selection
  const {
    toggleSelectionMode,
    isSelectionMode,
    selectedObjects,
    getSelectedIds,
    addMultipleToSelection,
    setSelectionMode,
  } = useSelection();

  // ✅ USE DRAWING - For drawing/editing tools
  const {
    drawingMode: _drawingMode,
    setDrawingMode,
    editingMode: _editingMode,
    setEditingMode: _setEditingMode,
    isDrawing: _isDrawing,
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
  const [showCreateSiteModal, setShowCreateSiteModal] = useState(false);
  const [isCreatingSite, setIsCreatingSite] = useState(false);

  // Sites dynamiques chargés depuis l'API
  const [sites, setSites] = useState<SiteFrontend[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);

  // ✅ USE MAP SEARCH - Search with API + Nominatim fallback
  const {
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    showSuggestions,
    setShowSuggestions,
    isSearching,
    setIsSearching,
    searchResult,
    setGlobalSearchResult,
    searchContainerRef,
    handleSuggestionClick,
    handleSearch,
    setPlaceholder,
  } = useMapSearch({ setTargetLocation, sites });

  // ✅ Clear persistent drawing state on mount to prevent "white page" issues
  useEffect(() => {
    clearDrawnGeometry();
    setDrawingMode('none');
    setPendingObjectType(null);
    setPlaceholder('Rechercher un lieu, un site, un équipement...');
  }, []);
  const [isCarouselOpen, setIsCarouselOpen] = useState(true);
  const [editingSite, setEditingSite] = useState<SiteFrontend | null>(null);

  // États pour les onglets Filtres/Symbologie
  const [layersPanelTab, setLayersPanelTab] = useState<'layers' | 'filters'>('layers');
  const [symbologyConfig] = useState(createDefaultSymbology);

  // Task Creation (extracted hook)
  const {
    isTaskModalOpen,
    setIsTaskModalOpen,
    isSubmittingTask,
    taskModalInitialValues,
    setTaskModalInitialValues,
    taskPreSelectedObjects,
    setTaskPreSelectedObjects,
    taskSiteFilter,
    typesTaches,
    equipes,
    loadTaskData,
    handleCreateTask,
    handleTaskSubmit,
  } = useMapTaskManagement();

  // Report Problem / Reclamation (extracted hook)
  const {
    isReportingProblem,
    setIsReportingProblem,
    reportDrawingMode,
    reportGeometry,
    setReportGeometry,
    showReclamationModal,
    setShowReclamationModal,
    typesReclamation,
    urgences,
    handleReportProblem: hookHandleReportProblem,
    handleStartReportDrawing,
    handleCancelReporting,
    handleReclamationSuccess,
  } = useMapReportProblem();

  // PDF Export (extracted hook)
  const { isExporting, handleExportPDF } = useMapPdfExport({
    exportMapCanvas,
    getMapCenter,
    getCurrentZoom,
    sites,
    selectedObject,
  });

  // ========== HANDLE NAVIGATION FROM INVENTORY ==========
  useEffect(() => {
    const state = location.state as {
      highlightFromInventory?: boolean;
      selectedObjects?: any[];
    } | null;

    if (state?.highlightFromInventory && state?.selectedObjects?.length) {
      // Convert inventory objects to MapObjectDetail format
      const mapObjects: MapObjectDetail[] = state.selectedObjects.map((obj: any) => ({
        id: obj.id,
        type: obj.type,
        title: obj.title,
        subtitle: obj.subtitle || '',
        attributes: obj.attributes || {},
        geometry: obj.coordinates
          ? {
              type: 'Point' as const,
              coordinates: [obj.coordinates.lng, obj.coordinates.lat],
            }
          : undefined,
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
            zoom: coords.length === 1 ? 18 : 16,
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

  // Wrap hook's handleReportProblem to also close layers panel
  const handleReportProblem = useCallback(async () => {
    await hookHandleReportProblem();
    setShowLayers(false);
  }, [hookHandleReportProblem]);

  // ========== GEOLOCATION HOOK ==========
  const { requestGeolocation } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
    onSuccess: (result) => {
      setGlobalSearchResult({
        name: 'Ma position',
        description: `Localisation GPS (précision: ${result.accuracy.toFixed(0)}m)`,
        coordinates: result.coordinates,
        zoom: 18,
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
    },
  });

  // ========== HANDLERS ==========
  // ✅ Memoize to prevent MapSearchBar re-renders
  const handleGeolocation = useCallback(() => {
    setIsSearching(true);
    requestGeolocation();
  }, [requestGeolocation, setIsSearching]);

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
  const handleObjectCreated = (_objectData: any) => {
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
  const handleSiteHover = (_siteId: string | null) => {
    // TODO: Highlight site on map when hovered
  };

  const handleSiteSelect = (site: SiteFrontend) => {
    // Zoom to site location
    if (site.coordinates) {
      setTargetLocation({
        coordinates: site.coordinates,
        zoom: 17,
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
    setSites((prev) => [...prev, newSite]);
    // Reset state
    setIsCreatingSite(false);
    setShowCreateSiteModal(false);
    clearDrawnGeometry();
    // Invalidate cache by forcing refresh next time
    fetchAllSites();
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
      {/* 1. Search Bar Component - RE-ENABLED for Map View */}
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
        setSearchResult={setGlobalSearchResult}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* 2. Floating Tools Component (includes drawing tools) */}
      <MapFloatingTools
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
        currentUser={tempUser}
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
          const objectsForModal: InventoryObjectOption[] = selectedObjects.map((obj) => {
            const superficieStr =
              obj.attributes?.['superficie_calculee'] ||
              obj.attributes?.['Surface (m²)'] ||
              obj.attributes?.['area_sqm'];
            const superficie = superficieStr ? parseFloat(superficieStr) : undefined;

            return {
              id: parseInt(obj.id, 10),
              type: obj.type,
              nom: obj.title || obj.type,
              site: obj.subtitle || '',
              soussite: obj.attributes?.sous_site_nom,
              superficie: !isNaN(superficie as number) ? superficie : undefined,
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
            showToast(
              `${successCount} objet${successCount > 1 ? 's supprimés' : ' supprimé'} avec succès`,
              'success',
            );
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
        }}
        onCreateTask={() => handleCreateTask(selectedObject || undefined)}
        onCreateReclamation={() => {
          if (
            selectedObject &&
            (selectedObject.type === 'Site' || selectedObject.type === 'site')
          ) {
            // Navigate to reclamations page with site pre-selected
            navigate('/reclamations', {
              state: {
                createFromSite: true,
                siteId: selectedObject.id,
                siteName: selectedObject.title,
              },
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

      {/* 7. Create Object Modal - Only ADMIN and SUPERVISEUR can create */}
      {showCreateModal &&
        pendingObjectType &&
        drawnGeometry &&
        permissions.canCreateInventoryItem && (
          <CreateObjectModal
            isOpen={showCreateModal}
            onClose={handleCreateModalClose}
            objectType={pendingObjectType}
            geometry={drawnGeometry}
            metrics={calculatedMetrics}
            onSuccess={handleObjectCreated}
          />
        )}

      {/* 8. Import Wizard Modal - Only ADMIN and SUPERVISEUR can import */}
      {permissions.canImport && (
        <ImportWizard
          isOpen={showImportWizard}
          onClose={() => setShowImportWizard(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* 9. Export Panel Modal - ADMIN/SUPERVISEUR only */}
      {permissions.canExport && (
        <ExportPanel
          isOpen={showExportPanel}
          onClose={() => setShowExportPanel(false)}
          selectedType={selectedObjects.length > 0 ? selectedObjects[0]?.type : undefined}
          selectedIds={getSelectedIds()}
        />
      )}

      {/* 10. Create Site Modal */}
      <CreateSiteModal
        isOpen={showCreateSiteModal}
        onClose={handleCreateSiteModalClose}
        onSuccess={handleSiteCreated}
        geometry={drawnGeometry}
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
        // Only ADMIN can create sites, ADMIN and SUPERVISEUR can edit their sites
        onCreateSite={permissions.canCreateSite ? handleCreateSite : undefined}
        onEditSite={permissions.isAdmin || permissions.isSuperviseur ? setEditingSite : undefined}
        onToggle={setIsCarouselOpen}
      />

      {/* 12. Site Edit Modal */}
      {editingSite && (
        <SiteEditModal
          site={editingSite}
          isOpen={!!editingSite}
          onClose={() => setEditingSite(null)}
          onSaved={(updatedSite) => {
            setSites((prev) => prev.map((s) => (s.id === updatedSite.id ? updatedSite : s)));
            fetchAllSites(); // Refresh cache
            window.dispatchEvent(new CustomEvent('refresh-map-data')); // Refresh map
          }}
        />
      )}

      {showZoomWarning && (
        <ZoomWarningModal onCancel={() => setShowZoomWarning(false)} onConfirm={confirmZoomOut} />
      )}
      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <TaskFormModal
          initialValues={taskModalInitialValues}
          preSelectedObjects={taskPreSelectedObjects}
          siteFilter={taskSiteFilter}
          typesTaches={typesTaches}
          equipes={equipes}
          isSubmitting={isSubmittingTask}
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
          userRole={userRole}
        />
      )}
    </>
  );
};
