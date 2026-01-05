// types/reports.ts
// Types pour les rapports de site

export interface MonthlyReportPeriode {
  date_debut: string;
  date_fin: string;
  nb_jours: number;
}

export interface MonthlyReportSite {
  id: number;
  nom: string;
  adresse?: string;
  superficie?: number;
  client?: string;
  centroid?: {
    lat: number;
    lng: number;
  } | null;
}

export interface MonthlyReportTravail {
  type: string;
  description?: string;
  count: number;
}

export interface MonthlyReportPhoto {
  id: number;
  url?: string;
  date?: string;
  commentaire?: string;
}

export interface MonthlyReportPhotoGroup {
  tache_id?: number;
  tache_nom?: string;
  avant: MonthlyReportPhoto[];
  apres: MonthlyReportPhoto[];
}

export interface MonthlyReportReclamation {
  id: number;
  numero: string;
  type?: string;
  description: string;
  statut: string;
  urgence?: string;
  date: string;
  zone?: string;
}

export interface MonthlyReportStatistiques {
  taches_terminees: number;
  taches_planifiees: number;
  taux_realisation: number;
  reclamations_creees: number;
  reclamations_resolues: number;
  heures_travaillees: number;
}

export interface MonthlyReportOperateur {
  id: number;
  nom: string;
  heures: number;
}

export interface MonthlyReportEquipe {
  id: number | null;
  nom: string;
  chef?: string | null;
  operateurs: MonthlyReportOperateur[];
  heures_totales: number;
}

export interface MonthlyReportData {
  periode: MonthlyReportPeriode;
  site: MonthlyReportSite;
  travaux_effectues: MonthlyReportTravail[];
  travaux_planifies: MonthlyReportTravail[];
  equipes: MonthlyReportEquipe[];
  photos: MonthlyReportPhotoGroup[];
  reclamations: MonthlyReportReclamation[];
  statistiques: MonthlyReportStatistiques;
}

// Options pour la génération du rapport
export interface MonthlyReportOptions {
  siteId: number;
  dateDebut: string;  // Format YYYY-MM-DD
  dateFin: string;    // Format YYYY-MM-DD
  sections?: {
    avantPropos?: boolean;
    travauxEffectues?: boolean;
    photos?: boolean;
    travauxPlanifies?: boolean;
    pointsAttention?: boolean;
  };
}