import type { Coordinates, GeoJSONGeometry } from '../types';

export type InventoryItemType =
  | 'arbre'
  | 'gazon'
  | 'reseau'
  | 'equipement'
  | 'parcelle'
  | 'palmier'
  | 'arbuste'
  | 'vivace'
  | 'cactus'
  | 'graminee'
  | 'puit'
  | 'pompe'
  | 'vanne'
  | 'clapet'
  | 'canalisation'
  | 'aspersion'
  | 'goutte'
  | 'ballon';

export type InventoryItemState = 'bon' | 'moyen' | 'mauvais' | 'critique';

export interface InventoryItem {
  id: string;
  type: InventoryItemType;
  code: string;
  name: string;
  siteId: string;
  zone: string;
  state: InventoryItemState;
  surface?: number;
  species?: string;
  height?: number;
  diameter?: number;
  coordinates: Coordinates;
  lastIntervention?: string;
  photos: string[];
}

/**
 * Données brutes renvoyées par les endpoints `/api/<type>/<id>/` qui
 * sérialisent les objets GIS au format GeoJSON Feature.
 * Les attributs métier vivent dans `properties`, la géométrie dans `geometry`.
 */
export interface InventoryFeature {
  id?: string | number;
  type?: string;
  geometry?: GeoJSONGeometry | null;
  properties?: Record<string, unknown> & {
    id?: string | number;
    nom?: string;
    marque?: string;
    etat?: InventoryItemState;
    photos?: string[];
    site_nom?: string;
    sous_site_nom?: string;
  };
}

/**
 * Vue enrichie utilisée par `InventoryDetailPage` : on conserve la Feature
 * GeoJSON brute (`properties`, `geometry`) et on y agrège quelques champs
 * « plats » (id, name, type, state, coordinates, photos) pour l'affichage.
 */
export type InventoryDetailItem = InventoryFeature & {
  id: string;
  name: string;
  type: string;
  state: InventoryItemState;
  coordinates: Coordinates;
  photos: string[];
};
