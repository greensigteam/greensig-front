
export type Role = 'ADMIN' | 'OPERATEUR' | 'CLIENT';
export type ViewState = 'LOGIN' | 'DASHBOARD' | 'MAP' | 'INVENTORY' | 'PLANNING' | 'INTERVENTIONS' | 'CLAIMS' | 'TEAMS' | 'USERS' | 'REPORTING' | 'CLIENT_PORTAL';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface KPI {
  label: string;
  value: string | number;
  change: number; // percentage
  trend: 'up' | 'down' | 'neutral';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  status: 'DISPONIBLE' | 'EN_MAINTENANCE' | 'HORS_SERVICE';
  location: string;
  lastService: string;
  nextService?: string;
  serialNumber?: string;
  description?: string; // Added for User 2.2.3
}

export interface Task {
  id: string;
  title: string;
  type: 'TAILLE' | 'TONTE' | 'NETTOYAGE' | 'PLANTATION' | 'ARROSAGE' | 'TRAITEMENT';
  status: 'A_FAIRE' | 'EN_COURS' | 'TERMINE';
  date: string;
  assignee?: string;
  recurrence?: string; // e.g., "1x/semaine"
  duration?: string; // Added for User 3.3.2
  zone?: string; // Added for User 3.3.1
}

export interface Claim {
  id: string;
  title: string;
  status: 'NOUVEAU' | 'EN_COURS' | 'RESOLU' | 'EN_RETARD';
  priority: 'HAUTE' | 'MOYENNE' | 'BASSE';
  source: 'CLIENT' | 'INTERNE';
  author: string;
  date: string;
  deadline?: string;
  autoRating?: number; // 5/5 if auto-closed
  location?: string;
}

export type HRStatus = 'DISPONIBLE' | 'OCCUPE' | 'MALADIE' | 'CONGE' | 'ACCIDENT' | 'ABSENT';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: HRStatus;
  avatar: string;
  productivity?: string; // e.g. "450 m²/h"
  monthlyInterventions?: number;
  skills?: string[]; // Added for User 5.5.2
}

// Map Types
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapSearchResult {
  name: string;
  coordinates: Coordinates;
  description: string;
  zoom?: number;
}

export enum MapLayerType {
  PLAN = 'PLAN',
  SATELLITE = 'SATELLITE',
  TERRAIN = 'TERRAIN',
  NAVIGATION = 'NAVIGATION'
}

export interface LayerConfig {
  id: MapLayerType;
  name: string;
  url: string;
  attribution: string;
  maxNativeZoom?: number;
}

export interface AnalysisResult {
  title: string;
  content: string;
  facts: string[];
}

export interface OverlayState {
  parcels: boolean;
  networks: boolean;
  greenSpaces: boolean;
  works: boolean;
}

// User 1.1.5 - Detailed Object Interface
export interface MapObjectDetail {
  id: string;
  type: 'PARCELLE' | 'RESEAU' | 'ESPACE_VERT' | 'CHANTIER' | 'Site';
  title: string;
  subtitle: string;
  attributes: Record<string, string>;
  lastIntervention?: string;
  nextIntervention?: string;
}
