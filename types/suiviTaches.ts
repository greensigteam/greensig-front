// ============================================================================
// TYPES - Module Suivi des Tâches (api_suivi_taches)
// ============================================================================

// ============================================================================
// ENUMERATIONS
// ============================================================================

export type TypePhoto = 'AVANT' | 'APRES' | 'RECLAMATION' | 'INVENTAIRE';

// ============================================================================
// LABELS
// ============================================================================

export const TYPE_PHOTO_LABELS: Record<TypePhoto, string> = {
    AVANT: 'Avant intervention',
    APRES: 'Après intervention',
    RECLAMATION: 'Réclamation',
    INVENTAIRE: 'Inventaire'
};

// ============================================================================
// INTERFACES - PRODUIT
// ============================================================================

export interface ProduitMatiereActive {
    id: number;
    matiere_active: string;
    teneur_valeur: number;
    teneur_unite: string;
    ordre: number;
}

export interface DoseProduit {
    id: number;
    dose_valeur: number;
    dose_unite_produit: string;
    dose_unite_support: string;
    contexte: string;
}

export interface ProduitList {
    id: number;
    nom_produit: string;
    numero_homologation: string;
    date_validite: string | null;
    cible: string;
    actif: boolean;
    est_valide: boolean;
}

export interface ProduitDetail {
    id: number;
    nom_produit: string;
    numero_homologation: string;
    date_validite: string | null;
    cible: string;
    description: string;
    actif: boolean;
    date_creation: string;
    est_valide: boolean;
    matieres_actives: ProduitMatiereActive[];
    doses: DoseProduit[];
}

export interface ProduitCreate {
    nom_produit: string;
    numero_homologation?: string;
    date_validite?: string | null;
    cible?: string;
    description?: string;
    actif?: boolean;
}

// ============================================================================
// INTERFACES - CONSOMMATION PRODUIT
// ============================================================================

export interface ConsommationProduit {
    id: number;
    tache: number;
    produit: number;
    produit_detail: ProduitList;
    produit_nom: string;
    quantite_utilisee: number;
    unite: string;
    date_utilisation: string;
    commentaire: string;
}

export interface ConsommationProduitCreate {
    tache: number;
    produit: number;
    quantite_utilisee: number;
    unite: string;
    commentaire?: string;
}

// ============================================================================
// INTERFACES - PHOTO
// ============================================================================

export interface Photo {
    id: number;
    url_fichier: string;
    type_photo: TypePhoto;
    type_photo_display: string;
    date_prise: string;
    tache: number | null;
    objet: number | null;
    legende: string;
    latitude: number | null;
    longitude: number | null;
}

export interface PhotoList {
    id: number;
    url_fichier: string;
    type_photo: TypePhoto;
    type_photo_display: string;
    date_prise: string;
    legende: string;
}

export interface PhotoCreate {
    fichier: File;
    type_photo: TypePhoto;
    tache?: number | null;
    objet?: number | null;
    reclamation?: number | null;
    legende?: string;
    latitude?: number | null;
    longitude?: number | null;
}

// ============================================================================
// INTERFACES - MATIERE ACTIVE & DOSE
// ============================================================================

export interface ProduitMatiereActiveCreate {
    produit: number;
    matiere_active: string;
    teneur_valeur: number;
    teneur_unite: string;
    ordre?: number;
}

export interface DoseProduitCreate {
    produit: number;
    dose_valeur: number;
    dose_unite_produit: string;
    dose_unite_support: string;
    contexte?: string;
}

// ============================================================================
// COULEURS UI
// ============================================================================

export const TYPE_PHOTO_COLORS: Record<TypePhoto, { bg: string; text: string }> = {
    AVANT: { bg: 'bg-blue-100', text: 'text-blue-800' },
    APRES: { bg: 'bg-green-100', text: 'text-green-800' },
    RECLAMATION: { bg: 'bg-red-100', text: 'text-red-800' },
    INVENTAIRE: { bg: 'bg-purple-100', text: 'text-purple-800' }
};
