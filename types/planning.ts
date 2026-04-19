// ============================================================================
// TYPES - Module Planification (api_planification)
// ============================================================================

import { Client, EquipeList } from './users';

// ============================================================================
// ENUMERATIONS
// ============================================================================

export type PrioriteTache = 1 | 2 | 3 | 4 | 5;

// ✅ SIMPLIFIÉ: Plus de EN_RETARD ni EXPIREE
// Une tâche reste PLANIFIEE jusqu'à démarrage explicite
export type StatutTache = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export type EtatValidation = 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE';

// ✅ Motifs d'annulation de tâche (justification obligatoire)
export type MotifAnnulationTache =
  | 'METEO'
  | 'ABSENCE'
  | 'EQUIPEMENT'
  | 'CLIENT'
  | 'URGENCE'
  | 'DOUBLON'
  | 'ERREUR'
  | 'AUTRE';

export const MOTIF_ANNULATION_TACHE_LABELS: Record<MotifAnnulationTache, string> = {
  METEO: 'Conditions météorologiques',
  ABSENCE: 'Absence équipe',
  EQUIPEMENT: 'Problème équipement',
  CLIENT: 'Demande client',
  URGENCE: 'Réaffectation urgente',
  DOUBLON: 'Tâche en doublon',
  ERREUR: 'Erreur de planification',
  AUTRE: 'Autre motif',
};

export type RoleParticipation = 'CHEF' | 'MEMBRE';

// ============================================================================
// LABELS
// ============================================================================

export const PRIORITE_LABELS: Record<PrioriteTache, string> = {
  1: 'Très basse',
  2: 'Basse',
  3: 'Moyenne',
  4: 'Haute',
  5: 'Urgent',
};

// ✅ SIMPLIFIÉ: Plus de EN_RETARD ni EXPIREE
export const STATUT_TACHE_LABELS: Record<StatutTache, string> = {
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
};

export const ETAT_VALIDATION_LABELS: Record<EtatValidation, string> = {
  EN_ATTENTE: 'En attente de validation',
  VALIDEE: 'Validée',
  REJETEE: 'Rejetée',
};

export const ROLE_PARTICIPATION_LABELS: Record<RoleParticipation, string> = {
  CHEF: "Chef d'équipe",
  MEMBRE: 'Membre',
};

// ============================================================================
// OBJETS & TYPES
// ============================================================================

export type UniteProductivite = 'm2' | 'ml' | 'unite' | 'cuvettes' | 'arbres';

export const UNITE_PRODUCTIVITE_LABELS: Record<UniteProductivite, string> = {
  m2: 'Mètres carrés (m²)',
  ml: 'Mètres linéaires (ml)',
  unite: 'Unités',
  cuvettes: 'Cuvettes',
  arbres: 'Arbres',
};

export interface TypeTache {
  id: number;
  nom_tache: string;
  symbole: string;
  description: string;
  productivite_theorique: number | null;
  unite_productivite?: UniteProductivite;
}

export interface TypeTacheCreate {
  nom_tache: string;
  symbole?: string;
  description?: string;
  productivite_theorique?: number | null;
  unite_productivite?: UniteProductivite;
}

export interface TypeTacheWithRatios extends TypeTache {
  ratios: RatioProductivite[];
}

// ============================================================================
// RATIOS DE PRODUCTIVITE
// ============================================================================

export type UniteMesure = 'm2' | 'ml' | 'unite';

export const UNITE_MESURE_LABELS: Record<UniteMesure, string> = {
  m2: 'Mètres carrés (m²)',
  ml: 'Mètres linéaires (ml)',
  unite: 'Unités',
};

export const TYPES_OBJETS = [
  'Arbre',
  'Palmier',
  'Gazon',
  'Arbuste',
  'Vivace',
  'Cactus',
  'Graminee',
  'Puit',
  'Pompe',
  'Vanne',
  'Clapet',
  'Ballon',
  'Canalisation',
  'Aspersion',
  'Goutte',
] as const;

export type TypeObjet = (typeof TYPES_OBJETS)[number];

export interface RatioProductivite {
  id: number;
  id_type_tache: number;
  type_tache_nom: string;
  type_objet: string;
  unite_mesure: UniteMesure;
  ratio: number;
  description: string;
  actif: boolean;
  created_at?: string;
  updated_at?: string;
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
  site?: number; // Legacy: Site FK (ID) - kept for backward compatibility
  site_id?: number; // New: Site FK (ID) from ObjetMinimalSerializer
  site_nom: string; // Site name
  sous_site: number | null; // SousSite FK (ID)
  sous_site_nom?: string; // SousSite name (if available)
  nom_type?: string; // Object type name (optional, from get_nom_type)
  display?: string; // Display string (optional)
  superficie_calculee?: number; // ✅ NEW: Surfacic Data
  etat?: string; // ✅ NEW: State
  famille?: string; // ✅ NEW: Family
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

// ============================================================================
// DISTRIBUTION DE CHARGE (Multi-Day Tasks)
// ============================================================================

// ✅ SIMPLIFIÉ: 5 statuts (plus de EN_RETARD)
export type StatusDistribution = 'NON_REALISEE' | 'EN_COURS' | 'REALISEE' | 'REPORTEE' | 'ANNULEE';

// ✅ SIMPLIFIÉ: Plus de EN_RETARD
export const STATUS_DISTRIBUTION_LABELS: Record<StatusDistribution, string> = {
  NON_REALISEE: 'Non Réalisée',
  EN_COURS: 'En Cours',
  REALISEE: 'Réalisée',
  REPORTEE: 'Reportée',
  ANNULEE: 'Annulée',
};

// ✅ SIMPLIFIÉ: Plus de EN_RETARD
export const STATUS_DISTRIBUTION_COLORS: Record<
  StatusDistribution,
  { bg: string; text: string; border?: string }
> = {
  NON_REALISEE: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  EN_COURS: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  REALISEE: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  REPORTEE: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  ANNULEE: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

// ✅ Motifs de report/annulation
export type MotifDistribution = 'METEO' | 'ABSENCE' | 'EQUIPEMENT' | 'CLIENT' | 'URGENCE' | 'AUTRE';

export const MOTIF_DISTRIBUTION_LABELS: Record<MotifDistribution, string> = {
  METEO: 'Conditions météorologiques',
  ABSENCE: 'Absence équipe',
  EQUIPEMENT: 'Problème équipement',
  CLIENT: 'Demande client',
  URGENCE: 'Réaffectation urgente',
  AUTRE: 'Autre motif',
};

// ✅ SIMPLIFIÉ: Plus de EN_RETARD
export const ALLOWED_DISTRIBUTION_TRANSITIONS: Record<StatusDistribution, StatusDistribution[]> = {
  NON_REALISEE: ['EN_COURS', 'REPORTEE', 'ANNULEE'],
  EN_COURS: ['REALISEE', 'ANNULEE'],
  REALISEE: [], // État terminal
  REPORTEE: [], // État terminal
  ANNULEE: ['NON_REALISEE'], // Restauration possible
};

export interface DistributionCharge {
  id: number;
  tache: number;
  date: string; // YYYY-MM-DD
  heures_planifiees: number;
  heures_reelles: number | null;
  heure_debut?: string | null; // "HH:MM:SS" (ISO time format) - Planifié
  heure_fin?: string | null; // "HH:MM:SS" - Planifié

  // ✅ Heures réelles (saisie à froid par le superviseur)
  heure_debut_reelle?: string | null; // "HH:MM:SS" - Réel terrain
  heure_fin_reelle?: string | null; // "HH:MM:SS" - Réel terrain

  commentaire: string;
  status: StatusDistribution;
  reference?: string;

  // ✅ Système de reports
  motif_report_annulation?: MotifDistribution | null;
  date_demarrage?: string | null; // ISO datetime (horodatage système)
  date_completion?: string | null; // ISO datetime (horodatage système)
  distribution_origine?: number | null; // ID de la distribution d'origine (si report)
  distribution_remplacement?: number | null; // ID de la distribution de remplacement

  // ✅ Champs calculés (retournés par le backend)
  nombre_reports?: number;
  est_report?: boolean;
  a_remplacement?: boolean;

  created_at: string;
  updated_at: string;
}

// ✅ Interface enrichie pour la vue "Distributions par jour"
export interface DistributionChargeEnriched extends DistributionCharge {
  tache_id: number;
  tache_titre?: string;
  tache_type?: string;
  tache_statut?: string;
  tache_site_nom?: string;
  tache_equipes?: string[];
  tache_priorite?: string;
}

// ✅ Interface pour l'historique des reports
export interface DistributionHistorique {
  id: number;
  date: string;
  status: StatusDistribution;
  motif: string;
  commentaire: string;
  heures_planifiees: number;
  heures_reelles: number | null;
}

// ✅ Réponse de l'action reporter
export interface ReporterDistributionResponse {
  message: string;
  distribution_originale: DistributionCharge;
  nouvelle_distribution: DistributionCharge;
  ancien_statut: StatusDistribution;
  motif: MotifDistribution;
  nombre_reports_chaine: number;
  tache_etendue: boolean;
}

// ✅ Réponse de l'action historique
export interface HistoriqueDistributionResponse {
  distribution_id: number;
  nombre_reports: number;
  chaine_reports: DistributionHistorique[];
  distribution_origine_id: number | null;
  distribution_finale_id: number | null;
}

export interface DistributionChargeData {
  id?: number; // ✅ CRITIQUE: Pour les updates, permet au backend d'identifier les distributions existantes
  date: string; // YYYY-MM-DD
  heures_planifiees?: number; // Calculé automatiquement côté backend depuis heure_debut et heure_fin
  heure_debut?: string; // "HH:MM" ou "HH:MM:SS"
  heure_fin?: string; // "HH:MM" ou "HH:MM:SS"
  commentaire?: string;
  status?: StatusDistribution; // ✅ NOUVEAU: Statut optionnel (défaut: NON_REALISEE)
  reference?: string; // ✅ NOUVEAU: Référence persistante (pour tracking)
}

// ✅ Interface pour les filtres avancés des distributions
export interface DistributionFilters {
  // Filtres par tâche
  tache?: number;
  tache_reference?: string;

  // Filtres par date
  date?: string; // Date exacte (YYYY-MM-DD)
  date_debut?: string; // Date >= (YYYY-MM-DD)
  date_fin?: string; // Date <= (YYYY-MM-DD)

  // Filtres par date (relatifs)
  aujourd_hui?: boolean; // Distributions du jour
  semaine_courante?: boolean; // Distributions de la semaine

  // Filtres par statut
  status?: StatusDistribution; // Statut exact
  status_in?: StatusDistribution[]; // Liste de statuts

  // Raccourcis statut
  actif?: boolean; // NON_REALISEE, EN_COURS
  termine?: boolean; // REALISEE, REPORTEE, ANNULEE

  // Filtres par équipe/site/structure
  equipe?: number;
  site?: number;
  site_nom?: string;
  structure?: number;

  // Filtres par type de tâche
  type_tache?: number;
  type_tache_nom?: string;

  // Filtres par priorité
  priorite?: number; // Priorité exacte (1-5)
  priorite_min?: number; // Priorité >= (1-5)
  urgent?: boolean; // Priorité >= 4

  // Filtres pour les reports
  est_report?: boolean; // Distributions issues d'un report
  a_remplacement?: boolean; // Distributions qui ont été reportées

  // Filtres par motif
  motif?: MotifDistribution;

  // Recherche textuelle
  search?: string;

  // Tri
  ordering?: string; // Ex: '-date', 'status', 'priorite'
}

// ============================================================================
// TACHE
// ============================================================================

export interface Tache {
  id: number;

  // Relations détaillées
  client_detail: Client | null;
  structure_client_detail: { id: number; nom: string; actif: boolean } | null;
  type_tache_detail: TypeTache;
  equipe_detail: EquipeList | null; // Legacy single team (backwards compatibility)
  equipes_detail: EquipeList[]; // Multi-teams (US-PLAN-013)
  participations_detail: ParticipationTache[];
  objets_detail: ObjetSimple[];

  // Champs
  date_debut_planifiee: string; // ISO Date (YYYY-MM-DD uniquement, sans heures)
  date_fin_planifiee: string; // ISO Date (YYYY-MM-DD uniquement, sans heures)
  date_echeance: string | null; // Date

  priorite: PrioriteTache;
  commentaires: string;

  date_affectation: string | null;
  date_debut_reelle: string | null; // ISO Date (YYYY-MM-DD uniquement, sans heures)
  date_fin_reelle: string | null; // ISO Date (YYYY-MM-DD uniquement, sans heures)
  duree_reelle_minutes: number | null;
  charge_estimee_heures: number | null;
  charge_manuelle: boolean;

  description_travaux: string;

  statut: StatutTache;
  note_qualite: number | null;

  // Validation admin
  etat_validation: EtatValidation;
  date_validation: string | null;
  validee_par: number | null;
  commentaire_validation: string;

  notifiee: boolean;
  confirmee: boolean;
  deleted_at: string | null;
  reclamation?: number | null;
  reclamation_numero?: string;

  // Site déduit (depuis objets OU réclamation)
  site_id?: number | null;
  site_nom?: string | null;

  // ✅ NOUVEAU: Distributions de charge (tâches multi-jours)
  distributions_charge?: DistributionCharge[];
  charge_totale_distributions?: number;
  nombre_jours_travail?: number;
  reference?: string;

  // ✅ Champs d'annulation (justification obligatoire)
  motif_annulation?: MotifAnnulationTache | null;
  commentaire_annulation?: string;
  date_annulation?: string | null;
  annulee_par?: number | null;
}

export interface TacheCreate {
  id_type_tache: number;
  equipes_ids?: number[]; // Multi-teams (US-PLAN-013)

  date_debut_planifiee: string; // ISO Date (YYYY-MM-DD)
  date_fin_planifiee: string; // ISO Date (YYYY-MM-DD)

  priorite?: PrioriteTache;
  commentaires?: string;

  // Pour l'inventaire (ManyToMany IDs)
  objets?: number[];

  // Lien Réclamation
  reclamation?: number | null;

  // Surcharge manuelle de la charge estimée
  charge_estimee_heures?: number | null;

  // ✅ NOUVEAU: Distributions de charge (tâches multi-jours)
  distributions_charge_data?: DistributionChargeData[];

  // ✅ NOUVEAU: Configuration de récurrence (géré côté frontend après création)
  recurrence_config?: {
    enabled: boolean;
    mode: 'frequency' | 'custom' | 'dates';
    frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    decalage_jours?: number;
    dates_cibles?: string[];
    nombre_occurrences?: number;
    date_fin_recurrence?: string;
    conserver_equipes: boolean;
    conserver_objets: boolean;
  };
}

export interface TacheUpdate {
  equipes_ids?: number[]; // Multi-teams (US-PLAN-013)
  date_debut_planifiee?: string; // ISO Date (YYYY-MM-DD)
  date_fin_planifiee?: string; // ISO Date (YYYY-MM-DD)
  priorite?: PrioriteTache;
  statut?: StatutTache;
  commentaires?: string;
  objets?: number[];
  // Surcharge manuelle de la charge estimée
  charge_estimee_heures?: number | null;
  // Dates réelles pour le suivi (jour uniquement, sans heures)
  date_debut_reelle?: string | null; // ISO Date (YYYY-MM-DD)
  date_fin_reelle?: string | null; // ISO Date (YYYY-MM-DD)

  // ✅ NOUVEAU: Distributions de charge (tâches multi-jours)
  distributions_charge_data?: DistributionChargeData[];

  // ✅ Champs d'annulation (obligatoire si statut = ANNULEE)
  motif_annulation?: MotifAnnulationTache | null;
  commentaire_annulation?: string;
}

export interface ParticipationCreate {
  id_operateur: number;
  role: RoleParticipation;
  heures_travaillees?: number;
}

// ============================================================================
// FILTRES PLANNING
// ============================================================================

export interface PlanningFilters {
  clientId: number | null;
  siteId: number | null;
  equipeId: number | null;
  statuts: StatutTache[]; // Multi-select
  dateDebut: string | null; // Format YYYY-MM-DD
  dateFin: string | null; // Format YYYY-MM-DD
  typeTacheId: number | null;
}

export const EMPTY_PLANNING_FILTERS: PlanningFilters = {
  clientId: null,
  siteId: null,
  equipeId: null,
  statuts: [],
  dateDebut: null,
  dateFin: null,
  typeTacheId: null,
};

/**
 * Compte le nombre de filtres actifs
 */
export function countActivePlanningFilters(filters: PlanningFilters): number {
  let count = 0;
  if (filters.clientId !== null) count++;
  if (filters.siteId !== null) count++;
  if (filters.equipeId !== null) count++;
  if (filters.statuts.length > 0) count++;
  if (filters.dateDebut !== null || filters.dateFin !== null) count++;
  if (filters.typeTacheId !== null) count++;
  return count;
}

// ============================================================================
// COULEURS UI
// ============================================================================

// ✅ SIMPLIFIÉ: Plus de EN_RETARD ni EXPIREE
export const STATUT_TACHE_COLORS: Record<StatutTache, { bg: string; text: string }> = {
  PLANIFIEE: { bg: 'bg-blue-100', text: 'text-blue-800' },
  EN_COURS: { bg: 'bg-orange-100', text: 'text-orange-800' },
  TERMINEE: { bg: 'bg-green-100', text: 'text-green-800' },
  ANNULEE: { bg: 'bg-red-100', text: 'text-red-800' },
};

export const PRIORITE_COLORS: Record<PrioriteTache, { bg: string; text: string }> = {
  1: { bg: 'bg-green-50', text: 'text-green-700' },
  2: { bg: 'bg-green-100', text: 'text-green-800' },
  3: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  4: { bg: 'bg-orange-100', text: 'text-orange-800' },
  5: { bg: 'bg-red-100', text: 'text-red-800' },
};

export const ETAT_VALIDATION_COLORS: Record<EtatValidation, { bg: string; text: string }> = {
  EN_ATTENTE: { bg: 'bg-amber-100', text: 'text-amber-800' },
  VALIDEE: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  REJETEE: { bg: 'bg-red-100', text: 'text-red-800' },
};
