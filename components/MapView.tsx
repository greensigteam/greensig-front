import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  Tooltip,
  Polyline,
  Polygon,
  useMap,
  ScaleControl
} from "react-leaflet";
// REMOVED: Unused imports (MOCK data removed)

import { createLogger } from "../services/logger";
import RoutingMachine from "./RoutingMachine";
import LeftPanel from "./LeftPanel";
import LeafletDrawing, { DrawnFeature } from "./LeafletDrawing";
import MarkerCluster from "./MarkerCluster";

import { LayerConfig, Coordinates } from "../types";
import { INITIAL_POSITION } from "../constants";
import "../styles/map.css";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// === Fix icônes Leaflet ==============================
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

// REMOVED: Category icons and labels (MOCK data removed)

// Component to handle map movements
const MapController: React.FC<{
  targetLocation: { coordinates: Coordinates; zoom?: number } | null;
  userLocation?: Coordinates | null;
}> = ({ targetLocation, userLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (targetLocation && targetLocation.coordinates) {
      const { lat, lng } = targetLocation.coordinates;
      const zoom = targetLocation.zoom || 16;

      if (!isNaN(lat) && !isNaN(lng)) {
        console.log('Flying to:', { lat, lng, zoom });
        map.flyTo([lat, lng], zoom, {
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
    }
  }, [targetLocation, map]);

  return null;
};

// ======================================================
// =============== INTERFACE PROPS =======================
// ======================================================
interface MapViewProps {
  activeLayer: LayerConfig;
  targetLocation: { coordinates: Coordinates; zoom?: number } | null;
  userLocation?: Coordinates | null;
  onMoveEnd?: (center: Coordinates, zoom: number) => void;
  mapRef?: any;
  overlays?: any;
  onObjectClick?: any;
  isMeasuring?: boolean;
  measurePoints?: any[];
  onMeasureClick?: any;
  isRouting?: boolean;
  isSidebarCollapsed?: boolean;
  clusteringEnabled?: boolean;
}

// ======================================================
// ===================== MAP VIEW =======================
// ======================================================
export const MapView: React.FC<MapViewProps> = ({
  activeLayer,
  targetLocation,
  userLocation,
  mapRef,
  onMoveEnd,
  overlays,
  onObjectClick,
  isMeasuring = false,
  measurePoints = [],
  onMeasureClick,
  isRouting = false,
  isSidebarCollapsed = true,
  clusteringEnabled = true
}) => {
  // Layer visibility state - pour contrôler quels types d'objets afficher
  const [visibleLayers, setVisibleLayers] = useState<string[]>([]);

  // Drawing state
  const [drawingMode, setDrawingMode] = useState<'Point' | 'LineString' | 'Polygon' | 'Rectangle' | null>(null);
  const [drawingColor, setDrawingColor] = useState('#ff6600');
  const [vegetationType, setVegetationType] = useState('');
  const [drawnFeatures, setDrawnFeatures] = useState<DrawnFeature[]>([]);

  // Expose drawing controls to window for LeftPanel
  useEffect(() => {
    // Store references to internal drawing functions
    const internalClearAll = () => {
      if ((window as any)._leafletDrawingInternal?.clearAll) {
        (window as any)._leafletDrawingInternal.clearAll();
      }
      setDrawnFeatures([]);
    };

    const internalDeleteLast = () => {
      if ((window as any)._leafletDrawingInternal?.deleteLastFeature) {
        (window as any)._leafletDrawingInternal.deleteLastFeature();
      }
    };

    const internalExport = () => {
      if ((window as any)._leafletDrawingInternal?.exportGeoJSON) {
        return (window as any)._leafletDrawingInternal.exportGeoJSON();
      }
      return null;
    };

    const api = {
      activateDrawing: (type: 'Point' | 'LineString' | 'Polygon' | 'Rectangle') => {
        console.log('Activating drawing mode:', type);
        setDrawingMode(type);
      },
      deactivateDrawing: () => {
        console.log('Deactivating drawing mode');
        setDrawingMode(null);
      },
      activateModify: () => {
        setDrawingMode(null);
      },
      deactivateModify: () => {},
      clearDrawings: internalClearAll,
      deleteLastDrawing: internalDeleteLast,
      exportDrawingsAsGeoJSON: internalExport,
      changeDrawingColor: (color: string) => {
        setDrawingColor(color);
      },
      setVegetationType: (type: string) => {
        setVegetationType(type);
      },
      saveDrawingsToVegetation: () => {
        const count = drawnFeatures.length;
        if (count === 0) {
          alert('Aucun dessin à sauvegarder');
          return 0;
        }
        alert(`${count} dessin(s) sauvegardé(s) dans les couches de végétation.`);
        return count;
      },
      getDrawingMode: () => drawingMode,
      isDrawing: () => drawingMode !== null
    };

    (window as any).leafletDrawing = api;

    return () => {
      // Cleanup
    };
  }, [drawingMode, drawnFeatures]);

  const handleDrawEnd = useCallback((feature: DrawnFeature) => {
    console.log('Feature drawn:', feature);
  }, []);

  const handleFeaturesChange = useCallback((features: DrawnFeature[]) => {
    setDrawnFeatures(features);
  }, []);

  // Fallbacks
  const defaultLat = 46.2276;
  const defaultLng = 2.2137;

  const initLat =
    INITIAL_POSITION && !isNaN(INITIAL_POSITION.lat)
      ? INITIAL_POSITION.lat
      : defaultLat;

  const initLng =
    INITIAL_POSITION && !isNaN(INITIAL_POSITION.lng)
      ? INITIAL_POSITION.lng
      : defaultLng;

  const initZoom =
    INITIAL_POSITION && !isNaN(INITIAL_POSITION.zoom)
      ? INITIAL_POSITION.zoom
      : 6;

  const validTarget = useMemo(() => {
    return (
      targetLocation &&
      targetLocation.coordinates &&
      !isNaN(targetLocation.coordinates.lat) &&
      !isNaN(targetLocation.coordinates.lng)
    );
  }, [targetLocation]);

  const displayLat = validTarget
    ? Number(targetLocation!.coordinates.lat)
    : initLat;

  const displayLng = validTarget
    ? Number(targetLocation!.coordinates.lng)
    : initLng;

  // REMOVED: MOCK data - now using real data from Django API via MarkerCluster

  return (
    <div className="h-full w-full relative">
      {/* Floating panels */}
      <LeftPanel
        onToggleLayer={(id, visible) => {
          // Mettre à jour la liste des layers visibles
          setVisibleLayers(prev => {
            if (visible) {
              // Ajouter le layer s'il n'est pas déjà là
              return prev.includes(id) ? prev : [...prev, id];
            } else {
              // Retirer le layer
              return prev.filter(layerId => layerId !== id);
            }
          });
          console.log('Layer toggle:', id, visible);
        }}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      <MapContainer
        center={[32.2141, -7.9344]}
        zoom={15}
        minZoom={12}
        maxZoom={22}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full w-full z-0"
        ref={mapRef}
      >
        <TileLayer
          attribution={activeLayer.attribution}
          url={activeLayer.url}
          maxNativeZoom={activeLayer.maxNativeZoom}
        />

        {/* Map Controller for navigation */}
        <MapController targetLocation={targetLocation} userLocation={userLocation} />

        {/* Drawing Tools */}
        <LeafletDrawing
          drawingMode={drawingMode}
          drawingColor={drawingColor}
          vegetationType={vegetationType}
          onDrawEnd={handleDrawEnd}
          onFeaturesChange={handleFeaturesChange}
        />

        {/* User Location Marker */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={L.divIcon({
              html: `<div style="
                background-color: #3b82f6;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
              "></div>`,
              className: 'user-location-marker',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              <span className="text-xs font-bold">Vous êtes ici</span>
            </Tooltip>
          </Marker>
        )}

        {/* REMOVED: MOCK Hydrologie & Végétation - now loaded from API via MarkerCluster */}

        {/* MAP OBJECTS (Sites + Vegetation + Hydraulic) with Clustering */}
        <MarkerCluster
          enabled={clusteringEnabled}
          visibleLayers={visibleLayers} // Layers sélectionnés dans LeftPanel
          onObjectClick={(obj) => {
            if (onObjectClick) {
              const name = obj.properties.nom || obj.properties.nom_site || obj.properties.marque || `${obj.properties.object_type} #${obj.properties.id}`;
              onObjectClick({
                id: obj.properties.id,
                type: obj.properties.object_type,
                title: name,
                subtitle: obj.properties.site_nom || '',
                attributes: obj.properties
              });
            }
          }}
        />

        {isRouting && <RoutingMachine />}
        <ScaleControl position="bottomright" imperial={false} />
      </MapContainer>
    </div>
  );
};
