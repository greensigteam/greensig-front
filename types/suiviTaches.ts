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

// ============================================================================
// ENUMERATIONS - FERTILISANT
// ============================================================================

export type TypeFertilisant = 'CHIMIQUE' | 'ORGANIQUE' | 'BIOLOGIQUE' | 'MINERAL' | 'SUBSTRAT';
export type FormatFertilisant = 'GRANULE' | 'LIQUIDE' | 'POUDRE' | 'SOLIDE' | 'DECOMPOSE';

export const TYPE_FERTILISANT_LABELS: Record<TypeFertilisant, string> = {
    CHIMIQUE: 'Chimique',
    ORGANIQUE: 'Organique',
    BIOLOGIQUE: 'Biologique',
    MINERAL: 'Amendement minéral',
    SUBSTRAT: 'Substrat organique'
};

export const FORMAT_FERTILISANT_LABELS: Record<FormatFertilisant, string> = {
    GRANULE: 'Granulé',
    LIQUIDE: 'Liquide',
    POUDRE: 'Poudre',
    SOLIDE: 'Solide',
    DECOMPOSE: 'Décomposé'
};

// ============================================================================
// ENUMERATIONS - RAVAGEUR/MALADIE
// ============================================================================

export type CategorieRavageurMaladie = 'RAVAGEUR' | 'MALADIE';

export const CATEGORIE_RAVAGEUR_MALADIE_LABELS: Record<CategorieRavageurMaladie, string> = {
    RAVAGEUR: 'Ravageur',
    MALADIE: 'Maladie'
};

// ============================================================================
// INTERFACES - FERTILISANT
// ============================================================================

export interface FertilisantList {
    id: number;
    nom: string;
    type_fertilisant: TypeFertilisant;
    type_fertilisant_display: string;
    format_fertilisant: FormatFertilisant;
    format_fertilisant_display: string;
    actif: boolean;
    date_creation: string;
}

export interface FertilisantDetail {
    id: number;
    nom: string;
    type_fertilisant: TypeFertilisant;
    type_fertilisant_display: string;
    format_fertilisant: FormatFertilisant;
    format_fertilisant_display: string;
    description: string;
    actif: boolean;
    date_creation: string;
}

export interface FertilisantCreate {
    nom: string;
    type_fertilisant: TypeFertilisant;
    format_fertilisant: FormatFertilisant;
    description?: string;
    actif?: boolean;
}

// ============================================================================
// INTERFACES - RAVAGEUR/MALADIE
// ============================================================================

export interface RavageurMaladieList {
    id: number;
    nom: string;
    categorie: CategorieRavageurMaladie;
    categorie_display: string;
    symptomes: string;
    partie_atteinte: string;
    produits_count: number;
    actif: boolean;
    date_creation: string;
}

export interface RavageurMaladieDetail {
    id: number;
    nom: string;
    categorie: CategorieRavageurMaladie;
    categorie_display: string;
    symptomes: string;
    partie_atteinte: string;
    produits_recommandes: ProduitList[];
    actif: boolean;
    date_creation: string;
}

export interface RavageurMaladieCreate {
    nom: string;
    categorie: CategorieRavageurMaladie;
    symptomes: string;
    partie_atteinte: string;
    produits_recommandes?: number[];
    actif?: boolean;
}

// ============================================================================
// COULEURS UI - FERTILISANT & RAVAGEUR/MALADIE
// ============================================================================

export const TYPE_FERTILISANT_COLORS: Record<TypeFertilisant, { bg: string; text: string }> = {
    CHIMIQUE: { bg: 'bg-blue-100', text: 'text-blue-800' },
    ORGANIQUE: { bg: 'bg-green-100', text: 'text-green-800' },
    BIOLOGIQUE: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    MINERAL: { bg: 'bg-amber-100', text: 'text-amber-800' },
    SUBSTRAT: { bg: 'bg-orange-100', text: 'text-orange-800' }
};

export const CATEGORIE_RAVAGEUR_MALADIE_COLORS: Record<CategorieRavageurMaladie, { bg: string; text: string }> = {
    RAVAGEUR: { bg: 'bg-red-100', text: 'text-red-800' },
    MALADIE: { bg: 'bg-purple-100', text: 'text-purple-800' }
};

// ============================================================================
// TYPE UNIFIE POUR LA PAGE PRODUITS
// ============================================================================

export type TypeProduitUnifie = 'PHYTOSANITAIRE' | 'FERTILISANT' | 'RAVAGEUR_MALADIE';

export const TYPE_PRODUIT_UNIFIE_LABELS: Record<TypeProduitUnifie, string> = {
    PHYTOSANITAIRE: 'Produit phytosanitaire',
    FERTILISANT: 'Fertilisant',
    RAVAGEUR_MALADIE: 'Ravageur / Maladie'
};

export const TYPE_PRODUIT_UNIFIE_COLORS: Record<TypeProduitUnifie, { bg: string; text: string }> = {
    PHYTOSANITAIRE: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
    FERTILISANT: { bg: 'bg-green-100', text: 'text-green-800' },
    RAVAGEUR_MALADIE: { bg: 'bg-red-100', text: 'text-red-800' }
};
