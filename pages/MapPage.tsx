import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  Search, Layers, Plus, Minus, Navigation, Crosshair, Filter,
  Loader2, Locate, Maximize2, LayoutTemplate, X,
  Map as MapIcon, Image as ImageIcon, Mountain,
  Grid, Zap, Trees, Hammer, Info, Eye, EyeOff, AlertTriangle,
  Ruler, Printer, Calendar as CalendarIcon, FileText,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, GitCommit, RotateCcw
} from 'lucide-react';
import { MAP_LAYERS, VEG_LEGEND, HYDRO_LEGEND, SITE_LEGEND } from '../constants';
import { MapLayerType, Coordinates, MapSearchResult, OverlayState, MapObjectDetail } from '../types';
import { MOCK_SITES, MOCK_INVENTORY } from '../services/mockData';
import { SITES, Site } from '../data/sites';
import { SitesLegend } from '../components/SitesLegend';
import { searchObjects, geoJSONToLatLng } from '../services/api';

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
  onToggleLayer?: (layerId: string, visible: boolean) => void;
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
  onToggleLayer,
  clusteringEnabled = true,
  setClusteringEnabled,
}) => {
  const [showLayers, setShowLayers] = useState(false);
  const [showZoomWarning, setShowZoomWarning] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [isSitesPanelOpen, setIsSitesPanelOpen] = useState(false);
  const [vegetationVisible, setVegetationVisible] = useState(true);

  // États pour les onglets Filtres/Symbologie
  const [layersPanelTab, setLayersPanelTab] = useState<'layers' | 'filters' | 'symbology'>('layers');
  const [symbologyConfig, setSymbologyConfig] = useState<Record<string, SymbologyConfig>>(createDefaultSymbology);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    [...SITE_LEGEND, ...VEG_LEGEND, ...HYDRO_LEGEND].forEach(item => {
      initial[item.type] = true;
    });
    return initial;
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Helper function to toggle map layer via window
  const toggleMapLayerVisibility = (layerId: string, visible: boolean) => {
    if ((window as any).toggleMapLayer) {
      (window as any).toggleMapLayer(layerId, visible);
    }
    if (onToggleLayer) onToggleLayer(layerId, visible);
  };

  // Fonctions pour les filtres
  const resetAllFilters = () => {
    setStatusFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
    const newVisibility: Record<string, boolean> = {};
    [...SITE_LEGEND, ...VEG_LEGEND, ...HYDRO_LEGEND].forEach(item => {
      newVisibility[item.type] = true;
      toggleMapLayerVisibility(item.type, true);
    });
    setLayerVisibility(newVisibility);
  };

  // Fonctions pour la symbologie
  const toggleExpanded = (type: string) => {
    setExpandedItems(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const updateSymbology = (type: string, field: keyof SymbologyConfig, value: string | number) => {
    setSymbologyConfig(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
    if ((window as any).updateLayerSymbology) {
      (window as any).updateLayerSymbology(type, { ...symbologyConfig[type], [field]: value });
    }
  };

  const resetSymbology = (type: string) => {
    const vegItem = VEG_LEGEND.find(v => v.type === type);
    const hydroItem = HYDRO_LEGEND.find(h => h.type === type);
    const item = vegItem || hydroItem;
    if (item) {
      const defaultConfig: SymbologyConfig = {
        fillColor: item.color,
        fillOpacity: vegItem ? 0.6 : 0.8,
        strokeColor: item.color,
        strokeWidth: 2
      };
      setSymbologyConfig(prev => ({ ...prev, [type]: defaultConfig }));
      if ((window as any).updateLayerSymbology) {
        (window as any).updateLayerSymbology(type, defaultConfig);
      }
    }
  };

  // Expose symbology config to window for map access
  useEffect(() => {
    (window as any).getSymbologyConfig = () => symbologyConfig;
  }, [symbologyConfig]);

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
          <div
            className={`h-28 relative p-4 flex flex-col justify-end ${
              selectedObject.type !== 'Site'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
                : ''
            }`}
            style={
              selectedObject.type === 'Site'
                ? { backgroundColor: selectedObject.attributes?.Couleur as string || '#3b82f6' }
                : {}
            }
          >
            <button
              onClick={onCloseObjectDetail}
              className="absolute top-3 right-3 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit mb-1 ${
              selectedObject.type === 'Site' ? 'text-blue-100 bg-black/20' : 'text-emerald-100 bg-black/20'
            }`}>
              {selectedObject.type}
            </span>
            <h3 className="text-lg font-bold text-white leading-tight">{selectedObject.title}</h3>
            {selectedObject.attributes?.['Catégorie'] && selectedObject.type === 'Site' && (
              <span className="text-xs text-white/80 mt-1">{selectedObject.attributes['Catégorie']}</span>
            )}
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-slate-500 font-medium">{selectedObject.subtitle}</p>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(selectedObject.attributes).map(([key, value]) => {
                // Ignorer les champs géométriques, objets complexes et certains champs pour les sites
                if (key === 'centroid' || key === 'center' || key === 'geometry' || typeof value === 'object') {
                  return null;
                }
                // Pour les sites, ignorer Description (déjà affiché) et Couleur
                if (selectedObject.type === 'Site' && (key === 'Description' || key === 'Couleur')) {
                  return null;
                }
                // Traitement spécial pour Google Maps
                if (key === 'Google Maps' && typeof value === 'string' && value.startsWith('http')) {
                  return (
                    <div key={key} className="col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <div className="text-[10px] text-blue-400 uppercase font-bold mb-1">{key}</div>
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2 hover:underline"
                      >
                        <Navigation className="w-4 h-4" />
                        Ouvrir dans Google Maps
                      </a>
                    </div>
                  );
                }
                return (
                  <div key={key} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">{key}</div>
                    <div className="text-sm font-semibold text-slate-700 truncate" title={String(value)}>{value}</div>
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
              {selectedObject.type === 'Site' ? (
                <>
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" /> Voir détails
                  </button>
                  <button
                    onClick={() => {
                      const googleMapsUrl = selectedObject.attributes?.['Google Maps'];
                      if (googleMapsUrl && typeof googleMapsUrl === 'string') {
                        window.open(googleMapsUrl, '_blank');
                      }
                    }}
                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-3 h-3" /> Itinéraire
                  </button>
                </>
              ) : (
                <>
                  <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold transition-colors">
                    Créer Intervention
                  </button>
                  <button className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1">
                    <FileText className="w-3 h-3" /> Historique
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Layers Panel Overlay avec onglets */}
      {showLayers && (
        <div className="absolute top-4 right-16 pointer-events-auto w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 animate-slide-in origin-top-right ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] z-50">
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

          {/* Onglets */}
          <div className="flex p-2 bg-slate-50 border-b border-slate-100">
            <button
              onClick={() => setLayersPanelTab('layers')}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg transition-all ${layersPanelTab === 'layers' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Layers className="w-3 h-3" /> COUCHES
              </span>
            </button>
            <button
              onClick={() => setLayersPanelTab('filters')}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg transition-all ${layersPanelTab === 'filters' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Filter className="w-3 h-3" /> FILTRES
              </span>
            </button>
            <button
              onClick={() => setLayersPanelTab('symbology')}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg transition-all ${layersPanelTab === 'symbology' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Grid className="w-3 h-3" /> SYMBOLES
              </span>
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {/* Onglet COUCHES */}
            {layersPanelTab === 'layers' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Base Maps Section */}
                <div className="mb-6">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MapIcon className="w-3 h-3" /> Fonds de plan
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
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
                            relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-200 group
                            ${isActive
                              ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-1 ring-emerald-500/20'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'}
                          `}
                        >
                          <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-white shadow-sm text-slate-400 group-hover:text-slate-600'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-bold truncate w-full text-center">
                            {layer.name.split(' ')[0]}
                          </span>
                          {isActive && (
                            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-2 ring-white"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Options Cartographiques */}
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Trees className="w-3 h-3" /> Options
                  </h4>
                  <div className="space-y-2">
                    {/* Option 'Végétation' supprimée */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-md ${clusteringEnabled ? 'bg-blue-50 text-blue-600' : 'bg-white text-slate-400'}`}>
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium">Clustering</span>
                      </div>
                      <label className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${clusteringEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <input type="checkbox" className="hidden" checked={clusteringEnabled} onChange={(e) => setClusteringEnabled?.(e.target.checked)} />
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${clusteringEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Section Données Métier supprimée */}
              </div>
            )}

            {/* Onglet FILTRES */}
            {layersPanelTab === 'filters' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="text-sm font-semibold text-gray-800 mb-2">Recherche par Type</div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => {
                      const newVisibility: Record<string, boolean> = {};
                      [...SITE_LEGEND, ...VEG_LEGEND, ...HYDRO_LEGEND].forEach(item => {
                        newVisibility[item.type] = true;
                        toggleMapLayerVisibility(item.type, true);
                      });
                      setLayerVisibility(prev => ({ ...prev, ...newVisibility }));
                    }}
                    className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg transition-colors border border-emerald-200"
                  >
                    Tout sélectionner
                  </button>
                  <button
                    onClick={() => {
                      const newVisibility: Record<string, boolean> = {};
                      [...SITE_LEGEND, ...VEG_LEGEND, ...HYDRO_LEGEND].forEach(item => {
                        newVisibility[item.type] = false;
                        toggleMapLayerVisibility(item.type, false);
                      });
                      setLayerVisibility(prev => ({ ...prev, ...newVisibility }));
                    }}
                    className="flex-1 py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors border border-red-200"
                  >
                    Tout désélectionner
                  </button>
                </div>

                {/* Sites Section */}
                <div className="mb-3">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Sites
                  </div>
                  <div className="space-y-1 pl-1">
                    {SITE_LEGEND.map(item => (
                      <div key={item.type} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded transition-colors">
                        <input
                          type="checkbox"
                          id={`filter-${item.type}`}
                          checked={layerVisibility[item.type] !== false}
                          onChange={(e) => {
                            const visible = e.target.checked;
                            setLayerVisibility(prev => ({ ...prev, [item.type]: visible }));
                            toggleMapLayerVisibility(item.type, visible);
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-gray-300"
                        />
                        <label htmlFor={`filter-${item.type}`} className="flex items-center gap-2 cursor-pointer flex-1 select-none">
                          <span className="w-4 h-4 rounded shadow-sm border border-black/10" style={{ backgroundColor: item.color }}></span>
                          <span className="text-sm text-gray-700 font-medium">{item.type}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Végétation Section */}
                <div className="mb-3">
                  <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Végétation
                  </div>
                  <div className="space-y-1 pl-1">
                    {VEG_LEGEND.map(item => (
                      <div key={item.type} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded transition-colors">
                        <input
                          type="checkbox"
                          id={`filter-${item.type}`}
                          checked={layerVisibility[item.type] !== false}
                          onChange={(e) => {
                            const visible = e.target.checked;
                            setLayerVisibility(prev => ({ ...prev, [item.type]: visible }));
                            toggleMapLayerVisibility(item.type, visible);
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer border-gray-300"
                        />
                        <label htmlFor={`filter-${item.type}`} className="flex items-center gap-2 cursor-pointer flex-1 select-none">
                          <span className="w-4 h-4 rounded shadow-sm border border-black/10" style={{ backgroundColor: item.color }}></span>
                          <span className="text-sm text-gray-700 font-medium">{item.type}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hydrologie Section */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-cyan-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                    Hydrologie
                  </div>
                  <div className="space-y-1 pl-1">
                    {HYDRO_LEGEND.map(item => (
                      <div key={item.type} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded transition-colors">
                        <input
                          type="checkbox"
                          id={`filter-${item.type}`}
                          checked={layerVisibility[item.type] !== false}
                          onChange={(e) => {
                            const visible = e.target.checked;
                            setLayerVisibility(prev => ({ ...prev, [item.type]: visible }));
                            toggleMapLayerVisibility(item.type, visible);
                          }}
                          className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer border-gray-300"
                        />
                        <label htmlFor={`filter-${item.type}`} className="flex items-center gap-2 cursor-pointer flex-1 select-none">
                          <span className="w-4 h-4 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: item.color }}></span>
                          <span className="text-sm text-gray-700 font-medium">{item.type}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ...existing code... */}
              </div>
            )}

            {/* Onglet SYMBOLOGIE */}
            {layersPanelTab === 'symbology' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="text-sm font-semibold text-gray-800 mb-1">Gestion de la Symbologie</div>
                <div className="text-xs text-gray-500 mb-4">Personnalisez l'apparence des couches.</div>

                {/* Vegetation Section */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Végétation
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {VEG_LEGEND.map(item => {
                      const config = symbologyConfig[item.type];
                      const isExpanded = expandedItems[item.type];
                      const Icon = item.icon;

                      return (
                        <div key={item.type} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <div
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleExpanded(item.type)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded border-2 border-white shadow-sm" style={{ backgroundColor: config?.fillColor || item.color }} />
                              <Icon className="w-3.5 h-3.5" style={{ color: config?.fillColor || item.color }} />
                              <span className="text-xs font-medium text-gray-700">{item.type}</span>
                            </div>
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                          </div>

                          {isExpanded && (
                            <div className="p-3 pt-0 space-y-2.5 border-t border-gray-100 bg-gray-50">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] text-gray-600">Couleur remplissage</label>
                                <input
                                  type="color"
                                  value={config?.fillColor || item.color}
                                  onChange={(e) => updateSymbology(item.type, 'fillColor', e.target.value)}
                                  className="w-7 h-5 rounded cursor-pointer border border-gray-300"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[10px] text-gray-600">Opacité</label>
                                  <span className="text-[10px] text-gray-500">{Math.round((config?.fillOpacity || 0.6) * 100)}%</span>
                                </div>
                                <input
                                  type="range" min="0" max="100"
                                  value={(config?.fillOpacity || 0.6) * 100}
                                  onChange={(e) => updateSymbology(item.type, 'fillOpacity', Number(e.target.value) / 100)}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] text-gray-600">Couleur contour</label>
                                <input
                                  type="color"
                                  value={config?.strokeColor || item.color}
                                  onChange={(e) => updateSymbology(item.type, 'strokeColor', e.target.value)}
                                  className="w-7 h-5 rounded cursor-pointer border border-gray-300"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[10px] text-gray-600">Épaisseur</label>
                                  <span className="text-[10px] text-gray-500">{config?.strokeWidth || 2}px</span>
                                </div>
                                <input
                                  type="range" min="1" max="10"
                                  value={config?.strokeWidth || 2}
                                  onChange={(e) => updateSymbology(item.type, 'strokeWidth', Number(e.target.value))}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                              </div>
                              <button
                                onClick={() => resetSymbology(item.type)}
                                className="w-full py-1 px-2 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-medium rounded flex items-center justify-center gap-1 transition-colors"
                              >
                                <RotateCcw className="w-2.5 h-2.5" /> Réinitialiser
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hydrology Section */}
                <div>
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Hydrologie
                  </div>
                  <div className="space-y-1 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                    {HYDRO_LEGEND.map(item => {
                      const config = symbologyConfig[item.type];
                      const isExpanded = expandedItems[item.type];

                      return (
                        <div key={item.type} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <div
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleExpanded(item.type)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: config?.fillColor || item.color }} />
                              <span className="text-xs font-medium text-gray-700">{item.type}</span>
                            </div>
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                          </div>

                          {isExpanded && (
                            <div className="p-3 pt-0 space-y-2.5 border-t border-gray-100 bg-gray-50">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] text-gray-600">Couleur</label>
                                <input
                                  type="color"
                                  value={config?.fillColor || item.color}
                                  onChange={(e) => updateSymbology(item.type, 'fillColor', e.target.value)}
                                  className="w-7 h-5 rounded cursor-pointer border border-gray-300"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[10px] text-gray-600">Opacité</label>
                                  <span className="text-[10px] text-gray-500">{Math.round((config?.fillOpacity || 0.8) * 100)}%</span>
                                </div>
                                <input
                                  type="range" min="0" max="100"
                                  value={(config?.fillOpacity || 0.8) * 100}
                                  onChange={(e) => updateSymbology(item.type, 'fillOpacity', Number(e.target.value) / 100)}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[10px] text-gray-600">Épaisseur</label>
                                  <span className="text-[10px] text-gray-500">{config?.strokeWidth || 2}px</span>
                                </div>
                                <input
                                  type="range" min="1" max="10"
                                  value={config?.strokeWidth || 2}
                                  onChange={(e) => updateSymbology(item.type, 'strokeWidth', Number(e.target.value))}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                              </div>
                              <button
                                onClick={() => resetSymbology(item.type)}
                                className="w-full py-1 px-2 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-medium rounded flex items-center justify-center gap-1 transition-colors"
                              >
                                <RotateCcw className="w-2.5 h-2.5" /> Réinitialiser
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

      
        </div>
      )}


      {/* 3. Floating Bottom Right Panel Stack (Legend + Sites) - Section métier supprimée */}


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
