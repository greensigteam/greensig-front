import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { MapPage } from './pages/MapPage';
import { MapView } from './components/MapView';
import Inventory from './pages/Inventory';
import Interventions from './pages/Interventions';
import Teams from './pages/Teams';
import Planning from './pages/Planning';
import Claims from './pages/Claims';
import Reporting from './pages/Reporting';
import ClientPortal from './pages/ClientPortal';
import LoadingScreen from './components/LoadingScreen';
import { User, ViewState, MapLayerType, Coordinates, OverlayState, MapObjectDetail } from './types';
import { MAP_LAYERS } from './constants';
import { MapSearchResult } from './types';
import { searchObjects } from './services/api';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [lastNonMapView, setLastNonMapView] = useState<ViewState>('DASHBOARD');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Global Map State
  const [activeLayerId, setActiveLayerId] = useState<MapLayerType>(MapLayerType.PLAN);
  const [targetLocation, setTargetLocation] = useState<{ coordinates: Coordinates; zoom?: number } | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  const [overlays, setOverlays] = useState<OverlayState>({
    parcels: true,
    networks: false,
    greenSpaces: true,
    works: false
  });
  const [selectedMapObject, setSelectedMapObject] = useState<MapObjectDetail | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<Coordinates[]>([]);
  const [isRouting, setIsRouting] = useState(false);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);

  const mapRef = useRef<any>(null);

  // Search State (Lifted from MapPage)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<MapSearchResult | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);

  // Debounced search for suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchSuggestions([]);
        return;
      }

      try {
        const results = await searchObjects(searchQuery.trim());
        setSearchSuggestions(results.slice(0, 5)); // Limiter à 5 suggestions
      } catch (error) {
        console.error('Erreur suggestions:', error);
        setSearchSuggestions([]);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300); // Debounce 300ms
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResult(null);

    try {
      // 1. Recherche prioritaire dans l'API Django backend
      const results = await searchObjects(searchQuery.trim());

      if (results && results.length > 0) {
        const firstResult = results[0];

        // Extraire les coordonnées du résultat
        let coords: Coordinates;
        if (firstResult.location && firstResult.location.type === 'Point') {
          const [lng, lat] = firstResult.location.coordinates;
          coords = { lat, lng };
        } else {
          // Si pas de localisation, utiliser une position par défaut (Maroc)
          coords = { lat: 32.219, lng: -7.934 };
        }

        const result: MapSearchResult = {
          name: firstResult.name,
          description: `${firstResult.type} - ID: ${firstResult.id}`,
          coordinates: coords,
          zoom: 18
        };

        setSearchResult(result);
        setTargetLocation({ coordinates: coords, zoom: 18 });
        setIsSearching(false);
        return;
      }

      // 2. Fallback to Nominatim external search si aucun résultat backend
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data && data.length > 0) {
        const resultData = data[0];
        const coords = { lat: parseFloat(resultData.lat), lng: parseFloat(resultData.lon) };
        const result: MapSearchResult = {
          name: resultData.display_name,
          description: `Résultat externe (${resultData.type})`,
          coordinates: coords,
          zoom: 16
        };
        setSearchResult(result);
        setTargetLocation({ coordinates: coords, zoom: 16 });
      } else {
        alert("Aucun résultat trouvé pour cette recherche.");
      }
    } catch (error) {
      console.error("Error during search:", error);
      alert("Une erreur est survenue lors de la recherche. Vérifiez votre connexion internet.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleGeolocation = () => {
    if (!('geolocation' in navigator)) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsSearching(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const coords = { lat: latitude, lng: longitude };

        const result: MapSearchResult = {
          name: "Ma position",
          description: `Localisation GPS (précision: ${accuracy.toFixed(0)}m)`,
          coordinates: coords,
          zoom: 18
        };

        setSearchResult(result);
        setUserLocation(coords);
        setTargetLocation({ coordinates: coords, zoom: 18 });
        setIsSearching(false);
      },
      (error) => {
        console.error('❌ Erreur de géolocalisation:', error);
        setIsSearching(false);
        alert("Impossible d'accéder à votre position GPS.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    console.log("GreenSIG Application v1.0.1 Mounted");
  }, []);

  // Update initial view based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'CLIENT') {
        setCurrentView('CLIENT_PORTAL');
        setLastNonMapView('CLIENT_PORTAL');
      } else {
        setCurrentView('DASHBOARD');
        setLastNonMapView('DASHBOARD');
      }
    }
  }, [user]);

  // Invalidate map size on view change (for panel animation)
  useEffect(() => {
    if (mapRef.current) {
      // Delay to allow panel animation to finish
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 350); // Corresponds to the transition duration-300 + a small buffer
    }
  }, [currentView, isSidebarCollapsed]);

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const getCurrentZoom = () => {
    if (mapRef.current) return mapRef.current.getZoom();
    return 6;
  };

  const toggleOverlay = (key: keyof OverlayState) => {
    setOverlays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNavigate = (view: ViewState) => {
    if (view !== 'MAP') {
      setLastNonMapView(view);
    }
    setCurrentView(view);
  };

  const toggleMapMode = () => {
    if (currentView === 'MAP') {
      setCurrentView(lastNonMapView);
    } else {
      setCurrentView('MAP');
    }
  };

  if (isLoading) {
    return <LoadingScreen onLoadingComplete={() => setIsLoading(false)} minDuration={3000} />;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const renderPanelContent = () => {
    switch (currentView) {
      case 'DASHBOARD': return <Dashboard />;
      case 'INVENTORY': return <Inventory />;
      case 'INTERVENTIONS': return <Interventions />;
      case 'TEAMS': return <Teams />;
      case 'PLANNING': return <Planning />;
      case 'CLAIMS': return <Claims />;
      case 'REPORTING': return <Reporting />;
      case 'CLIENT_PORTAL': return <ClientPortal user={user} />;
      case 'MAP': return null; // Map view has no side panel content
      default: return <Dashboard />;
    }
  };

  return (
    <Layout
      currentView={currentView}
      onNavigate={handleNavigate}
      user={user}
      onLogout={() => setUser(null)}
      isSidebarCollapsed={isSidebarCollapsed}
      onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}

      // Search Props
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
        <MapView
          activeLayer={MAP_LAYERS[activeLayerId]}
          targetLocation={targetLocation}
          userLocation={userLocation}
          mapRef={mapRef}
          overlays={overlays}
          onObjectClick={setSelectedMapObject}
          isMeasuring={isMeasuring}
          measurePoints={measurePoints}
          onMeasureClick={(coords) => setMeasurePoints([...measurePoints, coords])}
          isRouting={isRouting}
          isSidebarCollapsed={isSidebarCollapsed}
          clusteringEnabled={clusteringEnabled}
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
          isPanelOpen={currentView !== 'MAP'}
          onToggleMap={toggleMapMode}
          overlays={overlays}
          onToggleOverlay={toggleOverlay}
          selectedObject={selectedMapObject}
          onCloseObjectDetail={() => setSelectedMapObject(null)}
          isSidebarCollapsed={isSidebarCollapsed}
          isMeasuring={isMeasuring}
          onToggleMeasure={(active) => {
            setIsMeasuring(active);
            if (!active) setMeasurePoints([]);
          }}
          measurePoints={measurePoints}
          isRouting={isRouting}
          setIsRouting={setIsRouting}
          clusteringEnabled={clusteringEnabled}
          setClusteringEnabled={setClusteringEnabled}
        />
      }
    >
      {renderPanelContent()}
    </Layout>
  );
}

export default App;
