import logger from './logger';
import { apiFetch, handleResponse } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ==============================================================================
// TYPES
// ==============================================================================

export interface Statistics {
  hierarchy: {
    total_sites: number;
    total_sous_sites: number;
    active_sites: number;
  };
  vegetation: {
    arbres: {
      total: number;
      by_taille: Record<string, number>;
      top_families: Array<{ famille: string; count: number }>;
    };
    gazons: {
      total: number;
      total_area_sqm: number;
    };
    palmiers: {
      total: number;
      by_taille: Record<string, number>;
    };
  };
  hydraulique: {
    puits: {
      total: number;
      avg_profondeur: number;
      max_profondeur: number;
    };
    pompes: {
      total: number;
      avg_puissance: number;
      avg_debit: number;
    };
  };
  global: {
    total_objets: number;
    total_vegetation: number;
    total_hydraulique: number;
  };
  superviseur_stats?: {
    taches_today: number;
    taches_en_cours: number;
    taches_planifiees: number;
    taches_terminees: number;
    absences_today: number;
    equipes_count: number;
  };
}

// ==============================================================================
// API
// ==============================================================================

export async function fetchStatistics(): Promise<Statistics> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/reporting/`);
    const data = await handleResponse<any>(response);

    return {
      hierarchy: {
        total_sites: data.inventaire?.sites?.total ?? 0,
        total_sous_sites: 0,
        active_sites: data.inventaire?.sites?.actifs ?? 0,
      },
      vegetation: {
        arbres: {
          total: data.inventaire?.vegetation?.par_type?.Arbres ?? 0,
          by_taille: {},
          top_families: [],
        },
        gazons: { total: data.inventaire?.vegetation?.par_type?.Gazons ?? 0, total_area_sqm: 0 },
        palmiers: { total: data.inventaire?.vegetation?.par_type?.Palmiers ?? 0, by_taille: {} },
      },
      hydraulique: {
        puits: {
          total: data.inventaire?.hydraulique?.par_type?.Puits ?? 0,
          avg_profondeur: 0,
          max_profondeur: 0,
        },
        pompes: {
          total: data.inventaire?.hydraulique?.par_type?.Pompes ?? 0,
          avg_puissance: 0,
          avg_debit: 0,
        },
      },
      global: {
        total_objets: data.inventaire?.total_objets ?? 0,
        total_vegetation: data.inventaire?.vegetation?.total ?? 0,
        total_hydraulique: data.inventaire?.hydraulique?.total ?? 0,
      },
      superviseur_stats: data.taches
        ? {
            taches_today: 0,
            taches_en_cours: data.taches.en_cours ?? 0,
            taches_planifiees: data.taches.planifiees ?? 0,
            taches_terminees: data.taches.terminees ?? 0,
            absences_today: 0,
            equipes_count: data.equipes?.total ?? 0,
          }
        : undefined,
    } as Statistics;
  } catch (error) {
    logger.error('Erreur fetchStatistics:', error);
    throw error;
  }
}
