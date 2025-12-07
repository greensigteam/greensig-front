import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  Search, Layers, Plus, Minus, Navigation, Crosshair, Filter,
  Loader2, Locate, Maximize2, LayoutTemplate, X,
  Map as MapIcon, Image as ImageIcon, Mountain,
  Grid, Zap, Trees, Hammer, Info, Eye, EyeOff, AlertTriangle,
  Ruler, Printer, Calendar as CalendarIcon, FileText,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, GitCommit
} from 'lucide-react';
import { MAP_LAYERS } from '../constants';
import { MapLayerType, Coordinates, MapSearchResult, OverlayState, MapObjectDetail } from '../types';
import { MOCK_SITES, MOCK_INVENTORY } from '../services/mockData';
import { SITES, Site } from '../data/sites';
import { SitesLegend } from '../components/SitesLegend';
import { searchObjects, geoJSONToLatLng } from '../services/api';

interface MapPageProps {
  activeLayerId: MapLayerType;
  setActiveLayerId: (id: MapLayerType) => void;
  setTargetLocation: (loc: { coordinates: Coordinates; zoom?: number } | null) => void;
  setUserLocation?: (loc: Coordinates | null) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  getCurrentZoom: () => number;
  isPanelOpen?: boolean;
  onToggleMap?: () => void;
  overlays: OverlayState;
  onToggleOverlay: (key: keyof OverlayState) => void;
  selectedObject?: MapObjectDetail | null;
  onCloseObjectDetail?: () => void;
  isSidebarCollapsed: boolean;
  isMeasuring?: boolean;
  onToggleMeasure?: (active: boolean) => void;
  measurePoints?: Coordinates[];
  isRouting?: boolean;
  setIsRouting?: (isRouting: boolean) => void;
  clusteringEnabled?: boolean;
  setClusteringEnabled?: (enabled: boolean) => void;
}

export const MapPage: React.FC<MapPageProps> = ({
  activeLayerId,
  setActiveLayerId,
  setTargetLocation,
  setUserLocation,
  onZoomIn,
  onZoomOut,
  getCurrentZoom,
  isPanelOpen = true,
  onToggleMap,
  overlays,
  onToggleOverlay,
  selectedObject,
  onCloseObjectDetail,
  isSidebarCollapsed,
  isMeasuring = false,
  onToggleMeasure,
  measurePoints = [],
  isRouting = false,
  setIsRouting,
  clusteringEnabled = true,
  setClusteringEnabled,
}) => {
  const [showLayers, setShowLayers] = useState(false);
  const [showZoomWarning, setShowZoomWarning] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [isSitesPanelOpen, setIsSitesPanelOpen] = useState(false);
  const [vegetationVisible, setVegetationVisible] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<MapSearchResult | null>(null);

  // Handler pour naviguer vers un site
  const handleSiteClick = (site: Site) => {
    setTargetLocation({ coordinates: site.coordinates, zoom: 17 });
    setSearchResult({
      name: site.name,
      description: site.description,
      coordinates: site.coordinates,
      zoom: 17
    });
  };

  // Local Search Implementation (User 1.1.6)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResult(null);

    // Simulate search delay for local search
    setTimeout(async () => {
      // Normalisation de la requête (minuscules, sans accents)
      const query = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // 1. Recherche prioritaire dans les 12 SITES (Nom, Description, Catégorie)
      const site = SITES.find(s => {
        const name = s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const desc = s.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cat = s.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        return name.includes(query) || desc.includes(query) || cat.includes(query);
      });

      if (site) {
        setSearchResult({
          name: site.name,
          description: `${site.category} - ${site.description}`,
          coordinates: site.coordinates,
          zoom: 18
        });
        setTargetLocation({ coordinates: site.coordinates, zoom: 18 });
        setIsSearching(false);
        return;
      }

      // 2. Recherche secondaire dans les MOCK_SITES (anciens)
      const mockSite = MOCK_SITES.find(s => s.name.toLowerCase().includes(query));
      if (mockSite) {
        setSearchResult({
          name: mockSite.name,
          description: `Site - ${mockSite.address}`,
          coordinates: mockSite.coordinates,
          zoom: 18
        });
        setTargetLocation({ coordinates: mockSite.coordinates, zoom: 18 });
        setIsSearching(false);
        return;
      }

      // 3. Recherche dans l'Inventaire (local mock - fallback)
      const item = MOCK_INVENTORY.find(i =>
        i.name.toLowerCase().includes(query) ||
        i.type.toLowerCase().includes(query)
      );

      if (item) {
        const parentSite = MOCK_SITES.find(s => s.id === item.siteId);
        const coords = parentSite ? {
          lat: parentSite.coordinates.lat + 0.0001,
          lng: parentSite.coordinates.lng + 0.0001
        } : { lat: 48.8566, lng: 2.3522 };

        setSearchResult({
          name: item.name,
          description: `Inventaire (${item.type}) - Code: ${item.code}`,
          coordinates: coords,
          zoom: 20
        });
        setTargetLocation({ coordinates: coords, zoom: 20 });
        setIsSearching(false);
        return;
      }

      // 4. Recherche API Django (Sites, SousSites, Arbres du backend)
      try {
        const apiResults = await searchObjects(searchQuery);
        if (apiResults && apiResults.length > 0) {
          const firstResult = apiResults[0];
          if (firstResult.location) {
            const coords = geoJSONToLatLng(firstResult.location.coordinates);
            setSearchResult({
              name: firstResult.name,
              description: `${firstResult.type} (Backend)`,
              coordinates: coords,
              zoom: 18
            });
            setTargetLocation({ coordinates: coords, zoom: 18 });
            setIsSearching(false);
            return;
          }
        }
      } catch (error) {
        console.error('Erreur recherche API Django:', error);
        // Continue vers Nominatim si l'API échoue
      }

      // 5. Fallback to Nominatim external search
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
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
        console.error("Error during Nominatim search:", error);
        alert("Une erreur est survenue lors de la recherche externe. Vérifiez votre connexion internet.");
      } finally {
        setIsSearching(false);
      }
    }, 250); // Reduced delay
  };

  const handleGeolocation = () => {
    if (!('geolocation' in navigator)) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    console.log('🌍 Demande de géolocalisation initiée...');
    setIsSearching(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;
        const timestamp = new Date(position.timestamp).toLocaleString();

        console.log('✅ Position GPS obtenue:', {
          latitude,
          longitude,
          accuracy: `${accuracy.toFixed(2)} mètres`,
          altitude: altitude ? `${altitude.toFixed(2)} m` : 'N/A',
          altitudeAccuracy: altitudeAccuracy ? `${altitudeAccuracy.toFixed(2)} m` : 'N/A',
          heading: heading ? `${heading}°` : 'N/A',
          speed: speed ? `${speed} m/s` : 'N/A',
          timestamp
        });

        const coords = { lat: latitude, lng: longitude };

        console.log('📍 Coordonnées formatées:', coords);
        console.log('🔗 Lien Google Maps:', `https://www.google.com/maps?q=${latitude},${longitude}`);

        const result: MapSearchResult = {
          name: "Ma position",
          description: `Localisation GPS (précision: ${accuracy.toFixed(0)}m)`,
          coordinates: coords,
          zoom: 18
        };

        console.log('🎯 Résultat de recherche créé:', result);

        setSearchResult(result);
        if (setUserLocation) {
          console.log('📌 Mise à jour de userLocation');
          setUserLocation(coords);
        }
        console.log('🗺️ Mise à jour de targetLocation avec zoom 18');
        setTargetLocation({ coordinates: coords, zoom: 18 });
        setIsSearching(false);

        console.log('✨ Géolocalisation terminée avec succès');
      },
      (error) => {
        console.error('❌ Erreur de géolocalisation:', {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT
        });

        setIsSearching(false);

        let errorMessage = "Impossible d'accéder à votre position GPS.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Vous avez refusé l'accès à la géolocalisation. Veuillez autoriser l'accès dans les paramètres de votre navigateur.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Position GPS indisponible. Vérifiez que votre GPS est activé.";
            break;
          case error.TIMEOUT:
            errorMessage = "La demande de géolocalisation a expiré. Veuillez réessayer.";
            break;
        }

        console.log('⚠️ Message d\'erreur affiché:', errorMessage);
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    console.log('⏳ En attente de la réponse GPS (timeout: 15s, haute précision activée)...');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
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
      // Find the active element (likely the button) to blur it
      const btn = document.activeElement as HTMLElement;
      if (btn) btn.blur();

      const originalTitle = document.title;
      document.title = "Export en cours...";

      // We capture the body to get the full view including overlays
      const element = document.body;

      const canvas = await html2canvas(element, {
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const ratio = imgProps.width / imgProps.height;
      const width = pdfWidth;
      const height = width / ratio;

      const y = (pdfHeight - height) / 2;

      pdf.addImage(imgData, 'PNG', 0, Math.max(0, y), width, height);

      const date = new Date().toISOString().split('T')[0];
      pdf.save(`greensig_carte_${date}.pdf`);

      document.title = originalTitle;
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      alert("Une erreur est survenue lors de la génération du PDF.");
    }
  };

  const toggleMeasureTool = () => {
    onToggleMeasure?.(!isMeasuring);
    if (!isMeasuring) {
      alert("Mode mesure activé : Cliquez sur la carte pour placer des points (Simulation)");
    }
  };

  // Configuration de la légende dynamique
  const legendItems = [
    {
      key: 'greenSpaces',
      label: 'Espace Vert Public',
      renderIcon: () => <span className="w-3 h-3 rounded bg-emerald-500 shadow-sm ring-1 ring-black/5"></span>
    },
    {
      key: 'networks',
      label: 'Réseaux / Canalisations',
      renderIcon: () => <span className="w-3 h-3 rounded bg-blue-500 shadow-sm ring-1 ring-black/5"></span>
    },
    {
      key: 'works',
      label: 'Intervention en cours',
      renderIcon: () => <span className="w-3 h-3 rounded-full bg-orange-500 shadow-sm ring-1 ring-black/5 border-2 border-white"></span>
    },
    {
      key: 'parcels',
      label: 'Parcelle Cadastrale',
      renderIcon: () => <span className="w-3 h-3 rounded border border-slate-400 border-dashed bg-slate-100"></span>
    }
  ];

  const activeOverlayCount = Object.values(overlays).filter(Boolean).length;

  return (
    <>
      {/* 1. Floating Search Bar & Geo Button (Top Left) */}
      <div
        className="absolute top-4 transition-all duration-300 pointer-events-auto flex flex-row gap-2 items-start z-50 max-w-[calc(100vw-400px)]"
        style={{ left: isSidebarCollapsed ? '88px' : '276px' }}
      >
        {!isPanelOpen && (
          <>
            {/* Search Group */}
            <div className="flex gap-2 w-72 md:w-96 shrink-0">
              <div className="flex-1 bg-white/90 backdrop-blur-md shadow-xl rounded-xl flex items-center p-1 border border-white/20 ring-1 ring-black/5 transition-all focus-within:ring-2 focus-within:ring-emerald-600/50">
                <div className="p-2.5 text-slate-400">
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : <Search className="w-5 h-5" />}
                </div>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 text-sm font-medium h-9 w-full min-w-0"
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchQuery(value);
                    if (value.trim() === '') {
                      setSearchResult(null);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isSearching}
                />
                <button
                  onClick={handleSearch}
                  className="p-2.5 text-slate-400 hover:text-emerald-600 border-l border-slate-100 transition-colors disabled:opacity-50"
                  disabled={isSearching}
                >
                  <Navigation className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleSearch}
                className="bg-emerald-600 text-white shadow-xl rounded-xl p-3 border border-emerald-500/20 ring-1 ring-black/5 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                disabled={isSearching}
                title="Lancer la recherche"
              >
                <Search className="w-5 h-5" />
              </button>

              <button
                onClick={handleGeolocation}
                className="bg-white/90 backdrop-blur-md shadow-xl rounded-xl p-3 border border-white/20 ring-1 ring-black/5 text-slate-600 hover:text-emerald-600 active:bg-emerald-50 transition-colors disabled:opacity-50 shrink-0"
                disabled={isSearching}
                title="Ma position"
              >
                <Locate className="w-5 h-5" />
              </button>
            </div>

            {/* Site Dropdown (Moved inline) */}
            <div className="bg-white/90 backdrop-blur-md shadow-xl rounded-xl p-1 border border-white/20 ring-1 ring-black/5 flex items-center w-64 shrink-0">
              <div className="p-2 text-slate-400">
                <MapIcon className="w-4 h-4" />
              </div>
              <select
                className="bg-transparent outline-none text-sm font-medium text-slate-700 w-full p-1 cursor-pointer truncate"
                onChange={(e) => {
                  const siteId = e.target.value;
                  if (!siteId) return;
                  const site = SITES.find(s => s.id === siteId);
                  if (site) {
                    setTargetLocation({ coordinates: site.coordinates, zoom: 17 });
                    setSearchResult({
                      name: site.name,
                      description: site.description,
                      coordinates: site.coordinates,
                      zoom: 17
                    });
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Aller à un site...</option>
                {SITES.map(site => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Result Info - Absolute positioned below Search Group to avoid breaking row flow if it appears */}
            {searchResult && (
              <div className="absolute top-14 left-0 w-96 bg-white/90 backdrop-blur-md shadow-xl rounded-xl p-4 border border-white/20 animate-slide-in pointer-events-auto z-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Navigation className="w-3 h-3 text-emerald-600" />
                      {searchResult.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{searchResult.description}</p>
                  </div>
                  <button onClick={() => setSearchResult(null)} className="text-slate-400 hover:text-slate-600 ml-2">
                    <span className="sr-only">Fermer</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 2. Floating Tools (Top Right) */}
      <div className="absolute top-4 right-4 pointer-events-auto flex flex-col gap-2 z-50">
        <div className="bg-white/90 backdrop-blur-md shadow-xl rounded-xl border border-white/20 overflow-hidden flex flex-col ring-1 ring-black/5">
          {/* View Toggle Button */}
          {onToggleMap && (
            <>
              <button
                onClick={onToggleMap}
                className={`p-3 transition-colors ${!isPanelOpen ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-50 text-slate-600'}`}
                title={isPanelOpen ? "Carte Plein Écran" : "Afficher le Panneau"}
              >
                {isPanelOpen ? <Maximize2 className="w-5 h-5" /> : <LayoutTemplate className="w-5 h-5" />}
              </button>
              <div className="h-px bg-slate-100 w-full" />
            </>
          )}

          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`p-3 transition-colors ${showLayers ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-50 text-slate-600'}`}
            title="Gestion des couches"
          >
            <Layers className="w-5 h-5" />
          </button>

          <div className="h-px bg-slate-100 w-full" />

          <button
            onClick={toggleMeasureTool}
            className={`p-3 transition-colors ${isMeasuring ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-50 text-slate-600'}`}
            title="Mesurer une distance"
          >
            <Ruler className="w-5 h-5" />
          </button>

          <div className="h-px bg-slate-100 w-full" />

          {setIsRouting && (
            <>
              <button
                onClick={() => setIsRouting(!isRouting)}
                className={`p-3 transition-colors ${isRouting ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-50 text-slate-600'}`}
                title="Calculer un itinéraire"
              >
                <GitCommit className="w-5 h-5" />
              </button>
              <div className="h-px bg-slate-100 w-full" />
            </>
          )}

          <button
            onClick={handleExportPDF}
            className="p-3 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Exporter en PDF"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Selected Object Detail Card */}
      {selectedObject && (
        <div className="absolute top-20 right-4 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 animate-slide-in pointer-events-auto ring-1 ring-black/5 z-50 overflow-hidden">
          <div className="h-24 bg-gradient-to-br from-emerald-600 to-teal-700 relative p-4 flex flex-col justify-end">
            <button
              onClick={onCloseObjectDetail}
              className="absolute top-3 right-3 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded w-fit mb-1">
              {selectedObject.type}
            </span>
            <h3 className="text-lg font-bold text-white leading-tight">{selectedObject.title}</h3>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-slate-500 font-medium">{selectedObject.subtitle}</p>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(selectedObject.attributes).map(([key, value]) => {
                // Ignorer les champs géométriques et les objets complexes
                if (key === 'centroid' || key === 'center' || key === 'geometry' || typeof value === 'object') {
                  return null;
                }
                return (
                  <div key={key} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">{key}</div>
                    <div className="text-sm font-semibold text-slate-700">{value}</div>
                  </div>
                );
              })}
            </div>

            {selectedObject.lastIntervention && (
              <div className="flex items-center gap-3 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <CalendarIcon className="w-4 h-4 text-emerald-500" />
                <span>Dernière intervention : <b>{selectedObject.lastIntervention}</b></span>
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold transition-colors">
                Créer Intervention
              </button>
              <button className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1">
                <FileText className="w-3 h-3" /> Historique
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layers Panel Overlay */}
      {showLayers && (
        <div className="absolute top-4 right-16 pointer-events-auto w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 animate-slide-in origin-top-right ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] z-50">
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

          <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Base Maps Section */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapIcon className="w-3 h-3" /> Fonds de plan
              </h4>
              <div className="grid grid-cols-3 gap-3">
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
                        relative flex flex-col items-center gap-2 p-2 rounded-xl border transition-all duration-200 group
                        ${isActive
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-1 ring-emerald-500/20'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'}
                      `}
                    >
                      <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-white shadow-sm text-slate-400 group-hover:text-slate-600'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold truncate w-full text-center">
                        {layer.name.split(' ')[0]}
                      </span>

                      {isActive && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Overlays Section */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Grid className="w-3 h-3" /> Données Métier
              </h4>
              {/* Cartographic toggles (moved from LeftPanel) */}
              <div className="mb-3">
                <div className="text-xs text-slate-400 mb-2">Options Cartographiques</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`p-1 rounded-md ${clusteringEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-400'}`}>
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Activer Clustering</span>
                        <span className="text-xs text-slate-400">Regroupe les points proches</span>
                      </div>
                    </div>
                    <label className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${clusteringEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={clusteringEnabled}
                        onChange={(e) => {
                          if (setClusteringEnabled) {
                            setClusteringEnabled(e.target.checked);
                          }
                          console.log('clustering', e.target.checked);
                        }}
                      />
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${clusteringEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`p-1 rounded-md ${vegetationVisible ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-400'}`}>
                        <Trees className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Végétation</span>
                        <span className="text-xs text-slate-400">Afficher / masquer la couche végétation</span>
                      </div>
                    </div>
                    <label className={`w-11 h-6 rounded-full p-1 transition-colors ${vegetationVisible ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <input type="checkbox" className="hidden" checked={vegetationVisible} onChange={(e) => { setVegetationVisible(e.target.checked); console.log('vegetation', e.target.checked); }} />
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${vegetationVisible ? 'translate-x-5' : 'translate-x-0'}`} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {legendItems.map((item) => {
                  const key = item.key as keyof OverlayState;
                  const isActive = overlays[key];
                  const Icon = key === 'networks' ? Zap : key === 'greenSpaces' ? Trees : key === 'works' ? Hammer : Grid;
                  const colorClass = key === 'networks' ? 'text-blue-600' : key === 'greenSpaces' ? 'text-emerald-600' : key === 'works' ? 'text-orange-600' : 'text-slate-600';

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:border-slate-200 transition-colors group"
                      onClick={() => onToggleOverlay(key)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 bg-white rounded-md shadow-sm transition-colors ${isActive ? colorClass : 'text-slate-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${isActive ? 'text-slate-700' : 'text-slate-500'}`}>{item.label}</span>
                        </div>
                      </div>
                      <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <button className="text-xs text-emerald-600 font-medium hover:underline flex items-center justify-center gap-1">
              <Plus className="w-3 h-3" /> Ajouter une couche WMS/WFS
            </button>
          </div>
        </div>
      )}

      {/* 3. Floating Bottom Right Panel Stack (Legend + Sites) */}
      <div className="absolute bottom-8 right-4 pointer-events-auto flex flex-row gap-3 items-end z-50">

        {/* Sites Legend Panel - Collapsible, Closed by Default */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-white/20 w-72 ring-1 ring-black/5 transition-all overflow-hidden">
          <div
            className={`flex justify-between items-center p-3 cursor-pointer hover:bg-slate-50 transition-colors ${isSitesPanelOpen ? 'border-b border-slate-100' : ''}`}
            onClick={() => setIsSitesPanelOpen(!isSitesPanelOpen)}
          >
            <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <MapIcon className="w-3 h-3 text-emerald-600" /> Légende
              <span className="bg-emerald-100 text-emerald-700 px-1.5 rounded-full text-[9px]">{SITES.length}</span>
            </h4>
            <div className="text-slate-400">
              {isSitesPanelOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </div>
          </div>

          {isSitesPanelOpen && (
            <div className="overflow-y-auto custom-scrollbar max-h-[400px] animate-in slide-in-from-top-2 duration-200">
              <SitesLegend onSiteClick={handleSiteClick} />
            </div>
          )}
        </div>

        {/* Dynamic Legend Panel */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-white/20 w-64 ring-1 ring-black/5 transition-all overflow-hidden">
          {/* Header - Always Visible - Clickable to Toggle */}
          <div
            className={`flex justify-between items-center p-3 cursor-pointer hover:bg-slate-50 transition-colors ${isLegendOpen ? 'border-b border-slate-100' : ''}`}
            onClick={() => setIsLegendOpen(!isLegendOpen)}
          >
            <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <Info className="w-3 h-3" /> Légende
              {activeOverlayCount > 0 && <span className="bg-emerald-100 text-emerald-700 px-1.5 rounded-full text-[9px]">{activeOverlayCount}</span>}
            </h4>
            <div className="text-slate-400">
              {isLegendOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </div>
          </div>

          {/* Content - Conditionally Visible */}
          {isLegendOpen && (
            <div className="p-4 pt-3 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {legendItems.map((item) => {
                  const isActive = overlays[item.key as keyof OverlayState];

                  // Render grayed out if inactive, normal if active
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center gap-3 text-xs font-medium transition-all duration-300 ${isActive ? 'text-slate-700 opacity-100' : 'text-slate-400 opacity-50 grayscale'
                        }`}
                    >
                      {item.renderIcon()}
                      <span>{item.label}</span>
                      <div className="ml-auto">
                        {isActive ? <Eye className="w-3 h-3 text-slate-400" /> : <EyeOff className="w-3 h-3 text-slate-300" />}
                      </div>
                    </div>
                  );
                })}

                {activeOverlayCount === 0 && (
                  <div className="text-xs text-slate-400 italic text-center py-2 border-t border-dashed border-slate-200 mt-2">
                    Aucune couche métier active
                  </div>
                )}
              </div>

              {/* Info Fond de carte - Dynamic */}
              <div className="mt-3 pt-2 border-t border-slate-200/50">
                <div className="text-[10px] text-slate-400 flex justify-between items-center">
                  <span>Fond de plan:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                    {MAP_LAYERS[activeLayerId].name}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* 4. Zoom Controls & Pan Control */}


      {/* 4. Zoom Controls & Pan Control - Moved to Bottom Left to avoid overlap */}
      <div
        className="absolute bottom-8 transition-all duration-300 pointer-events-auto flex flex-col gap-4 z-50"
        style={{ left: isSidebarCollapsed ? '88px' : '276px' }}
      >
        <div className="flex flex-col gap-2">
          <button
            onClick={onZoomIn}
            className="w-9 h-9 bg-white/90 backdrop-blur shadow-lg rounded-lg flex items-center justify-center text-slate-600 hover:text-emerald-600 border border-white/20 hover:bg-slate-50 transition-colors active:bg-slate-100"
            title="Zoom Avant"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOutClick}
            className="w-9 h-9 bg-white/90 backdrop-blur shadow-lg rounded-lg flex items-center justify-center text-slate-600 hover:text-emerald-600 border border-white/20 hover:bg-slate-50 transition-colors active:bg-slate-100"
            title="Zoom Arrière"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <button
          className="w-9 h-9 bg-white/90 backdrop-blur shadow-lg rounded-lg flex items-center justify-center text-slate-600 hover:text-emerald-600 border border-white/20 hover:bg-slate-50 transition-colors"
          title="Centrer sur ma position"
          onClick={handleGeolocation}
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Confirmation Dialog for Low Zoom */}
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
