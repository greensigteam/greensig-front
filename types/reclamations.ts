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
    delai_max_traitement: number;
    ordre: number;
}

export interface HistoriqueReclamation {
    id: number;
    statut_precedent: string | null;
    statut_nouveau: string;
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

    client: number;
    site?: number | null;
    site_nom?: string;
    zone?: number | null;
    zone_nom?: string;

    equipe_affectee?: number | null;
    equipe_nom?: string | null;

    description: string;
    localisation?: any;

    date_creation: string;
    date_constatation: string;

    statut: string;

    date_cloture_prevue?: string | null;
    date_cloture_reelle?: string | null;

    photos?: any[]; // Utiliser le type Photo de suiviTaches si possible
    historique?: HistoriqueReclamation[];
}

export interface ReclamationCreate {
    type_reclamation: number;
    urgence: number;
    site: number;
    zone?: number | null;
    description: string;
    date_constatation: string;
    localisation?: any;
    photos?: any[];
}

// User 6.6.13 - Satisfaction Client
export interface SatisfactionClient {
    id: number;
    reclamation: number;
    reclamation_numero?: string;
    note: number; // 1-5
    commentaire?: string;
    date_evaluation: string;
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

