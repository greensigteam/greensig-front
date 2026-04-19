import { LayerConfig, MapLayerType } from './types';
import { Leaf, Sprout, Wheat, Globe, Trees, Mountain, Palmtree } from 'lucide-react';

export const INITIAL_POSITION = {
  lat: 32.216, // UM6P Campus, Benguerir, Morocco
  lng: -7.937,
  zoom: 15,
};

export const MAP_LAYERS: Record<MapLayerType, LayerConfig> = {
  [MapLayerType.PLAN]: {
    id: MapLayerType.PLAN,
    name: 'Plan IGN',
    url: 'https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution:
      '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
  },
  [MapLayerType.SATELLITE]: {
    id: MapLayerType.SATELLITE,
    name: 'Photographies Aériennes',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxNativeZoom: 17,
  },
  [MapLayerType.TERRAIN]: {
    id: MapLayerType.TERRAIN,
    name: 'Relief',
    url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxNativeZoom: 17,
  },
  [MapLayerType.NAVIGATION]: {
    id: MapLayerType.NAVIGATION,
    name: 'Navigation',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    maxNativeZoom: 19,
  },
};

// Légende Végétation - Correspond EXACTEMENT aux types de la base de données Django
// Les noms doivent matcher avec obj.properties.object_type de l'API
// Palette de couleurs variée pour une meilleure distinction visuelle
export const VEG_LEGEND = [
  { type: 'Arbre', color: '#059669', icon: Trees }, // Vert forêt (émeraude foncé)
  { type: 'Gazon', color: '#84cc16', icon: Globe }, // Vert lime vif (conservé)
  { type: 'Palmier', color: '#f97316', icon: Palmtree }, // Orange tropical
  { type: 'Arbuste', color: '#10b981', icon: Leaf }, // Émeraude
  { type: 'Vivace', color: '#ec4899', icon: Sprout }, // Rose/Magenta (fleurs)
  { type: 'Cactus', color: '#06b6d4', icon: Mountain }, // Cyan/Teal (bleu-vert)
  { type: 'Graminee', color: '#eab308', icon: Wheat }, // Jaune doré (herbes)
];

// Légende Hydrologie - Correspond EXACTEMENT aux types de la base de données Django
export const HYDRO_LEGEND = [
  { type: 'Puit', color: '#0ea5e9' },
  { type: 'Pompe', color: '#06b6d4' },
  { type: 'Vanne', color: '#14b8a6' },
  { type: 'Clapet', color: '#0891b2' },
  { type: 'Canalisation', color: '#0284c7' },
  { type: 'Aspersion', color: '#38bdf8' },
  { type: 'Goutte', color: '#7dd3fc' },
  { type: 'Ballon', color: '#0369a1' },
];

// Légende Sites
export const SITE_LEGEND = [{ type: 'Site', color: '#3b82f6' }];

// Légende Réclamations - Couleurs par statut (synchronisé avec le backend)
export const RECLAMATION_STATUS_COLORS: Record<string, string> = {
  NOUVELLE: '#ef4444', // Rouge - en attente de lecture
  EN_COURS: '#f97316', // Orange - en attente de réalisation
  RESOLUE: '#22c55e', // Vert - tâche terminée côté administrateur
  EN_ATTENTE_VALIDATION_CLOTURE: '#10b981', // Vert clair - en attente de validation client
  INTERVENTION_REFUSEE: '#dc2626', // Rouge foncé - intervention refusée par le client
  CLOTUREE: '#22c55e', // Vert - clôturée
  REJETEE: '#6b7280', // Gris - rejetée
};

export const RECLAMATION_STATUS_LABELS: Record<string, string> = {
  NOUVELLE: 'En attente de lecture',
  EN_COURS: 'En attente de réalisation',
  RESOLUE: 'Tâche terminée côté administrateur',
  EN_ATTENTE_VALIDATION_CLOTURE: 'En attente de validation de clôture',
  INTERVENTION_REFUSEE: 'Intervention refusée par le client',
  CLOTUREE: 'Clôturée',
  REJETEE: 'Rejetée',
};

// Template d'URL tuile satellite utilisée par les rapports PDF (fallback centroid
// quand le rendu polygone échoue). Centralisé ici pour permettre un override
// facile (serveur privé, proxy cache) sans toucher le code de génération.
// Remplacer {z}, {x}, {y} côté appelant.
export const PDF_SATELLITE_TILE_URL_TEMPLATE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

// Timeout par défaut pour loadImageAsBase64 (tuiles + photos réclamations).
// Au-delà, la promesse résout à `null` et le PDF continue sans l'image.
export const PDF_IMAGE_LOAD_TIMEOUT_MS = 5000;

export const RECLAMATION_LEGEND = [
  { type: 'NOUVELLE', color: '#ef4444', label: 'En attente de lecture' },
  { type: 'EN_COURS', color: '#f97316', label: 'En attente de réalisation' },
  {
    type: 'EN_ATTENTE_VALIDATION_CLOTURE',
    color: '#22c55e',
    label: 'En attente de validation de clôture',
  },
  { type: 'CLOTUREE', color: '#22c55e', label: 'Clôturée' },
];
