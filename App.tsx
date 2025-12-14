import { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { MapPage } from './pages/MapPage';
import { OLMap } from './components/OLMap';
import Inventory from './pages/Inventory';
import InventoryDetailPage from './pages/InventoryDetailPage';
import Interventions from './pages/Interventions';
import Teams from './pages/Teams';
import Planning from './pages/Planning';
import Claims from './pages/Claims';
import Reporting from './pages/Reporting';
import ClientPortal from './pages/ClientPortal';
import Users from './pages/Users';
import LoadingScreen from './components/LoadingScreen';
import { User, ViewState, MapLayerType, Coordinates, OverlayState, MapObjectDetail, UserLocation, Measurement, MeasurementType } from './types';
import { MAP_LAYERS } from './constants';
import { MapSearchResult } from './types';
import { searchObjects } from './services/api';
import { useSearch, Site } from './hooks/useSearch';
import { useGeolocation } from './hooks/useGeolocation';
import { MapProvider } from './contexts/MapContext';
import { ToastProvider } from './contexts/ToastContext';
import { SelectionProvider } from './contexts/SelectionContext';
import ErrorBoundary from './components/ErrorBoundary';
import logger from './services/logger';

const EMPTY_SITES: Site[] = [];

function App() {
  // Si un token existe, pas besoin du LoadingScreen avec video
  const [showVideoLoading, setShowVideoLoading] = useState(!hasExistingToken());
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
    works: false
  });
  const [selectedMapObject, setSelectedMapObject] = useState<MapObjectDetail | null>(null);

  const [isRouting, setIsRouting] = useState(false);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);

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
                        />
                      }
                    >
                      {/* The Outlet from Layout will render these nested routes */}
                    </Layout>
                  }
                >
                  <Route index element={<Navigate to={user.role === 'CLIENT' ? '/client' : '/dashboard'} replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="inventory/:objectType/:objectId" element={<InventoryDetailPage />} />
                  <Route path="interventions" element={<Interventions />} />
                  <Route path="teams" element={<Teams />} />
                  <Route path="planning" element={<Planning />} />
                  <Route path="claims" element={<Claims />} />
                  <Route path="reporting" element={<Reporting />} />
                  <Route path="client" element={<ClientPortal user={user} />} />
                  {/* Add a /map route if you want a dedicated map view without the panel */}
                  <Route path="map" element={null} />
                </Route>
              </Routes>
            </MapProvider>
          </SelectionProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
export default App;
