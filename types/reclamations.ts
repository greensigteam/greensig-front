export interface TypeReclamation {
  id: number;
  nom_reclamation: string;
  code_reclamation: string;
  symbole?: string;
  categorie: string;
  actif: boolean;
}

export interface Urgence {
  id: number;
  niveau_urgence: string;
  couleur: string;
  ordre: number;
}

export interface HistoriqueReclamation {
  id: number;
  statut_precedent: string | null;
  statut_precedent_display?: string | null;
  statut_nouveau: string;
  statut_nouveau_display?: string;
  date_changement: string;
  auteur_nom: string;
  commentaire: string;
}

export interface Reclamation {
  id: number;
  numero_reclamation: string;

  type_reclamation: number;
  type_reclamation_nom?: string;

  urgence: number;
  urgence_niveau?: string;
  urgence_couleur?: string;

  // Créateur de la réclamation (tout utilisateur)
  createur?: number | null;
  createur_nom?: string | null;
  createur_est_client?: boolean; // true si le créateur a le rôle CLIENT

  // Client concerné (optionnel)
  client?: number | null;
  site?: number | null;
  site_nom?: string;
  zone?: number | null;
  zone_nom?: string;

  equipe_affectee?: number | null;
  equipe_nom?: string | null;

  description: string;
  type_autre_description?: string | null; // Précision si type = "Autre"
  localisation?: any;

  date_creation: string;
  date_constatation: string;

  statut: string;
  statut_display?: string;

  date_prise_en_compte?: string | null;
  date_debut_traitement?: string | null;
  date_resolution?: string | null;
  justification_rejet?: string | null;
  date_cloture_reelle?: string | null;

  // Auto-clôture Celery (48h sans réponse client après proposition de clôture)
  auto_cloturee?: boolean;

  // Workflow de validation de clôture
  cloture_proposee_par?: number | null;
  date_proposition_cloture?: string | null;

  // Rejet par l'administrateur
  rejetee_par?: number | null;
  rejetee_par_nom?: string | null;
  date_rejet?: string | null;

  // Refus de clôture par le client (créateur)
  cloture_refusee_par?: number | null;
  cloture_refusee_par_nom?: string | null;
  date_refus_cloture?: string | null;
  commentaire_refus_cloture?: string | null;

  // Refus d'intervention par le client
  intervention_refusee_par?: number | null;
  intervention_refusee_par_nom?: string | null;
  date_refus_intervention?: string | null;
  motif_refus_intervention?: string | null;
  nombre_refus?: number;

  photos?: any[]; // Photos directes de la réclamation
  photos_taches?: any[]; // Photos des tâches liées
  historique?: HistoriqueReclamation[];
  taches_liees_details?: any[]; // Détails des interventions
  satisfaction?: {
    id: number;
    note: number;
    commentaire?: string;
    date_evaluation: string;
    auto_evaluee?: boolean;
  } | null;

  // Visibilité client (réclamations internes)
  visible_client?: boolean;
}

export interface ReclamationCreate {
  type_reclamation: number;
  urgence: number;
  site?: number | null;
  zone?: number | null;
  description: string;
  type_autre_description?: string; // Obligatoire si type = "Autre"
  date_constatation?: string;
  localisation?: any;
  photos?: any[];
  visible_client?: boolean; // false = réclamation interne (admin/superviseur only)
}

// User 6.6.13 - Satisfaction Client
export interface SatisfactionClient {
  id: number;
  reclamation: number;
  reclamation_numero?: string;
  note: number; // 1-5
  commentaire?: string;
  date_evaluation: string;
  auto_evaluee?: boolean; // true si généré automatiquement après auto-clôture
}

export interface SatisfactionCreate {
  reclamation: number;
  note: number;
  commentaire?: string;
}

// User 6.6.14 - Statistiques
export interface ReclamationStats {
  total: number;
  par_statut: { [key: string]: number };
  par_type: Array<{ type_reclamation__nom_reclamation: string; count: number }>;
  par_urgence: Array<{ urgence__niveau_urgence: string; count: number }>;
  par_zone: Array<{ zone__nom: string; count: number }>;
  delai_moyen_heures?: number;
  satisfaction_moyenne?: number;
  nombre_evaluations?: number;
}
