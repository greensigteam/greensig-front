// Mock Data Service for GreenSIG
// Provides simulated data for frontend development without backend

import { Coordinates } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface Site {
  id: string;
  name: string;
  type: 'villa' | 'parc' | 'zone_commune';
  address: string;
  coordinates: Coordinates;
  surface: number; // m²
  client: string;
}

export interface InventoryItem {
  id: string;
  type: 'arbre' | 'gazon' | 'reseau' | 'equipement' | 'parcelle' | 'palmier' | 'arbuste' | 'vivace' | 'cactus' | 'graminee' | 'puit' | 'pompe' | 'vanne' | 'clapet' | 'canalisation' | 'aspersion' | 'goutte' | 'ballon';
  code: string;
  name: string;
  siteId: string;
  zone: string;
  state: 'bon' | 'moyen' | 'mauvais' | 'critique';
  surface?: number; // m² (pour gazon, parcelles)
  species?: string; // (pour arbres)
  height?: number; // m (pour arbres)
  diameter?: number; // cm (pour arbres)
  coordinates: Coordinates;
  lastIntervention?: string; // ISO date
  photos: string[];
}

export interface Intervention {
  id: string;
  title: string;
  type: 'tonte' | 'taille' | 'arrosage' | 'traitement' | 'plantation' | 'entretien';
  siteId: string;
  zone: string;
  status: 'planifiee' | 'en_cours' | 'terminee' | 'non_realisee';
  priority: 'basse' | 'moyenne' | 'haute';
  scheduledDate: string; // ISO date
  scheduledTime?: string; // HH:mm
  duration: number; // minutes
  teamId: string;
  assignedTo: string[];
  description: string;
  coordinates: Coordinates;
  startTime?: string; // ISO datetime
  endTime?: string; // ISO datetime
  photosBefore: string[];
  photosAfter: string[];
  comments?: string;
  materialsUsed?: string;
  actualDuration?: number; // minutes
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'chef' | 'operateur';
  skills: string[]; // ['tonte', 'taille', 'irrigation', etc.]
  available: boolean;
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  members: string[]; // TeamMember IDs
  active: boolean;
}

// ============================================================================
// MOCK DATA
// ============================================================================

export const MOCK_SITES: Site[] = [
  {
    id: 'site-1',
    name: 'Villa Al Amal',
    type: 'villa',
    address: 'Hay Riad, Rabat',
    coordinates: { lat: 33.9716, lng: -6.8498 },
    surface: 2500,
    client: 'M. Ahmed Benali'
  },
  {
    id: 'site-2',
    name: 'Villa Les Jardins',
    type: 'villa',
    address: 'Souissi, Rabat',
    coordinates: { lat: 33.9856, lng: -6.8632 },
    surface: 3200,
    client: 'Mme. Fatima Alaoui'
  },
  {
    id: 'site-3',
    name: 'Parc Municipal',
    type: 'parc',
    address: 'Centre Ville, Rabat',
    coordinates: { lat: 34.0209, lng: -6.8416 },
    surface: 15000,
    client: 'Commune de Rabat'
  }
];

export const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    type: 'arbre',
    code: 'ARB-001',
    name: 'Palmier',
    siteId: 'site-1',
    zone: 'Jardin principal',
    state: 'bon',
    species: 'Phoenix dactylifera',
    height: 8,
    diameter: 45,
    coordinates: { lat: 33.9716, lng: -6.8498 },
    lastIntervention: '2024-11-15',
    photos: ['https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400']
  },
  {
    id: 'inv-2',
    type: 'gazon',
    code: 'GAZ-001',
    name: 'Pelouse principale',
    siteId: 'site-1',
    zone: 'Jardin principal',
    state: 'bon',
    surface: 500,
    coordinates: { lat: 33.9718, lng: -6.8500 },
    lastIntervention: '2024-11-20',
    photos: []
  },
  {
    id: 'inv-3',
    type: 'arbre',
    code: 'ARB-002',
    name: 'Olivier',
    siteId: 'site-2',
    zone: 'Entrée',
    state: 'moyen',
    species: 'Olea europaea',
    height: 4,
    diameter: 30,
    coordinates: { lat: 33.9856, lng: -6.8632 },
    lastIntervention: '2024-10-10',
    photos: ['https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400']
  },
  {
    id: 'inv-4',
    type: 'equipement',
    code: 'EQP-001',
    name: 'Système irrigation automatique',
    siteId: 'site-1',
    zone: 'Jardin principal',
    state: 'bon',
    coordinates: { lat: 33.9717, lng: -6.8499 },
    lastIntervention: '2024-11-01',
    photos: []
  }
];

export const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'member-1',
    name: 'Hassan Idrissi',
    role: 'chef',
    skills: ['tonte', 'taille', 'irrigation', 'traitement'],
    available: true
  },
  {
    id: 'member-2',
    name: 'Youssef Amrani',
    role: 'operateur',
    skills: ['tonte', 'arrosage'],
    available: true
  },
  {
    id: 'member-3',
    name: 'Karim Benjelloun',
    role: 'operateur',
    skills: ['taille', 'plantation'],
    available: false // En congé
  },
  {
    id: 'member-4',
    name: 'Omar Tazi',
    role: 'chef',
    skills: ['tonte', 'taille', 'irrigation', 'plantation'],
    available: true
  }
];

export const MOCK_TEAMS: Team[] = [
  {
    id: 'team-1',
    name: 'Équipe A - Entretien',
    leaderId: 'member-1',
    members: ['member-1', 'member-2'],
    active: true
  },
  {
    id: 'team-2',
    name: 'Équipe B - Plantation',
    leaderId: 'member-4',
    members: ['member-4', 'member-3'],
    active: true
  }
];

export const MOCK_INTERVENTIONS: Intervention[] = [
  {
    id: 'int-1',
    title: 'Tonte pelouse Villa Al Amal',
    type: 'tonte',
    siteId: 'site-1',
    zone: 'Jardin principal',
    status: 'planifiee',
    priority: 'moyenne',
    scheduledDate: '2024-12-01',
    scheduledTime: '09:00',
    duration: 120,
    teamId: 'team-1',
    assignedTo: ['member-1', 'member-2'],
    description: 'Tonte régulière de la pelouse principale',
    coordinates: { lat: 33.9718, lng: -6.8500 },
    photosBefore: [],
    photosAfter: []
  },
  {
    id: 'int-2',
    title: 'Taille olivier Villa Les Jardins',
    type: 'taille',
    siteId: 'site-2',
    zone: 'Entrée',
    status: 'en_cours',
    priority: 'haute',
    scheduledDate: '2024-11-30',
    scheduledTime: '08:00',
    duration: 90,
    teamId: 'team-2',
    assignedTo: ['member-4'],
    description: 'Taille de formation de l\'olivier',
    coordinates: { lat: 33.9856, lng: -6.8632 },
    startTime: '2024-11-30T08:15:00Z',
    photosBefore: ['https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400'],
    photosAfter: []
  },
  {
    id: 'int-3',
    title: 'Arrosage Parc Municipal',
    type: 'arrosage',
    siteId: 'site-3',
    zone: 'Zone Est',
    status: 'terminee',
    priority: 'basse',
    scheduledDate: '2024-11-28',
    scheduledTime: '06:00',
    duration: 180,
    teamId: 'team-1',
    assignedTo: ['member-2'],
    description: 'Arrosage matinal zone Est',
    coordinates: { lat: 34.0209, lng: -6.8416 },
    startTime: '2024-11-28T06:00:00Z',
    endTime: '2024-11-28T09:00:00Z',
    photosBefore: [],
    photosAfter: [],
    comments: 'Arrosage effectué sans problème',
    actualDuration: 180
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getSiteById = (id: string): Site | undefined => {
  return MOCK_SITES.find(site => site.id === id);
};

export const getInventoryBySite = (siteId: string): InventoryItem[] => {
  return MOCK_INVENTORY.filter(item => item.siteId === siteId);
};

export const getInterventionsBySite = (siteId: string): Intervention[] => {
  return MOCK_INTERVENTIONS.filter(int => int.siteId === siteId);
};

export const getInterventionsByStatus = (status: Intervention['status']): Intervention[] => {
  return MOCK_INTERVENTIONS.filter(int => int.status === status);
};

export const getInterventionsToday = (): Intervention[] => {
  const today = new Date().toISOString().split('T')[0];
  return MOCK_INTERVENTIONS.filter(int => int.scheduledDate === today);
};

export const getTeamById = (id: string): Team | undefined => {
  return MOCK_TEAMS.find(team => team.id === id);
};

export const getTeamMembers = (teamId: string): TeamMember[] => {
  const team = getTeamById(teamId);
  if (!team) return [];
  return MOCK_TEAM_MEMBERS.filter(member => team.members.includes(member.id));
};
