// ============================================================================
// TYPES - Module Gestion des Utilisateurs (api_users)
// Conforme au MCD et au backend Django
// ============================================================================

// ============================================================================
// ENUMERATIONS
// ============================================================================


export type StatutOperateur = 'ACTIF' | 'INACTIF' | 'EN_CONGE';

export type CategorieCompetence = 'TECHNIQUE' | 'ORGANISATIONNELLE';

export type NiveauCompetence = 'NON' | 'DEBUTANT' | 'INTERMEDIAIRE' | 'EXPERT';

export type TypeAbsence = 'CONGE' | 'MALADIE' | 'FORMATION' | 'AUTRE';

export type StatutAbsence = 'DEMANDEE' | 'VALIDEE' | 'REFUSEE' | 'ANNULEE';

export type StatutEquipe = 'COMPLETE' | 'PARTIELLE' | 'INDISPONIBLE';

export type NomRole = 'ADMIN' | 'CLIENT' | 'SUPERVISEUR';

// ============================================================================
// LABELS POUR L'AFFICHAGE
// ============================================================================


export const STATUT_OPERATEUR_LABELS: Record<StatutOperateur, string> = {
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
  EN_CONGE: 'En conge'
};

export const CATEGORIE_COMPETENCE_LABELS: Record<CategorieCompetence, string> = {
  TECHNIQUE: 'Techniques et operationnelles',
  ORGANISATIONNELLE: 'Organisationnelles et humaines'
};

export const NIVEAU_COMPETENCE_LABELS: Record<NiveauCompetence, string> = {
  NON: 'Non maitrise',
  DEBUTANT: 'Debutant',
  INTERMEDIAIRE: 'Intermediaire',
  EXPERT: 'Expert'
};

export const TYPE_ABSENCE_LABELS: Record<TypeAbsence, string> = {
  CONGE: 'Conge',
  MALADIE: 'Maladie',
  FORMATION: 'Formation',
  AUTRE: 'Autre'
};

export const STATUT_ABSENCE_LABELS: Record<StatutAbsence, string> = {
  DEMANDEE: 'Demandee',
  VALIDEE: 'Validee',
  REFUSEE: 'Refusee',
  ANNULEE: 'Annulee'
};

export const STATUT_EQUIPE_LABELS: Record<StatutEquipe, string> = {
  COMPLETE: 'Complete',
  PARTIELLE: 'Partiellement disponible',
  INDISPONIBLE: 'Non disponible'
};

export const NOM_ROLE_LABELS: Record<NomRole, string> = {
  ADMIN: 'Administrateur',
  CLIENT: 'Client',
  SUPERVISEUR: 'Superviseur'
};

// ============================================================================
// UTILISATEUR
// ============================================================================

export interface Utilisateur {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  fullName: string;
  dateCreation: string;
  actif: boolean;
  derniereConnexion: string | null;
  roles: NomRole[];
}

export interface UtilisateurCreate {
  email: string;
  nom: string;
  prenom: string;
  password: string;
  passwordConfirm: string;
  actif?: boolean;
}

export interface UtilisateurUpdate {
  nom?: string;
  prenom?: string;
  email?: string;
  actif?: boolean;
}
export interface ChangePassword {
  oldPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

// ============================================================================
// ROLE
// ============================================================================

export interface Role {
  id: number;
  nomRole: NomRole;
  nomDisplay: string;
  description: string;
}

export interface UtilisateurRole {
  id: number;
  utilisateur: number;
  utilisateurEmail: string;
  role: number;
  roleNom: string;
}

// ============================================================================
// CLIENT
// ============================================================================

export interface Client {
  utilisateur: number;
  utilisateurDetail?: Utilisateur;
  email: string;
  nom: string;
  prenom: string;
  actif: boolean;
  nomStructure: string;
  adresse: string;
  telephone: string;
  contactPrincipal: string;
  emailFacturation: string;
  logo: string | null;
}

export interface ClientCreate {
  email: string;
  nom: string;
  prenom: string;
  password: string;
  nomStructure: string;
  adresse?: string;
  telephone?: string;
  contactPrincipal?: string;
  emailFacturation?: string;
  logo?: string;
}

export interface ClientUpdate {
  nomStructure?: string;
  adresse?: string;
  telephone?: string;
  contactPrincipal?: string;
  emailFacturation?: string;
  logo?: string;
}

// ============================================================================
// SUPERVISEUR
// ============================================================================

export interface SuperviseurList {
  utilisateur: number;
  email: string;
  nom: string;
  prenom: string;
  fullName: string;
  actif: boolean;
  nombreEquipesGerees: number;
}

export interface SuperviseurDetail extends SuperviseurList {
  utilisateurDetail: Utilisateur;
  equipesGerees: EquipeList[];
}

export interface SuperviseurCreate {
  email: string;
  nom: string;
  prenom: string;
  password: string;
  actif?: boolean;
}

export interface SuperviseurUpdate {
  nom?: string;
  prenom?: string;
  email?: string;
  actif?: boolean;
}

// ============================================================================
// COMPETENCE
// ============================================================================

export interface Competence {
  id: number;
  nomCompetence: string;
  categorie: CategorieCompetence;
  categorieDisplay: string;
  description: string;
  ordreAffichage: number;
}

export interface CompetenceOperateur {
  id: number;
  operateur: number;
  operateurNom: string;
  competence: number;
  competenceDetail?: Competence;
  niveau: NiveauCompetence;
  niveauDisplay: string;
  dateAcquisition: string | null;
  dateModification: string;
}

export interface CompetenceOperateurCreate {
  competenceId: number;
  niveau: NiveauCompetence;
}

export interface CompetenceOperateurUpdate {
  niveau: NiveauCompetence;
  dateAcquisition?: string;
}

// ============================================================================
// OPERATEUR
// ============================================================================

export interface OperateurList {
  id: number;
  nom: string;
  prenom: string;
  fullName: string;
  email: string;
  numeroImmatriculation: string;
  statut: StatutOperateur;
  equipe: number | null;
  equipeNom: string | null;
  superviseur: number | null;
  superviseurNom: string | null;
  dateEmbauche: string;
  telephone: string;
  photo: string | null;
  estChefEquipe: boolean;
  estDisponible: boolean;
  peutEtreChef: boolean;
}

export interface OperateurDetail extends OperateurList {
  competencesDetail: CompetenceOperateur[];
  superviseurDetail: SuperviseurList | null;
  peutEtreChef: boolean;
}

export interface OperateurCreate {
  nom: string;
  prenom: string;
  email?: string;
  numeroImmatriculation: string;
  statut?: StatutOperateur;
  equipe?: number | null;
  superviseur?: number | null;
  dateEmbauche: string;
  telephone?: string;
  photo?: string;
}

export interface OperateurUpdate {
  nom?: string;
  prenom?: string;
  email?: string;
  numeroImmatriculation?: string;
  statut?: StatutOperateur;
  equipe?: number | null;
  superviseur?: number | null;
  telephone?: string;
  photo?: string;
}

// ============================================================================
// EQUIPE
// ============================================================================

export interface EquipeList {
  id: number;
  nomEquipe: string;
  chefEquipe: number | null;
  chefEquipeNom: string | null;
  superviseur: number | null;
  superviseurNom: string | null;
  site: number | null;
  siteNom: string | null;
  actif: boolean;
  dateCreation: string;
  nombreMembres: number;
  statutOperationnel: StatutEquipe;
}

export interface EquipeDetail extends EquipeList {
  chefEquipeDetail: OperateurList | null;
  superviseurDetail: SuperviseurList | null;
  membres: OperateurList[];
}

export interface EquipeCreate {
  nomEquipe: string;
  chefEquipe?: number | null;
  superviseur?: number | null;
  site?: number | null;
  actif?: boolean;
  membres?: number[];
}

export interface EquipeUpdate {
  nomEquipe?: string;
  chefEquipe?: number | null;
  // ⚠️ superviseur supprimé : désormais déduit automatiquement du site
  site?: number | null;
  actif?: boolean;
}

export interface AffecterMembres {
  operateurs: number[];
}

export interface EquipeStatut {
  equipe: EquipeList;
  statutOperationnel: StatutEquipe;
  totalMembres: number;
  disponiblesCount: number;
  absentsCount: number;
  disponibles: OperateurList[];
  absents: {
    operateur: OperateurList;
    absence: Absence;
  }[];
}

// ============================================================================
// ABSENCE
// ============================================================================

export interface Absence {
  id: number;
  operateur: number;
  operateurNom: string;
  typeAbsence: TypeAbsence;
  typeAbsenceDisplay: string;
  dateDebut: string;
  dateFin: string;
  dureeJours: number;
  statut: StatutAbsence;
  statutDisplay: string;
  motif: string;
  dateDemande: string;
  valideePar: number | null;
  valideeParNom: string | null;
  dateValidation: string | null;
  commentaire: string;
  equipeImpactee: { id: number; nom: string } | null;
}

export interface AbsenceCreate {
  operateur: number;
  typeAbsence: TypeAbsence;
  dateDebut: string;
  dateFin: string;
  motif?: string;
}

export interface AbsenceUpdate {
  typeAbsence?: TypeAbsence;
  dateDebut?: string;
  dateFin?: string;
  motif?: string;
}

export interface AbsenceValidation {
  action: 'valider' | 'refuser';
  commentaire?: string;
}

// ============================================================================
// HISTORIQUE
// ============================================================================

export interface HistoriqueEquipeOperateur {
  id: number;
  operateur: number;
  operateurNom: string;
  equipe: number;
  equipeNom: string;
  dateDebut: string;
  dateFin: string | null;
  roleDansEquipe: string;
}

export interface HistoriqueRH {
  equipes?: HistoriqueEquipeOperateur[];
  absences?: Absence[];
  competences?: CompetenceOperateur[];
}

// ============================================================================
// STATISTIQUES
// ============================================================================

export interface StatistiquesUtilisateurs {
  utilisateurs: {
    total: number;
    actifs: number;
    parRole: Record<NomRole, number>;
  };
  superviseurs: {
    total: number;
    actifs: number;
  };
  operateurs: {
    total: number;
    actifs: number;
    disponiblesAujourdhui: number;
    parStatut: Record<StatutOperateur, number>;
  };
  equipes: {
    total: number;
    actives: number;
    statutsOperationnels: {
      completes: number;
      partielles: number;
      indisponibles: number;
    };
  };
  absences: {
    enAttente: number;
    enCours: number;
    parType: Record<TypeAbsence, number>;
  };
}

// ============================================================================
// PAGINATION (DRF)
// ============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ============================================================================
// FILTRES
// ============================================================================

export interface UtilisateurFilters {
  search?: string;
  actif?: boolean;
  role?: NomRole;
  dateCreationMin?: string;
  dateCreationMax?: string;
  page?: number;
  pageSize?: number;
}

export interface OperateurFilters {
  search?: string;
  statut?: StatutOperateur;
  actif?: boolean;
  equipe?: number;
  sansEquipe?: boolean;
  competence?: number;
  competenceNom?: string;
  niveauMinimum?: NiveauCompetence;
  disponible?: boolean;
  estChef?: boolean;
  peutEtreChef?: boolean;
  dateEmbaucheMin?: string;
  dateEmbaucheMax?: string;
  page?: number;
  pageSize?: number;
}

export interface EquipeFilters {
  search?: string;
  actif?: boolean;
  chefEquipe?: number;
  statutOperationnel?: StatutEquipe;
  membresMin?: number;
  membresMax?: number;
  page?: number;
  pageSize?: number;
}

export interface AbsenceFilters {
  search?: string;
  operateur?: number;
  typeAbsence?: TypeAbsence;
  statut?: StatutAbsence;
  equipe?: number;
  dateDebutMin?: string;
  dateDebutMax?: string;
  dateFinMin?: string;
  dateFinMax?: string;
  enCours?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CompetenceFilters {
  search?: string;
  categorie?: CategorieCompetence;
  page?: number;
}

export interface HistoriqueRHFilters {
  operateurId?: number;
  equipeId?: number;
  dateDebut?: string;
  dateFin?: string;
  type?: 'equipes' | 'absences' | 'competences' | 'all';
}

// ============================================================================
// COULEURS POUR L'UI
// ============================================================================

export const STATUT_OPERATEUR_COLORS: Record<StatutOperateur, { bg: string; text: string }> = {
  ACTIF: { bg: 'bg-green-100', text: 'text-green-800' },
  INACTIF: { bg: 'bg-gray-100', text: 'text-gray-800' },
  EN_CONGE: { bg: 'bg-yellow-100', text: 'text-yellow-800' }
};

export const STATUT_ABSENCE_COLORS: Record<StatutAbsence, { bg: string; text: string }> = {
  DEMANDEE: { bg: 'bg-blue-100', text: 'text-blue-800' },
  VALIDEE: { bg: 'bg-green-100', text: 'text-green-800' },
  REFUSEE: { bg: 'bg-red-100', text: 'text-red-800' },
  ANNULEE: { bg: 'bg-gray-100', text: 'text-gray-800' }
};

export const STATUT_EQUIPE_COLORS: Record<StatutEquipe, { bg: string; text: string }> = {
  COMPLETE: { bg: 'bg-green-100', text: 'text-green-800' },
  PARTIELLE: { bg: 'bg-orange-100', text: 'text-orange-800' },
  INDISPONIBLE: { bg: 'bg-red-100', text: 'text-red-800' }
};

export const NIVEAU_COMPETENCE_COLORS: Record<NiveauCompetence, { bg: string; text: string }> = {
  NON: { bg: 'bg-gray-100', text: 'text-gray-500' },
  DEBUTANT: { bg: 'bg-blue-100', text: 'text-blue-700' },
  INTERMEDIAIRE: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  EXPERT: { bg: 'bg-green-100', text: 'text-green-700' }
};

export const TYPE_ABSENCE_COLORS: Record<TypeAbsence, { bg: string; text: string }> = {
  CONGE: { bg: 'bg-blue-100', text: 'text-blue-800' },
  MALADIE: { bg: 'bg-red-100', text: 'text-red-800' },
  FORMATION: { bg: 'bg-purple-100', text: 'text-purple-800' },
  AUTRE: { bg: 'bg-gray-100', text: 'text-gray-800' }
};

// Valeur par défaut utilisée par les badges lorsque la clé est absente
export const DEFAULT_BADGE = { bg: 'bg-gray-100', text: 'text-gray-800' };

// Helper sûr pour récupérer les couleurs d'un mapping de badges.
// Si `key` est indéfini ou non présent dans `map`, retourne `DEFAULT_BADGE`.
export function getBadgeColors<T extends string>(
  map: Record<T, { bg: string; text: string }>,
  key?: T | null
): { bg: string; text: string } {
  if (key && (map as any)[key]) {
    return (map as any)[key];
  }
  return DEFAULT_BADGE;
}
