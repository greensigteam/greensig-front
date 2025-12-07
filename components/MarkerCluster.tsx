import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { VEG_LEGEND, HYDRO_LEGEND, SITE_LEGEND } from '../constants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

// Types pour les objets de l'API
interface MapObject {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'Polygon' | 'LineString';
    coordinates: any;
  };
  properties: {
    id: number;
    object_type: string;
    nom?: string;
    nom_site?: string;
    marque?: string;
    famille?: string;
    taille?: string;
    site_nom?: string;
    sous_site_nom?: string;
    last_intervention_date?: string;
    center?: { lat: number; lng: number }; // Pour les Sites (polygones)
    [key: string]: any;
  };
}

interface MarkerClusterProps {
  enabled: boolean;
  visibleLayers?: string[]; // Types d'objets à afficher (arbres, gazons, etc.)
  onObjectClick?: (object: MapObject) => void;
}

// Créer un mapping de couleurs à partir des légendes
const OBJECT_COLORS: Record<string, string> = {
  ...Object.fromEntries(VEG_LEGEND.map(item => [item.type, item.color])),
  ...Object.fromEntries(HYDRO_LEGEND.map(item => [item.type, item.color])),
  ...Object.fromEntries(SITE_LEGEND.map(item => [item.type, item.color]))
};

// Mapping des types frontend (singulier) vers types API backend (pluriel minuscules)
const TYPE_TO_API: Record<string, string> = {
  'Site': 'sites',
  'Arbre': 'arbres',
  'Gazon': 'gazons',
  'Palmier': 'palmiers',
  'Arbuste': 'arbustes',
  'Vivace': 'vivaces',
  'Cactus': 'cactus',
  'Graminee': 'graminees',
  'Puit': 'puits',
  'Pompe': 'pompes',
  'Vanne': 'vannes',
  'Clapet': 'clapets',
  'Canalisation': 'canalisations',
  'Aspersion': 'aspersions',
  'Goutte': 'gouttes',
  'Ballon': 'ballons'
};

// Helper: Extraire coordonnées d'un objet (Point ou Polygon avec center)
function getObjectCoordinates(obj: MapObject): { lat: number; lng: number } | null {
  if (obj.geometry.type === 'Point') {
    const [lng, lat] = obj.geometry.coordinates;
    return { lat, lng };
  } else if (obj.geometry.type === 'Polygon') {
    // Si un center est pré-calculé, l'utiliser
    if (obj.properties.center) {
      return obj.properties.center;
    }
    // Sinon, calculer le centroid du polygon
    const ring = obj.geometry.coordinates[0]; // Premier ring (exterior)
    if (ring && ring.length > 0) {
      const sumLat = ring.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
      const sumLng = ring.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
      return {
        lat: sumLat / ring.length,
        lng: sumLng / ring.length
      };
    }
  } else if (obj.geometry.type === 'LineString') {
    // Pour les lignes, prendre le point du milieu
    const coords = obj.geometry.coordinates;
    if (coords && coords.length > 0) {
      const midIndex = Math.floor(coords.length / 2);
      const [lng, lat] = coords[midIndex];
      return { lat, lng };
    }
  }
  return null;
}

// Clustering: regroupe les objets proches selon le zoom
function clusterObjects(objects: MapObject[], map: L.Map): { clusters: MapObject[][]; singles: MapObject[] } {
  const zoom = map.getZoom();
  const clusterDistance = Math.max(30, 100 - zoom * 5); // pixels

  const used = new Set<number>();
  const clusters: MapObject[][] = [];
  const singles: MapObject[] = [];

  objects.forEach(obj => {
    const coords = getObjectCoordinates(obj);
    if (!coords || used.has(obj.properties.id)) return;

    const point = map.latLngToContainerPoint([coords.lat, coords.lng]);
    const nearby: MapObject[] = [obj];
    used.add(obj.properties.id);

    objects.forEach(other => {
      const otherCoords = getObjectCoordinates(other);
      if (!otherCoords || used.has(other.properties.id)) return;

      const otherPoint = map.latLngToContainerPoint([otherCoords.lat, otherCoords.lng]);
      const distance = Math.sqrt(
        Math.pow(point.x - otherPoint.x, 2) + Math.pow(point.y - otherPoint.y, 2)
      );
      if (distance < clusterDistance) {
        nearby.push(other);
        used.add(other.properties.id);
      }
    });

    if (nearby.length > 1) {
      clusters.push(nearby);
    } else {
      singles.push(obj);
    }
  });

  return { clusters, singles };
}

const MarkerCluster: React.FC<MarkerClusterProps> = ({ enabled, visibleLayers = [], onObjectClick }) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    }

    const fetchAndUpdateMarkers = async () => {
      setIsLoading(true);
      try {
        // Get current map bounds
        const bounds = map.getBounds();
        const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
        const zoom = map.getZoom();

        // Build types parameter (if visibleLayers specified)
        // Convert frontend types to API types (Arbre → arbres, Palmier → palmiers, etc.)
        const apiTypes = visibleLayers.length > 0
          ? visibleLayers.map(type => TYPE_TO_API[type] || type.toLowerCase()).join(',')
          : '';
        const types = apiTypes ? `&types=${apiTypes}` : '';

        // Fetch objects from API
        const response = await fetch(`${API_BASE_URL}/map/?bbox=${bbox}&zoom=${zoom}${types}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`📍 Loaded ${data.count} objects from /api/map/`);

        const objects = data.features;

        // Clear and redraw markers
        if (!layerRef.current) return;
        layerRef.current.clearLayers();

        if (enabled) {
          // Clustering mode
          const { clusters, singles } = clusterObjects(objects, map);

        // Add cluster markers
        clusters.forEach(cluster => {
          // Calculer centre du cluster
          const coords = cluster.map(obj => getObjectCoordinates(obj)).filter(c => c !== null) as { lat: number; lng: number }[];
          if (coords.length === 0) return;

          const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
          const avgLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;

          // Get dominant object type
          const typeCounts = cluster.reduce((acc, obj) => {
            const type = obj.properties.object_type;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const dominantType = Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])[0][0];

          const color = OBJECT_COLORS[dominantType] || '#6b7280';

          const clusterIcon = L.divIcon({
            html: `
              <div style="
                background-color: ${color};
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                font-weight: bold;
                color: white;
                font-size: 14px;
              ">
                ${cluster.length}
              </div>
            `,
            className: 'cluster-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });

          const marker = L.marker([avgLat, avgLng], { icon: clusterIcon });

          // Popup with all objects in cluster
          const popupContent = `
            <div style="max-height: 200px; overflow-y: auto;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">
                ${cluster.length} objets
              </div>
              ${cluster.map(obj => {
                const name = obj.properties.nom || obj.properties.nom_site || obj.properties.marque || `${obj.properties.object_type} #${obj.properties.id}`;
                return `
                  <div style="padding: 4px 0; border-bottom: 1px solid #eee; cursor: pointer;"
                       onclick="window.dispatchEvent(new CustomEvent('object-click', {detail: ${obj.properties.id}}))">
                    <div style="font-weight: 500; font-size: 12px;">${name}</div>
                    <div style="font-size: 10px; color: #666;">${obj.properties.object_type}</div>
                  </div>
                `;
              }).join('')}
            </div>
          `;

          marker.bindPopup(popupContent);

          // Zoom in on click to expand cluster
          marker.on('click', (e) => {
            if (map.getZoom() < 18) {
              map.setView([avgLat, avgLng], map.getZoom() + 2);
            }
          });

          layerRef.current?.addLayer(marker);
        });

          // Add single markers
          singles.forEach(obj => {
            addObjectMarker(obj);
          });
        } else {
          // No clustering - show all individual markers
          objects.forEach(obj => {
            addObjectMarker(obj);
          });
        }

      } catch (error) {
        console.error('❌ Error loading map objects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const addObjectMarker = (obj: MapObject) => {
      const { geometry, properties } = obj;
      const objectType = properties.object_type;
      const color = OBJECT_COLORS[objectType] || '#6b7280';
      const name = properties.nom || properties.nom_site || properties.marque || `${objectType} #${properties.id}`;

      // Handle different geometry types
      if (geometry.type === 'Point') {
        const [lng, lat] = geometry.coordinates;

        const icon = L.divIcon({
          html: `
            <div style="
              background-color: ${color};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            "></div>
          `,
          className: 'point-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12]
        });

        const marker = L.marker([lat, lng], { icon });
        marker.bindPopup(buildPopup(properties, objectType));
        marker.bindTooltip(name, { direction: 'top', offset: [0, -12] });
        marker.on('click', () => onObjectClick?.(obj));
        layerRef.current?.addLayer(marker);

      } else if (geometry.type === 'Polygon') {
        const latLngs = geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

        const polygon = L.polygon(latLngs, {
          color: color,
          fillColor: color,
          fillOpacity: objectType === 'Site' ? 0.1 : 0.3,
          weight: 2
        });

        polygon.bindPopup(buildPopup(properties, objectType));
        polygon.bindTooltip(name, { sticky: true });
        polygon.on('click', () => onObjectClick?.(obj));
        layerRef.current?.addLayer(polygon);

      } else if (geometry.type === 'LineString') {
        const latLngs = geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

        const polyline = L.polyline(latLngs, {
          color: color,
          weight: 3,
          opacity: 0.7
        });

        polyline.bindPopup(buildPopup(properties, objectType));
        polyline.bindTooltip(name, { sticky: true });
        polyline.on('click', () => onObjectClick?.(obj));
        layerRef.current?.addLayer(polyline);
      }
    };

    const buildPopup = (properties: any, objectType: string): string => {
      const name = properties.nom || properties.nom_site || properties.marque || `${objectType} #${properties.id}`;

      let details = `<strong>${objectType}</strong><br/>`;

      // Add type-specific fields
      if (properties.famille) details += `Famille: ${properties.famille}<br/>`;
      if (properties.taille) details += `Taille: ${properties.taille}<br/>`;
      if (properties.hauteur) details += `Hauteur: ${properties.hauteur}m<br/>`;
      if (properties.diametre) details += `Diamètre: ${properties.diametre}cm<br/>`;
      if (properties.surface) details += `Surface: ${properties.surface}m²<br/>`;
      if (properties.densite) details += `Densité: ${properties.densite}<br/>`;
      if (properties.type) details += `Type: ${properties.type}<br/>`;
      if (properties.profondeur) details += `Profondeur: ${properties.profondeur}m<br/>`;
      if (properties.debit) details += `Débit: ${properties.debit}L/h<br/>`;
      if (properties.pression) details += `Pression: ${properties.pression}bar<br/>`;
      if (properties.materiau) details += `Matériau: ${properties.materiau}<br/>`;
      if (properties.longueur) details += `Longueur: ${properties.longueur}m<br/>`;
      if (properties.volume) details += `Volume: ${properties.volume}L<br/>`;
      if (properties.site_nom) details += `<br/><em>Site: ${properties.site_nom}</em><br/>`;
      if (properties.sous_site_nom) details += `<em>Sous-site: ${properties.sous_site_nom}</em><br/>`;
      if (properties.last_intervention_date) {
        details += `<br/>Dernière intervention: ${new Date(properties.last_intervention_date).toLocaleDateString('fr-FR')}<br/>`;
      }

      return `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="font-weight: bold; font-size: 14px; margin: 0 0 8px 0;">${name}</h3>
          <div style="font-size: 12px; color: #374151;">${details}</div>
        </div>
      `;
    };

    // Initial load
    fetchAndUpdateMarkers();

    // Update on map move/zoom
    map.on('zoomend', fetchAndUpdateMarkers);
    map.on('moveend', fetchAndUpdateMarkers);

    return () => {
      map.off('zoomend', fetchAndUpdateMarkers);
      map.off('moveend', fetchAndUpdateMarkers);
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, enabled, visibleLayers]);

  return null;
};

export default MarkerCluster;
