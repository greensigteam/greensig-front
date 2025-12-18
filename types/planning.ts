// ============================================================================
// TYPES - Module Planification (api_planification)
// ============================================================================

import { Client, EquipeList, OperateurList } from './users';

// ============================================================================
// ENUMERATIONS
// ============================================================================

export type PrioriteTache = 1 | 2 | 3 | 4 | 5;

export type StatutTache = 'PLANIFIEE' | 'NON_DEBUTEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export type FrequenceRecurrence = 'daily' | 'weekly' | 'monthly';

export type RoleParticipation = 'CHEF' | 'MEMBRE';

// ============================================================================
// LABELS
// ============================================================================

export const PRIORITE_LABELS: Record<PrioriteTache, string> = {
    1: 'Très basse',
    2: 'Basse',
    3: 'Moyenne',
    4: 'Haute',
    5: 'Urgent'
};

export const STATUT_TACHE_LABELS: Record<StatutTache, string> = {
    PLANIFIEE: 'Planifiée',
    NON_DEBUTEE: 'Non débutée',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée'
};

export const ROLE_PARTICIPATION_LABELS: Record<RoleParticipation, string> = {
    CHEF: 'Chef d\'équipe',
    MEMBRE: 'Membre'
};

// ============================================================================
// OBJETS & TYPES
// ============================================================================

export interface TypeTache {
    id: number;
    nom_tache: string;
    symbole: string;
    description: string;
    productivite_theorique: number | null;
}

// ============================================================================
// RATIOS DE PRODUCTIVITE
// ============================================================================

export type UniteMesure = 'm2' | 'ml' | 'unite';

export const UNITE_MESURE_LABELS: Record<UniteMesure, string> = {
    'm2': 'Mètres carrés (m²)',
    'ml': 'Mètres linéaires (ml)',
    'unite': 'Unités'
};

export const TYPES_OBJETS = [
    'Arbre', 'Palmier', 'Gazon', 'Arbuste', 'Vivace', 'Cactus', 'Graminee',
    'Puit', 'Pompe', 'Vanne', 'Clapet', 'Ballon',
    'Canalisation', 'Aspersion', 'Goutte'
] as const;

export type TypeObjet = typeof TYPES_OBJETS[number];

export interface RatioProductivite {
    id: number;
    id_type_tache: number;
    type_tache_nom: string;
    type_objet: string;
    unite_mesure: UniteMesure;
    ratio: number;
    description: string;
    actif: boolean;
}

export interface RatioProductiviteCreate {
    id_type_tache: number;
    type_objet: string;
    unite_mesure: UniteMesure;
    ratio: number;
    description?: string;
    actif?: boolean;
}

export interface ObjetSimple {
    id: number;
    site: string;
    sous_site: string;
    nom_type: string;
    display: string;
}

export interface ParticipationTache {
    id: number;
    id_tache: number;
    id_operateur: number;
    role: RoleParticipation;
    heures_travaillees: number;
    realisation: string;
    operateur_nom: string;
}

export interface RecurrenceParams {
    frequence: FrequenceRecurrence;
    interval: number;
    jours?: string[]; // ["MO", "WE"]
    date_debut?: string;
    date_fin?: string; // YYYY-MM-DD
    nombre_occurrences?: number;
}

// ============================================================================
// TACHE
// ============================================================================

export interface Tache {
    id: number;

    // Relations détaillées
    client_detail: Client | null;
    type_tache_detail: TypeTache;
    equipe_detail: EquipeList | null; // Legacy single team (backwards compatibility)
    equipes_detail: EquipeList[]; // Multi-teams (US-PLAN-013)
    participations_detail: ParticipationTache[];
    objets_detail: ObjetSimple[];

    // Champs
    date_debut_planifiee: string; // ISO DateTime
    date_fin_planifiee: string; // ISO DateTime
    date_echeance: string | null; // Date

    priorite: PrioriteTache;
    commentaires: string;

    date_affectation: string | null;
    date_debut_reelle: string | null;
    date_fin_reelle: string | null;
    duree_reelle_minutes: number | null;
    charge_estimee_heures: number | null;
    charge_manuelle: boolean;

    description_travaux: string;

    statut: StatutTache;
    note_qualite: number | null;

    parametres_recurrence: RecurrenceParams | null;
    id_recurrence_parent: number | null;

    notifiee: boolean;
    confirmee: boolean;
    deleted_at: string | null;
    reclamation?: number | null;
    reclamation_numero?: string;
}

export interface TacheCreate {
    id_client: number | null;
    id_type_tache: number;
    id_equipe?: number | null; // Legacy single team (backwards compatibility)
    equipes_ids?: number[]; // Multi-teams (US-PLAN-013)

    date_debut_planifiee: string;
    date_fin_planifiee: string;

    priorite?: PrioriteTache;
    commentaires?: string;

    parametres_recurrence?: RecurrenceParams | null;

    // Pour l'inventaire (ManyToMany IDs)
    objets?: number[];

    // Lien Réclamation
    reclamation?: number | null;

    // Surcharge manuelle de la charge estimée
    charge_estimee_heures?: number | null;
}

export interface TacheUpdate {
    id_equipe?: number | null; // Legacy single team
    equipes_ids?: number[]; // Multi-teams (US-PLAN-013)
    date_debut_planifiee?: string;
    date_fin_planifiee?: string;
    priorite?: PrioriteTache;
    statut?: StatutTache;
    commentaires?: string;
    parametres_recurrence?: RecurrenceParams | null;
    objets?: number[];
    // Surcharge manuelle de la charge estimée
    charge_estimee_heures?: number | null;
}

export interface ParticipationCreate {
    id_operateur: number;
    role: RoleParticipation;
    heures_travaillees?: number;
}

// ============================================================================
// COULEURS UI
// ============================================================================

export const STATUT_TACHE_COLORS: Record<StatutTache, { bg: string; text: string }> = {
    PLANIFIEE: { bg: 'bg-blue-100', text: 'text-blue-800' },
    NON_DEBUTEE: { bg: 'bg-gray-100', text: 'text-gray-800' },
    EN_COURS: { bg: 'bg-orange-100', text: 'text-orange-800' },
    TERMINEE: { bg: 'bg-green-100', text: 'text-green-800' },
    ANNULEE: { bg: 'bg-red-100', text: 'text-red-800' }
};

export const PRIORITE_COLORS: Record<PrioriteTache, { bg: string; text: string }> = {
    1: { bg: 'bg-green-50', text: 'text-green-700' },
    2: { bg: 'bg-green-100', text: 'text-green-800' },
    3: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    4: { bg: 'bg-orange-100', text: 'text-orange-800' },
    5: { bg: 'bg-red-100', text: 'text-red-800' }
};
