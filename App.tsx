import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { MapPage } from './pages/MapPage';
import { OLMap } from './components/OLMap';
import Inventory from './pages/Inventory';
import Interventions from './pages/Interventions';
import Teams from './pages/Teams';
import Planning from './pages/Planning';
import Claims from './pages/Claims';
import Reporting from './pages/Reporting';
import ClientPortal from './pages/ClientPortal';
import Users from './pages/Users';
import LoadingScreen from './components/LoadingScreen';
import { User, ViewState, MapLayerType, Coordinates, OverlayState, MapObjectDetail } from './types';
import { MAP_LAYERS } from './constants';
import { MapSearchResult } from './types';
import { searchObjects } from './services/api';
import { apiFetch, clearAuthTokens } from './services/apiFetch';

// Verifier si un token existe au chargement (avant le rendu)
const hasExistingToken = () => {
  return !!localStorage.getItem('token');
};

function App() {
  // Si un token existe, pas besoin du LoadingScreen avec video
  const [showVideoLoading, setShowVideoLoading] = useState(!hasExistingToken());
  const [user, setUser] = useState<User | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
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

  // Ecouter l'evenement de deconnexion automatique (session expiree)
  useEffect(() => {
    const handleAuthLogout = () => {
      console.log('Session expiree, deconnexion...');
      setUser(null);
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  // Restaurer la session utilisateur au chargement de la page
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setIsRestoringSession(false);
        return;
      }

      try {
        // Utiliser apiFetch qui gere automatiquement le refresh token
        const response = await apiFetch('/api/users/me/');

        if (response.ok) {
          const userRaw = await response.json();
          // Reconstruire l'objet user
          // Mappe le rôle pour correspondre aux valeurs attendues par le frontend

          const backendRole = Array.isArray(userRaw.roles) && userRaw.roles.length > 0
            ? userRaw.roles[0]
            : userRaw.type_utilisateur || 'CLIENT';
          const restoredUser: User = {
            id: userRaw.id,
            name: userRaw.full_name || `${userRaw.prenom} ${userRaw.nom}`,
            email: userRaw.email,
            role: backendRole,
            avatar: undefined
          };

          setUser(restoredUser);
          console.log('Session restauree pour:', restoredUser.name);
        } else {
          // Token invalide ou expiré, nettoyer les tokens
          console.log('Token invalide, suppression...');
          clearAuthTokens();
        }
      } catch (error) {
        console.error('Erreur restauration session:', error);
        clearAuthTokens();
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreSession();
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

  const getMapCenter = () => {
    if (mapRef.current) return mapRef.current.getCenter();
    return null;
  };

  const getMapElement = () => {
    if (mapRef.current) return mapRef.current.getMapElement();
    return null;
  };

  const exportMapCanvas = async (): Promise<string | null> => {
    if (mapRef.current) return mapRef.current.exportCanvas();
    return null;
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

  const renderPanelContent = () => {
    // Pour les clients, chaque vue du menu doit afficher l'onglet correspondant du portail client
    if (user.role === 'CLIENT') {
      switch (currentView) {
        case 'INVENTORY':
          return <ClientPortal user={user} forcedTab="inventory" />;
        case 'PLANNING':
          return <ClientPortal user={user} forcedTab="planning" />;
        case 'INTERVENTIONS':
          return <ClientPortal user={user} forcedTab="interventions" />;
        case 'CLAIMS':
          return <ClientPortal user={user} forcedTab="claims" />;
        default:
          return <ClientPortal user={user} forcedTab="inventory" />;
      }
    }
    // Pour les autres rôles, comportement inchangé
    switch (currentView) {
      case 'DASHBOARD': return <Dashboard />;
      case 'INVENTORY': return <Inventory />;
      case 'INTERVENTIONS': return <Interventions />;
      case 'TEAMS': return <Teams />;
      case 'PLANNING': return <Planning />;
      case 'CLAIMS': return <Claims />;
      case 'REPORTING': return <Reporting />;
      case 'USERS': return <Users />;
      case 'CLIENT_PORTAL': return <ClientPortal user={user} />;
      case 'MAP': return null;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout
      currentView={currentView}
      onNavigate={handleNavigate}
      user={user}
      onLogout={() => {
        clearAuthTokens();
        setUser(null);
      }}
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
        <OLMap
          activeLayer={MAP_LAYERS[activeLayerId]}
          targetLocation={targetLocation}
          userLocation={userLocation}
          ref={mapRef}
          overlays={overlays}
          onObjectClick={setSelectedMapObject}
          isMeasuring={isMeasuring}
          measurePoints={measurePoints}
          onMeasureClick={(coords: any) => setMeasurePoints([...measurePoints, coords])}
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
          getMapCenter={getMapCenter}
          getMapElement={getMapElement}
          exportMapCanvas={exportMapCanvas}
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
