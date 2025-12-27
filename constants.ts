import { LayerConfig, MapLayerType } from './types';
import { Leaf, Sprout, Wheat, Globe, Trees, Mountain, Palmtree } from 'lucide-react';

export const INITIAL_POSITION = {
  lat: 32.2160, // UM6P Campus, Benguerir, Morocco
  lng: -7.9370,
  zoom: 15
};

export const MAP_LAYERS: Record<MapLayerType, LayerConfig> = {
  [MapLayerType.PLAN]: {
    id: MapLayerType.PLAN,
    name: "Plan IGN",
    url: "https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19
  },
  [MapLayerType.SATELLITE]: {
    id: MapLayerType.SATELLITE,
    name: "Photographies Aériennes",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxNativeZoom: 17
  },
  [MapLayerType.TERRAIN]: {
    id: MapLayerType.TERRAIN,
    name: "Relief",
    url: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxNativeZoom: 17
  },
  [MapLayerType.NAVIGATION]: {
    id: MapLayerType.NAVIGATION,
    name: "Navigation",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    maxNativeZoom: 19
  }
};

// Légende Végétation - Correspond EXACTEMENT aux types de la base de données Django
// Les noms doivent matcher avec obj.properties.object_type de l'API
// Palette de couleurs variée pour une meilleure distinction visuelle
export const VEG_LEGEND = [
  { type: "Arbre", color: "#059669", icon: Trees },      // Vert forêt (émeraude foncé)
  { type: "Gazon", color: "#84cc16", icon: Globe },      // Vert lime vif (conservé)
  { type: "Palmier", color: "#f97316", icon: Palmtree }, // Orange tropical
  { type: "Arbuste", color: "#10b981", icon: Leaf },     // Émeraude
  { type: "Vivace", color: "#ec4899", icon: Sprout },    // Rose/Magenta (fleurs)
  { type: "Cactus", color: "#06b6d4", icon: Mountain },  // Cyan/Teal (bleu-vert)
  { type: "Graminee", color: "#eab308", icon: Wheat }    // Jaune doré (herbes)
];

// Légende Hydrologie - Correspond EXACTEMENT aux types de la base de données Django
export const HYDRO_LEGEND = [
  { type: "Puit", color: "#0ea5e9" },
  { type: "Pompe", color: "#06b6d4" },
  { type: "Vanne", color: "#14b8a6" },
  { type: "Clapet", color: "#0891b2" },
  { type: "Canalisation", color: "#0284c7" },
  { type: "Aspersion", color: "#38bdf8" },
  { type: "Goutte", color: "#7dd3fc" },
  { type: "Ballon", color: "#0369a1" }
];

// Légende Sites
export const SITE_LEGEND = [
  { type: "Site", color: "#3b82f6" }
];

// Légende Réclamations - Couleurs par statut (synchronisé avec le backend)
export const RECLAMATION_STATUS_COLORS: Record<string, string> = {
  'NOUVELLE': '#ef4444',        // Rouge vif - nouvelle réclamation
  'PRISE_EN_COMPTE': '#f97316', // Orange - prise en compte
  'EN_COURS': '#eab308',        // Jaune - en cours de traitement
  'RESOLUE': '#22c55e',         // Vert - résolue, en attente de clôture
  'REJETEE': '#6b7280',         // Gris - rejetée
};

export const RECLAMATION_STATUS_LABELS: Record<string, string> = {
  'NOUVELLE': 'Nouvelle',
  'PRISE_EN_COMPTE': 'Prise en compte',
  'EN_COURS': 'En cours',
  'RESOLUE': 'Résolue',
  'REJETEE': 'Rejetée',
};

export const RECLAMATION_LEGEND = [
  { type: "NOUVELLE", color: "#ef4444", label: "Nouvelle" },
  { type: "PRISE_EN_COMPTE", color: "#f97316", label: "Prise en compte" },
  { type: "EN_COURS", color: "#eab308", label: "En cours" },
  { type: "RESOLUE", color: "#22c55e", label: "Résolue" },
];