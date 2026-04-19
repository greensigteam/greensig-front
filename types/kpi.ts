// Types pour les 6 KPIs GreenSIG

export type KPIStatus = 'vert' | 'orange' | 'rouge' | 'gris';

/** KPI global (1 valeur unique) — utilisé pour KPI 1, 2, 3 */
export interface KPIValue {
  valeur: number | null;
  valeur_m1: number | null;
  evolution: number | null;
  seuil: number | null;
  statut: KPIStatus;
  unite: string;
  details: Record<string, number | null>;
}

/** Ventilation par TypeReclamation (KPI 4) */
export interface KPIParTypeReclamation {
  type_id: number;
  nom: string;
  categorie: string;
  valeur: number | null;
  total: number;
}

export interface KPITempsTraitement {
  global: {
    valeur: number | null;
    valeur_m1: number | null;
    evolution: number | null;
    seuil: number | null;
    statut: KPIStatus;
    unite: string;
    total_cloturees: number;
  };
  par_type: KPIParTypeReclamation[];
}

/** KPI 5: Temps de réalisation par tâche — Par TypeTache × Site */
export interface KPITempsRealisationEntry {
  type_tache_id: number;
  type_tache: string;
  site_id: number;
  site_nom: string;
  heures: number;
  nb_interventions: number;
}

/** KPI 6: Temps total par site */
export interface KPITempsSiteEntry {
  site_id: number;
  site_nom: string;
  heures: number;
  nb_interventions: number;
}

export interface KPITempsTotalParSite {
  par_site: KPITempsSiteEntry[];
  total_heures: number;
  total_heures_m1: number;
  evolution: number | null;
}

/** Réponse complète GET /api/kpis/ */
export interface KPIData {
  mois: string;
  mois_precedent: string;
  cached: boolean;
  kpis: {
    respect_planning: KPIValue;
    qualite_service: KPIValue;
    taux_traitement_reclamations: KPIValue;
    temps_moyen_traitement: KPITempsTraitement;
    temps_realisation_tache: KPITempsRealisationEntry[];
    temps_total_par_site: KPITempsTotalParSite;
  };
}

/** Entrée historique pour graphiques */
export interface KPIHistoriqueEntry {
  mois: string;
  mois_label: string;
  respect_planning: number | null;
  qualite_service: number | null;
  taux_traitement_reclamations: number | null;
  temps_moyen_traitement: number | null;
  temps_total_heures: number | null;
}

/** Réponse GET /api/kpis/historique/ */
export interface KPIHistoriqueData {
  historique: KPIHistoriqueEntry[];
  nb_mois: number;
  cached: boolean;
}

/** État des filtres KPI */
export interface KPIFiltersState {
  siteId: number | null;
  mois: string; // YYYY-MM
}
