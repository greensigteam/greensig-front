import { useState, useRef, useEffect, lazy, Suspense, useCallback } from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, prefetchCriticalData } from './lib/queryClient';
import Layout from './components/Layout';
import Login from './pages/Login';
import LoadingScreen from './components/LoadingScreen';
import Dashboard from './pages/Dashboard';

// Lazy load heavy pages for better initial bundle size
const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })));
const OLMap = lazy(() => import('./components/OLMap').then((m) => ({ default: m.OLMap })));
const Inventory = lazy(() => import('./pages/Inventory'));
const InventoryDetailPage = lazy(() => import('./pages/InventoryDetailPage'));
const Reclamations = lazy(() => import('./pages/Reclamations'));
const ReclamationDetailPage = lazy(() => import('./pages/ReclamationDetailPage'));
const ReclamationsDashboard = lazy(() => import('./pages/ReclamationsDashboard'));
const Teams = lazy(() => import('./pages/Teams'));
const Planning = lazy(() => import('./pages/Planning'));
const RatiosProductivite = lazy(() => import('./pages/RatiosProductivite'));
const SuiviTaches = lazy(() => import('./pages/SuiviTaches'));
const Produits = lazy(() => import('./pages/Produits'));
const Reporting = lazy(() => import('./pages/Reporting'));
const MonthlyReport = lazy(() => import('./pages/MonthlyReport'));
const WeeklyReport = lazy(() => import('./pages/WeeklyReport'));
const Users = lazy(() => import('./pages/Users'));
const Parametres = lazy(() => import('./pages/Parametres'));
const Sites = lazy(() => import('./pages/Sites'));
const SiteDetailPage = lazy(() => import('./pages/SiteDetailPage'));
const Clients = lazy(() => import('./pages/Clients'));
const StructureDetailPage = lazy(() => import('./pages/StructureDetailPage'));
const ClientUserDetailPage = lazy(() => import('./pages/ClientUserDetailPage'));
const OperateurDetailPage = lazy(() => import('./pages/OperateurDetailPage'));
const Notifications = lazy(() => import('./pages/Notifications'));

import {
  User,
  Role,
  MapLayerType,
  OverlayState,
  MapObjectDetail,
  UserLocation,
  Measurement,
  MeasurementType,
} from './types';
import { MAP_LAYERS } from './constants';
import {
  hasExistingToken,
  fetchCurrentUser,
  updateInventoryItem,
  deleteInventoryItem,
  clearAuthTokens,
} from './services/api';
import { GeoJSONGeometry } from './types';
import { MapProvider } from './contexts/MapContext';
import { ToastProvider } from './contexts/ToastContext';
import { ExportProvider } from './contexts/ExportContext';
import { SelectionProvider } from './contexts/SelectionContext';
import { DrawingProvider } from './contexts/DrawingContext';
import { SearchProvider } from './contexts/SearchContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppStateContext, { useAppState, AppStateContextValue } from './contexts/AppStateContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ApiErrorListener } from './components/ApiErrorListener';
import logger from './services/logger';
import ConfirmDeleteModal from './components/modals/ConfirmDeleteModal';

const PageLoadingFallback = () => (
  <div className="fixed inset-0 z-50">
    <LoadingScreen isLoading={true} loop={true} minDuration={0} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Module-level route components
// Defined outside App so the router object is never recreated.
// Dynamic state is read from AppStateContext at render time.
// ─────────────────────────────────────────────────────────────────────────────

const AppIndexRoute: React.FC = () => {
  const { user } = useAppState();
  return <Navigate to={user.role === 'CLIENT' ? '/client/map' : '/dashboard'} replace />;
};

const AppRequireRole: React.FC<{ roles: string[]; children: React.ReactNode }> = ({
  roles,
  children,
}) => {
  const { user } = useAppState();
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Wrapper for pages that still receive user as a prop
const AppInventoryRoute: React.FC = () => {
  const { user } = useAppState();
  return <Inventory user={user} />;
};

const AppNotificationsRoute: React.FC = () => {
  const { user } = useAppState();
  return <Notifications user={user} />;
};

// Root route: Layout + OLMap + MapPage reading everything from AppStateContext
const AppRootRoute: React.FC = () => {
  const {
    user,
    onLogout,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobile,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    mapRef,
    activeLayerId,
    targetLocation,
    userLocation,
    overlays,
    setOverlays,
    selectedMapObject,
    setSelectedMapObject,
    isRouting,
    setIsRouting,
    clusteringEnabled,
    setClusteringEnabled,
    isMeasuring,
    measurementType,
    measurements,
    currentMeasurement,
    handleMeasurementComplete,
    handleMeasurementUpdate,
    handleToggleMeasure,
    handleClearMeasurements,
    handleRemoveMeasurement,
    setActiveLayerId,
    setTargetLocation,
    setUserLocation,
    handleObjectModify,
    handleObjectDelete,
    executeObjectDelete,
    itemToDelete,
    setItemToDelete,
  } = useAppState();

  const handleToggleSidebar = useCallback(() => {
    if (isMobile) setIsMobileSidebarOpen((v) => !v);
    else setIsSidebarCollapsed((v) => !v);
  }, [isMobile, setIsMobileSidebarOpen, setIsSidebarCollapsed]);

  const toggleOverlay = useCallback(
    (key: keyof OverlayState) => {
      setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [setOverlays],
  );

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) mapRef.current.zoomIn();
  }, [mapRef]);
  const handleZoomOut = useCallback(() => {
    if (mapRef.current) mapRef.current.zoomOut();
  }, [mapRef]);
  const getCurrentZoom = useCallback(() => mapRef.current?.getZoom() ?? 6, [mapRef]);
  const getMapCenter = useCallback(() => mapRef.current?.getCenter() ?? null, [mapRef]);
  const getMapElement = useCallback(() => mapRef.current?.getMapElement() ?? null, [mapRef]);
  const exportMapCanvas = useCallback(
    async (): Promise<string | null> => mapRef.current?.exportCanvas() ?? null,
    [mapRef],
  );

  return (
    <>
      <ErrorBoundary>
        <ExportProvider>
          <Layout
            user={user}
            onLogout={onLogout}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
            isMobile={isMobile}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
            mapComponent={
              <Suspense fallback={null}>
                <OLMap
                  activeLayer={MAP_LAYERS[activeLayerId]}
                  targetLocation={targetLocation}
                  userLocation={userLocation}
                  searchResult={null}
                  ref={mapRef}
                  overlays={overlays}
                  onObjectClick={setSelectedMapObject}
                  isRouting={isRouting}
                  isSidebarCollapsed={isSidebarCollapsed}
                  clusteringEnabled={clusteringEnabled}
                  isMeasuring={isMeasuring}
                  measurementType={measurementType}
                  onMeasurementComplete={handleMeasurementComplete}
                  onMeasurementUpdate={handleMeasurementUpdate}
                  onObjectModify={handleObjectModify}
                  onObjectDelete={handleObjectDelete}
                />
              </Suspense>
            }
            mapControls={
              <Suspense fallback={null}>
                <MapPage
                  activeLayerId={activeLayerId}
                  setActiveLayerId={setActiveLayerId}
                  setTargetLocation={setTargetLocation}
                  setUserLocation={setUserLocation}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  getCurrentZoom={getCurrentZoom}
                  getMapCenter={getMapCenter}
                  getMapElement={getMapElement}
                  exportMapCanvas={exportMapCanvas}
                  isPanelOpen={true}
                  onToggleMap={() => {}}
                  overlays={overlays}
                  onToggleOverlay={toggleOverlay}
                  selectedObject={selectedMapObject}
                  onCloseObjectDetail={() => setSelectedMapObject(null)}
                  isSidebarCollapsed={isSidebarCollapsed}
                  isRouting={isRouting}
                  setIsRouting={setIsRouting}
                  clusteringEnabled={clusteringEnabled}
                  setClusteringEnabled={setClusteringEnabled}
                  isMeasuring={isMeasuring}
                  measurementType={measurementType}
                  onToggleMeasure={handleToggleMeasure}
                  measurements={measurements}
                  currentMeasurement={currentMeasurement}
                  onClearMeasurements={handleClearMeasurements}
                  onRemoveMeasurement={handleRemoveMeasurement}
                  userRole={user.role}
                />
              </Suspense>
            }
            children={null}
          />
        </ExportProvider>
      </ErrorBoundary>
      {itemToDelete && (
        <ConfirmDeleteModal
          title="Supprimer l'objet ?"
          message={`Êtes-vous sûr de vouloir supprimer cet objet (${itemToDelete.type} #${itemToDelete.id}) ? Cette action est irréversible.`}
          onConfirm={executeObjectDelete}
          onCancel={() => setItemToDelete(null)}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Static data router — defined once at module level.
// Route elements are React components; they read dynamic state from context.
// This enables useBlocker (ExportContext) and ScrollRestoration (Layout).
// ─────────────────────────────────────────────────────────────────────────────
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<AppRootRoute />}>
      <Route index element={<AppIndexRoute />} />
      <Route
        path="dashboard"
        element={
          <AppRequireRole roles={['ADMIN', 'SUPERVISEUR']}>
            <Dashboard />
          </AppRequireRole>
        }
      />
      <Route
        path="inventory"
        element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AppInventoryRoute />
          </Suspense>
        }
      />
      <Route
        path="inventory/:objectType/:objectId"
        element={
          <Suspense fallback={<PageLoadingFallback />}>
            <InventoryDetailPage />
          </Suspense>
        }
      />
      <Route
        path="sites"
        element={
          <AppRequireRole roles={['ADMIN', 'SUPERVISEUR']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <Sites />
            </Suspense>
          </AppRequireRole>
        }
      />
      <Route
        path="sites/:id"
        element={
          <AppRequireRole roles={['ADMIN', 'SUPERVISEUR', 'CLIENT']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <SiteDetailPage />
            </Suspense>
          </AppRequireRole>
        }
      />
      <Route
        path="clients"
        element={
          <AppRequireRole roles={['ADMIN']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <Clients />
            </Suspense>
          </AppRequireRole>
        }
      />
      <Route
        path="structures/:id"
        element={
          <AppRequireRole roles={['ADMIN']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <StructureDetailPage />
            </Suspense>
          </AppRequireRole>
        }
      />
      <Route
        path="structures/:structureId/utilisateurs/:userId"
        element={
          <AppRequireRole roles={['ADMIN']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <ClientUserDetailPage />
            </Suspense>
          </AppRequireRole>
        }
      />
      <Route path="interventions" element={<Navigate to="/reclamations" replace />} />
      <Route
        path="reclamations"
        element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Reclamations />
          </Suspense>
        }
      />
      <Route
        path="reclamations/:id"
        element={
          <Suspense fallback={<PageLoadingFallback />}>
            <ReclamationDetailPage />
          </Suspense>
        }
      />
      <Route
        path="reclamations/stats"
        element={
          <Suspense fallback={<PageLoadingFallback />}>
            <ReclamationsDashboard />
          </Suspense>
        }
      />
      <Route
        path="teams"
        element={
          <AppRequireRole roles={['ADMIN', 'SUPERVISEUR', 'CLIENT']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <Teams />
            </Suspense>
          </AppRequireRole>
        }
      />
      <Route
        path="users"
        element={
          <AppRequireRole roles={['ADMIN']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <Users />
            </Suspense>
          </AppRequireRole>
        }
      />
      <Route
        path="operateurs/:id"
        element={
          <AppRequireRole roles={['ADMIN']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <OperateurDetailPage />
            </Suspense>
          </AppRequireRole>
        }
      />
      <Route
        path="planning"
        element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Planning />
          </Suspense>
        }
      />
      <Route
        path="ratios"
        element={
          <Suspense fallback={<PageLoadingFallback />}>
            <RatiosProductivite />
          </Suspense>
        }
      />
      <Route
        path="suivi-taches"
        element={
          <Suspense fallback={<PageLoadingFallback />}>
            <SuiviTaches />
          </Suspense>
        }
      />
      <Route
        path="products"
        element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Produits />
          </Suspense>
        }
      />
      <Route
        path="reporting"
        element={
          <AppRequireRole roles={['ADMIN', 'SUPERVISEUR', 'CLIENT']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <Reporting />
            </Suspense>
          </AppRequireRole>
        }
      />
      <Route
        path="monthly-report"
        element={
          <AppRequireRole roles={['ADMIN']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <MonthlyReport />
            </Suspense>
          </AppRequireRole>
        }
      />
      <Route
        path="weekly-report"
        element={
          <AppRequireRole roles={['ADMIN']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <WeeklyReport />
            </Suspense>
          </AppRequireRole>
        }
      />
      <Route
        path="parametres"
        element={
          <AppRequireRole roles={['ADMIN']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <Parametres />
            </Suspense>
          </AppRequireRole>
        }
      />
      <Route
        path="notifications"
        element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AppNotificationsRoute />
          </Suspense>
        }
      />
      <Route path="client" element={<Navigate to="/client/map" replace />} />
      <Route path="client/map" element={null} />
      <Route path="map" element={null} />
    </Route>,
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// App — manages all application state, provides AppStateContext, renders router
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  // Si un token existe, pas besoin du LoadingScreen avec video
  const [showVideoLoading, setShowVideoLoading] = useState(!hasExistingToken());
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global Map State
  const [activeLayerId, setActiveLayerId] = useState<MapLayerType>(MapLayerType.SATELLITE);
  const [targetLocation, setTargetLocation] = useState<{
    coordinates: { lat: number; lng: number };
    zoom?: number;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const [overlays, setOverlays] = useState<OverlayState>({
    parcels: true,
    networks: false,
    greenSpaces: true,
    works: false,
    reclamations: true,
  });
  const [selectedMapObject, setSelectedMapObject] = useState<MapObjectDetail | null>(null);

  const [isRouting, setIsRouting] = useState(false);
  const [clusteringEnabled, setClusteringEnabled] = useState(false);

  // Measurement state
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementType, setMeasurementType] = useState<MeasurementType>('distance');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentMeasurement, setCurrentMeasurement] = useState<Measurement | null>(null);

  // Deletion modal state
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: string } | null>(null);

  const mapRef = useRef<any>(null);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsMobileSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userRaw = await fetchCurrentUser();

          let role: Role = 'CLIENT';
          if (Array.isArray(userRaw.roles) && userRaw.roles.length > 0) {
            const rolePriority: Role[] = ['ADMIN', 'SUPERVISEUR', 'CLIENT'];
            for (const priorityRole of rolePriority) {
              if (userRaw.roles.includes(priorityRole)) {
                role = priorityRole;
                break;
              }
            }
          }

          const user: User = {
            id: String(userRaw.id),
            name:
              userRaw.fullName ||
              `${userRaw.prenom || ''} ${userRaw.nom || ''}`.trim() ||
              userRaw.email,
            email: userRaw.email,
            role,
            avatar: undefined,
            superviseur_id: userRaw.superviseur_id ?? null,
            client_structure_id: userRaw.client_structure_id ?? null,
          };
          setUser(user);
          prefetchCriticalData();
        } catch (error) {
          console.error('Session restoration failed', error);
          clearAuthTokens();
        }
      }
      setIsRestoringSession(false);
    };

    checkSession();

    // Handle forced logout when refresh-token flow fails inside apiFetch.
    const handleAuthLogout = () => setUser(null);
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMeasuring) handleToggleMeasure(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMeasuring]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 350);
    }
  }, [isSidebarCollapsed]);

  const handleToggleMeasure = (active: boolean, type?: MeasurementType) => {
    setIsMeasuring(active);
    if (type) setMeasurementType(type);
    if (!active) setCurrentMeasurement(null);
  };
  const handleMeasurementComplete = (measurement: Measurement) => {
    if (!measurement || !measurement.id || !measurement.value) {
      logger.error('Invalid measurement data:', measurement);
      return;
    }
    setMeasurements((prev) => [...prev, measurement]);
    setCurrentMeasurement(null);
  };
  const handleMeasurementUpdate = (measurement: Measurement | null) => {
    setCurrentMeasurement(measurement);
  };
  const handleClearMeasurements = () => {
    setMeasurements([]);
    setCurrentMeasurement(null);
    if (mapRef.current) mapRef.current.clearMeasurements();
    else logger.warn('Map not initialized, cannot clear measurements from map');
  };
  const handleRemoveMeasurement = (id: string) => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  };

  const handleObjectModify = async (
    objectId: string,
    newGeometry: GeoJSONGeometry,
    objectType: string,
  ) => {
    try {
      await updateInventoryItem(objectType, objectId, { geometry: newGeometry });
      logger.info(`Object ${objectType} #${objectId} geometry updated successfully`);
      window.dispatchEvent(new CustomEvent('refresh-map-data'));
    } catch (error) {
      logger.error(`Failed to update object ${objectType} #${objectId}:`, error);
    }
  };

  const handleObjectDelete = (objectId: string, objectType: string) => {
    setItemToDelete({ id: objectId, type: objectType });
  };

  const executeObjectDelete = async () => {
    if (!itemToDelete) return;
    const { id: objectId, type: objectType } = itemToDelete;
    try {
      await deleteInventoryItem(objectType, objectId);
      logger.info(`Object ${objectType} #${objectId} deleted successfully`);
      if (selectedMapObject?.id === objectId) setSelectedMapObject(null);
      window.dispatchEvent(new CustomEvent('refresh-map-data'));
    } catch (error) {
      logger.error(`Failed to delete object ${objectId}:`, error);
    } finally {
      setItemToDelete(null);
    }
  };

  // ── Auth gates ──────────────────────────────────────────────────────────────
  if (isRestoringSession) {
    return <LoadingScreen isLoading={isRestoringSession} loop={true} minDuration={0} />;
  }
  if (!user) {
    if (showVideoLoading) {
      return (
        <LoadingScreen
          isLoading={false}
          loop={true}
          minDuration={1500}
          onLoadingComplete={() => setShowVideoLoading(false)}
        />
      );
    }
    return <Login onLogin={setUser} />;
  }

  // ── Context value ───────────────────────────────────────────────────────────
  const contextValue: AppStateContextValue = {
    user,
    onLogout: () => setUser(null),
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobile,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    mapRef,
    activeLayerId,
    setActiveLayerId,
    targetLocation,
    setTargetLocation,
    userLocation,
    setUserLocation,
    overlays,
    setOverlays,
    selectedMapObject,
    setSelectedMapObject,
    isRouting,
    setIsRouting,
    clusteringEnabled,
    setClusteringEnabled,
    isMeasuring,
    measurementType,
    measurements,
    currentMeasurement,
    handleToggleMeasure,
    handleMeasurementComplete,
    handleMeasurementUpdate,
    handleClearMeasurements,
    handleRemoveMeasurement,
    handleObjectModify,
    handleObjectDelete,
    executeObjectDelete,
    itemToDelete,
    setItemToDelete,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ApiErrorListener />
        <SelectionProvider maxSelections={100}>
          <DrawingProvider>
            <SearchProvider>
              <NotificationProvider user={user}>
                <MapProvider>
                  <AppStateContext.Provider value={contextValue}>
                    <RouterProvider router={router} />
                  </AppStateContext.Provider>
                </MapProvider>
              </NotificationProvider>
            </SearchProvider>
          </DrawingProvider>
        </SelectionProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
