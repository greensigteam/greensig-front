import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LoadingScreen from './components/LoadingScreen';

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
const Sites = lazy(() => import('./pages/Sites'));
const SiteDetailPage = lazy(() => import('./pages/SiteDetailPage'));
import { User, MapLayerType, Coordinates, OverlayState, MapObjectDetail, UserLocation, Measurement, MeasurementType } from './types';
import { MAP_LAYERS } from './constants';
import { MapSearchResult } from './types';
import { hasExistingToken, fetchCurrentUser, updateInventoryItem, deleteInventoryItem } from './services/api';
import { searchObjects } from './services/api';
import { GeoJSONGeometry } from './types';
import { useSearch, Site } from './hooks/useSearch';
import { useGeolocation } from './hooks/useGeolocation';
import { MapProvider } from './contexts/MapContext';
import { ToastProvider } from './contexts/ToastContext';
import { SelectionProvider } from './contexts/SelectionContext';
import { DrawingProvider } from './contexts/DrawingContext';
import ErrorBoundary from './components/ErrorBoundary';
import logger from './services/logger';

const EMPTY_SITES: Site[] = [];


const PageLoadingFallback = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent"></div>
      <p className="text-slate-500 text-sm">Chargement...</p>
    </div>
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

  const {
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    isSearching,
    setIsSearching,
    searchResult,
    setSearchResult
  } = useSearch({
    sites: EMPTY_SITES,
    debounceMs: 300,
    maxSuggestions: 5,
    minQueryLength: 2
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const results = await searchObjects(searchQuery.trim());
      if (results && results.length > 0) {
        const firstResult = results[0];
        if (!firstResult) return;
        let coords: Coordinates;
        if (firstResult.location && firstResult.location.type === 'Point') {
          const [lng, lat] = firstResult.location.coordinates;
          coords = { lat, lng };
        } else {
          coords = { lat: 32.219, lng: -7.934 };
        }
        const result: MapSearchResult = {
          name: firstResult.name,
          description: `${firstResult.type} - ID: ${firstResult.id}`,
          coordinates: coords,
          zoom: 18,
          objectId: firstResult.id,
          objectType: firstResult.type
        };
        setSearchResult(result);
        setTargetLocation({ coordinates: coords, zoom: 18 });
        setIsSearching(false);
        return;
      }
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const resultData = data[0];
        const coords = { lat: parseFloat(resultData.lat), lng: parseFloat(resultData.lon) };
        setSearchResult({
          name: resultData.display_name,
          description: `Résultat externe (${resultData.type})`,
          coordinates: coords,
          zoom: 16
        });
        setTargetLocation({ coordinates: coords, zoom: 16 });
      } else {
        alert("Aucun résultat trouvé pour cette recherche.");
      }
    } catch (error) {
      logger.error("Error during search:", error);
      alert("Une erreur est survenue lors de la recherche.");
    } finally {
      setIsSearching(false);
    }
  };

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
      setUserLocation({
        lat: result.coordinates.lat,
        lng: result.coordinates.lng,
        accuracy: result.accuracy
      });
      setTargetLocation({ coordinates: result.coordinates, zoom: 18 });
      setIsSearching(false);
    },
    onError: (error) => {
      setIsSearching(false);
      alert(error.message);
    }
  });

  const handleGeolocation = () => {
    setIsSearching(true);
    requestGeolocation();
  };

  useEffect(() => {
    console.log("GreenSIG Application v1.0.1 Mounted");

    // Restore session
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userRaw = await fetchCurrentUser();

          // Determine role with priority: ADMIN > CHEF_EQUIPE > OPERATEUR > CLIENT
          let role: any = 'CLIENT';
          if (Array.isArray(userRaw.roles) && userRaw.roles.length > 0) {
            // Priority order for role selection
            const rolePriority = ['ADMIN', 'CHEF_EQUIPE', 'OPERATEUR', 'CLIENT'];
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
  // - Si pas de token (nouvelle visite): LoadingScreen avec video
  // - Si token existe (refresh/retour): Simple spinner rapide
  if (isRestoringSession) {
    if (showVideoLoading) {
      // Premiere visite ou apres deconnexion: afficher la video
      return <LoadingScreen onLoadingComplete={() => setShowVideoLoading(false)} minDuration={3000} />;
    } else {
      // Session existante (refresh): afficher un spinner simple
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
            <p className="text-slate-600 text-sm">Restauration de la session...</p>
          </div>
        </div>
      );
    }
  }

  // Si pas de token apres verification, afficher d'abord la video puis le login
  if (!user) {
    if (showVideoLoading) {
      return <LoadingScreen onLoadingComplete={() => setShowVideoLoading(false)} minDuration={3000} />;
    }
    return <Login onLogin={setUser} />;
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <SelectionProvider maxSelections={100}>
            <DrawingProvider>
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
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        onSearch={handleSearch}
                        isSearching={isSearching}
                        searchResult={searchResult}
                        searchSuggestions={searchSuggestions}
                        onGeolocation={handleGeolocation}
                        setSearchResult={setSearchResult}
                        setTargetLocation={setTargetLocation}
                        mapComponent={
                          <OLMap
                            activeLayer={MAP_LAYERS[activeLayerId]}
                            targetLocation={targetLocation}
                            userLocation={userLocation}
                            searchResult={searchResult}
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
                    <Route path="interventions" element={<Navigate to="/reclamations" replace />} />
                    <Route path="reclamations" element={<Suspense fallback={<PageLoadingFallback />}><Reclamations /></Suspense>} />
                    <Route path="reclamations/stats" element={<Suspense fallback={<PageLoadingFallback />}><ReclamationsDashboard /></Suspense>} />
                    <Route path="teams" element={<Suspense fallback={<PageLoadingFallback />}><Teams /></Suspense>} />
                    <Route path="users" element={
                      <RequireRole user={user} roles={['ADMIN']}>
                        <Suspense fallback={<PageLoadingFallback />}><Users /></Suspense>
                      </RequireRole>
                    } />

                    <Route path="planning" element={<Suspense fallback={<PageLoadingFallback />}><Planning /></Suspense>} />
                    <Route path="ratios" element={<Suspense fallback={<PageLoadingFallback />}><RatiosProductivite /></Suspense>} />
                    <Route path="claims" element={<Suspense fallback={<PageLoadingFallback />}><SuiviTaches /></Suspense>} />
                    <Route path="products" element={<Suspense fallback={<PageLoadingFallback />}><Produits /></Suspense>} />
                    <Route path="reporting" element={<Suspense fallback={<PageLoadingFallback />}><Reporting /></Suspense>} />
                    <Route path="client" element={<Navigate to="/client/map" replace />} />
                    <Route path="client/map" element={null} />
                    {/* Add a /map route if you want a dedicated map view without the panel */}
                    <Route path="map" element={null} />
                  </Route>
                </Routes>
              </MapProvider>
            </DrawingProvider>
          </SelectionProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
export default App;
