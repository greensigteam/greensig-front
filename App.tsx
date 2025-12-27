import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import LoadingScreen from './components/LoadingScreen';
import Dashboard from './pages/Dashboard';

// Lazy load heavy pages for better initial bundle size
const MapPage = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const OLMap = lazy(() => import('./components/OLMap').then(m => ({ default: m.OLMap })));
const Inventory = lazy(() => import('./pages/Inventory'));
const InventoryDetailPage = lazy(() => import('./pages/InventoryDetailPage'));
const Reclamations = lazy(() => import('./pages/Reclamations'));
const ReclamationsDashboard = lazy(() => import('./pages/ReclamationsDashboard'));
const Teams = lazy(() => import('./pages/Teams'));
const Planning = lazy(() => import('./pages/Planning'));
const RatiosProductivite = lazy(() => import('./pages/RatiosProductivite'));
const SuiviTaches = lazy(() => import('./pages/SuiviTaches'));
const Produits = lazy(() => import('./pages/Produits'));
const Reporting = lazy(() => import('./pages/Reporting'));
const Users = lazy(() => import('./pages/Users'));
const Parametres = lazy(() => import('./pages/Parametres'));
const Sites = lazy(() => import('./pages/Sites'));
const SiteDetailPage = lazy(() => import('./pages/SiteDetailPage'));
const Clients = lazy(() => import('./pages/Clients'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'));
const OperateurDetailPage = lazy(() => import('./pages/OperateurDetailPage'));
import { User, MapLayerType, Coordinates, OverlayState, MapObjectDetail, UserLocation, Measurement, MeasurementType } from './types';
import { MAP_LAYERS } from './constants';
import { hasExistingToken, fetchCurrentUser, updateInventoryItem, deleteInventoryItem } from './services/api';
import { GeoJSONGeometry } from './types';
// import { useSearch, Site } from './hooks/useSearch'; // REMOVED: Using Context instead
import { useGeolocation } from './hooks/useGeolocation';
import { MapProvider } from './contexts/MapContext';
import { ToastProvider } from './contexts/ToastContext';
import { SelectionProvider } from './contexts/SelectionContext';
import { DrawingProvider } from './contexts/DrawingContext';
import { SearchProvider } from './contexts/SearchContext';
import ErrorBoundary from './components/ErrorBoundary';
import logger from './services/logger';

const PageLoadingFallback = () => (
  <div className="fixed inset-0 z-50">
    <LoadingScreen isLoading={true} loop={true} minDuration={0} />
  </div>
);

// Composant pour protéger les routes par rôle
const RequireRole = ({ user, roles, children }: { user: User, roles: string[], children: React.ReactNode }) => {
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};


function App() {
  // Si un token existe, pas besoin du LoadingScreen avec video
  const [showVideoLoading, setShowVideoLoading] = useState(!hasExistingToken());
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Global Map State
  const [activeLayerId, setActiveLayerId] = useState<MapLayerType>(MapLayerType.SATELLITE);
  const [targetLocation, setTargetLocation] = useState<{ coordinates: Coordinates; zoom?: number } | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const [overlays, setOverlays] = useState<OverlayState>({
    parcels: true,
    networks: false,
    greenSpaces: true,
    works: false,
    reclamations: true
  });
  const [selectedMapObject, setSelectedMapObject] = useState<MapObjectDetail | null>(null);

  const [isRouting, setIsRouting] = useState(false);
  const [clusteringEnabled, setClusteringEnabled] = useState(false);

  // Measurement state
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementType, setMeasurementType] = useState<MeasurementType>('distance');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentMeasurement, setCurrentMeasurement] = useState<Measurement | null>(null);

  const mapRef = useRef<any>(null);

  // REMOVED: useSearch hook call - state is now managed by SearchProvider

  useEffect(() => {
    console.log("GreenSIG Application v1.0.1 Mounted");

    // Restore session
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userRaw = await fetchCurrentUser();

          // Determine role with priority: ADMIN > SUPERVISEUR > CLIENT
          let role: any = 'CLIENT';
          if (Array.isArray(userRaw.roles) && userRaw.roles.length > 0) {
            // Priority order for role selection
            const rolePriority = ['ADMIN', 'SUPERVISEUR', 'CLIENT'];
            for (const priorityRole of rolePriority) {
              if (userRaw.roles.includes(priorityRole)) {
                role = priorityRole;
                break;
              }
            }
          } else if (userRaw.type_utilisateur) {
            role = userRaw.type_utilisateur;
          }

          const user: User = {
            id: userRaw.id,
            name: userRaw.full_name || `${userRaw.prenom || ''} ${userRaw.nom || ''}`.trim() || userRaw.email,
            email: userRaw.email,
            role: role,
            avatar: undefined
          };
          setUser(user);
        } catch (error) {
          console.error("Session restoration failed", error);
          localStorage.removeItem('token');
        }
      }
      setIsRestoringSession(false);
    };

    checkSession();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMeasuring) {
        handleToggleMeasure(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMeasuring]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 350);
    }
  }, [isSidebarCollapsed]);

  const handleZoomIn = () => { if (mapRef.current) mapRef.current.zoomIn(); };
  const handleZoomOut = () => { if (mapRef.current) mapRef.current.zoomOut(); };
  const getCurrentZoom = () => { if (mapRef.current) return mapRef.current.getZoom(); return 6; };
  const getMapCenter = () => { if (mapRef.current) return mapRef.current.getCenter(); return null; };
  const getMapElement = () => { if (mapRef.current) return mapRef.current.getMapElement(); return null; };
  const exportMapCanvas = async (): Promise<string | null> => { if (mapRef.current) return mapRef.current.exportCanvas(); return null; };
  const toggleOverlay = (key: keyof OverlayState) => { setOverlays(prev => ({ ...prev, [key]: !prev[key] })); };

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
    setMeasurements(prev => [...prev, measurement]);
    setCurrentMeasurement(null);
  };
  const handleMeasurementUpdate = (measurement: Measurement | null) => { setCurrentMeasurement(measurement); };
  const handleClearMeasurements = () => {
    setMeasurements([]);
    setCurrentMeasurement(null);
    if (mapRef.current) mapRef.current.clearMeasurements();
    else logger.warn('Map not initialized, cannot clear measurements from map');
  };
  const handleRemoveMeasurement = (id: string) => { setMeasurements(prev => prev.filter(m => m.id !== id)); };

  // ========== HANDLERS FOR OBJECT MODIFICATION/DELETION ==========
  const handleObjectModify = async (objectId: string, newGeometry: GeoJSONGeometry, objectType: string) => {
    try {
      await updateInventoryItem(objectType, objectId, {
        geometry: newGeometry
      });

      logger.info(`Object ${objectType} #${objectId} geometry updated successfully`);
      // Trigger map data refresh
      window.dispatchEvent(new CustomEvent('refresh-map-data'));
    } catch (error) {
      logger.error(`Failed to update object ${objectType} #${objectId}:`, error);
      // TODO: Show error toast
    }
  };

  const handleObjectDelete = async (objectId: string, objectType: string) => {
    // Ask for confirmation
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer cet objet (${objectType} #${objectId}) ?`)) {
      return;
    }

    try {
      await deleteInventoryItem(objectType, objectId);

      logger.info(`Object ${objectType} #${objectId} deleted successfully`);
      // Clear selection if this object was selected
      if (selectedMapObject?.id === objectId) {
        setSelectedMapObject(null);
      }
      // Trigger map data refresh
      window.dispatchEvent(new CustomEvent('refresh-map-data'));
    } catch (error) {
      logger.error(`Failed to delete object ${objectId}:`, error);
      // TODO: Show error toast
    }
  };

  // Gestion du chargement:
  // - Afficher la vidéo en boucle pendant le chargement (nouvelle visite ou refresh)
  if (isRestoringSession) {
    // Afficher la vidéo en boucle - elle s'arrêtera automatiquement quand isRestoringSession passe à false
    return <LoadingScreen isLoading={isRestoringSession} loop={true} minDuration={0} />;
  }

  // Si pas de token après vérification, afficher la vidéo puis le login
  if (!user) {
    if (showVideoLoading) {
      return <LoadingScreen isLoading={false} loop={true} minDuration={1500} onLoadingComplete={() => setShowVideoLoading(false)} />;
    }
    return <Login onLogin={setUser} />;
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <SelectionProvider maxSelections={100}>
            <DrawingProvider>
              <SearchProvider>
                <MapProvider>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <Layout
                          user={user}
                          onLogout={() => setUser(null)}
                          isSidebarCollapsed={isSidebarCollapsed}
                          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                          // REMOVED: Search props are no longer passed to Layout
                          mapComponent={
                            <OLMap
                              activeLayer={MAP_LAYERS[activeLayerId]}
                              targetLocation={targetLocation}
                              userLocation={userLocation}
                              // searchResult is now handled via context in MapPage, but OLMap might still need it if it doesn't use context
                              // For now, we pass null or handle it inside OLMap if updated
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
                          }
                          mapControls={
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
                              isPanelOpen={true} // Simplified, can be derived from location
                              onToggleMap={() => { }} // Will be handled by routing
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
                              userRole={user?.role}
                            />
                          }
                          children={null}
                        >
                          {/* The Outlet from Layout will render these nested routes */}
                        </Layout>
                      }
                    >
                      <Route index element={<Navigate to={user.role === 'CLIENT' ? '/client/map' : '/dashboard'} replace />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="inventory" element={<Suspense fallback={<PageLoadingFallback />}><Inventory /></Suspense>} />
                      <Route path="inventory/:objectType/:objectId" element={<Suspense fallback={<PageLoadingFallback />}><InventoryDetailPage /></Suspense>} />
                      <Route path="sites" element={<Suspense fallback={<PageLoadingFallback />}><Sites /></Suspense>} />
                      <Route path="sites/:id" element={<Suspense fallback={<PageLoadingFallback />}><SiteDetailPage /></Suspense>} />
                      <Route path="clients" element={
                        <RequireRole user={user} roles={['ADMIN']}>
                          <Suspense fallback={<PageLoadingFallback />}><Clients /></Suspense>
                        </RequireRole>
                      } />
                      <Route path="clients/:id" element={
                        <RequireRole user={user} roles={['ADMIN']}>
                          <Suspense fallback={<PageLoadingFallback />}><ClientDetailPage /></Suspense>
                        </RequireRole>
                      } />
                      <Route path="interventions" element={<Navigate to="/reclamations" replace />} />
                      <Route path="reclamations" element={<Suspense fallback={<PageLoadingFallback />}><Reclamations /></Suspense>} />
                      <Route path="reclamations/stats" element={<Suspense fallback={<PageLoadingFallback />}><ReclamationsDashboard /></Suspense>} />
                      <Route path="teams" element={<Suspense fallback={<PageLoadingFallback />}><Teams /></Suspense>} />
                      <Route path="users" element={
                        <RequireRole user={user} roles={['ADMIN']}>
                          <Suspense fallback={<PageLoadingFallback />}><Users /></Suspense>
                        </RequireRole>
                      } />
                      <Route path="operateurs/:id" element={
                        <RequireRole user={user} roles={['ADMIN']}>
                          <Suspense fallback={<PageLoadingFallback />}><OperateurDetailPage /></Suspense>
                        </RequireRole>
                      } />

                      <Route path="planning" element={<Suspense fallback={<PageLoadingFallback />}><Planning /></Suspense>} />
                      <Route path="ratios" element={<Suspense fallback={<PageLoadingFallback />}><RatiosProductivite /></Suspense>} />
                      <Route path="claims" element={<Suspense fallback={<PageLoadingFallback />}><SuiviTaches /></Suspense>} />
                      <Route path="products" element={<Suspense fallback={<PageLoadingFallback />}><Produits /></Suspense>} />
                      <Route path="reporting" element={<Suspense fallback={<PageLoadingFallback />}><Reporting /></Suspense>} />
                      <Route path="parametres" element={
                        <RequireRole user={user} roles={['ADMIN']}>
                          <Suspense fallback={<PageLoadingFallback />}><Parametres /></Suspense>
                        </RequireRole>
                      } />
                      <Route path="client" element={<Navigate to="/client/map" replace />} />
                      <Route path="client/map" element={null} />
                      {/* Add a /map route if you want a dedicated map view without the panel */}
                      <Route path="map" element={null} />
                    </Route>
                  </Routes>
                </MapProvider>
              </SearchProvider>
            </DrawingProvider>
          </SelectionProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
export default App;
