// ============================================================================
// MOCK DATA - Module Gestion des Utilisateurs
// Donnees simulees conformes au MCD et au backend api_users
// ============================================================================

import {
  Utilisateur,
  Role,
  Client,
  Competence,
  CompetenceOperateur,
  OperateurList,
  OperateurDetail,
  EquipeList,
  EquipeDetail,
  Absence,
  HistoriqueEquipeOperateur,
  StatistiquesUtilisateurs,
  StatutOperateur,
  CategorieCompetence,
  NiveauCompetence,
  TypeAbsence,
  StatutAbsence,
  StatutEquipe,
  NomRole
} from '../types/users';

// ============================================================================
// ROLES
// ============================================================================

export const MOCK_ROLES: Role[] = [
  {
    id: 1,
    nomRole: 'ADMIN',
    nomDisplay: 'Administrateur',
    description: 'Administrateur systeme avec acces complet'
  },
  {
    id: 2,
    nomRole: 'CLIENT',
    nomDisplay: 'Client',
    description: "Client (maitre d'ouvrage) avec acces au portail client"
  },
  {
    id: 3,
    nomRole: 'CHEF_EQUIPE',
    nomDisplay: "Chef d'equipe",
    description: "Chef d'equipe responsable d'operateurs"
  },
  {
    id: 4,
    nomRole: 'OPERATEUR',
    nomDisplay: 'Operateur',
    description: 'Operateur terrain (jardinier)'
  }
];

// ============================================================================
// COMPETENCES (conformes au MCD)
// ============================================================================

export const MOCK_COMPETENCES: Competence[] = [
  // Techniques et operationnelles
  {
    id: 1,
      roles: ['ADMIN'],
    categorie: 'TECHNIQUE',
    categorieDisplay: 'Techniques et operationnelles',
    description: "Maitrise de l'utilisation des tondeuses a gazon professionnelles",
    ordreAffichage: 1
  },
  {
    id: 2,
    nomCompetence: 'Utilisation de debroussailleuse',
    categorie: 'TECHNIQUE',
    categorieDisplay: 'Techniques et operationnelles',
    description: "Maitrise de l'utilisation des debroussailleuses",
      roles: ['OPERATEUR', 'CHEF_EQUIPE'],
  },
  {
    id: 3,
    nomCompetence: 'Utilisation de tronconneuse',
    categorie: 'TECHNIQUE',
    categorieDisplay: 'Techniques et operationnelles',
    description: "Maitrise de l'utilisation des tronconneuses avec habilitation",
    ordreAffichage: 3
  },
  {
    id: 4,
      roles: ['OPERATEUR'],
    categorie: 'TECHNIQUE',
    categorieDisplay: 'Techniques et operationnelles',
    description: "Techniques de desherbage manuel et utilisation d'outils mecaniques",
    ordreAffichage: 4
  },
  {
    id: 5,
    nomCompetence: 'Binage des sols',
    categorie: 'TECHNIQUE',
    categorieDisplay: 'Techniques et operationnelles',
    description: "Techniques de binage pour l'aeration des sols",
      roles: ['OPERATEUR'],
  },
  {
    id: 6,
    nomCompetence: 'Confection des cuvettes',
    categorie: 'TECHNIQUE',
    categorieDisplay: 'Techniques et operationnelles',
    description: "Creation de cuvettes pour les plantations et l'irrigation",
    ordreAffichage: 6
  },
  {
    id: 7,
      roles: ['OPERATEUR', 'CHEF_EQUIPE'],
    categorie: 'TECHNIQUE',
    categorieDisplay: 'Techniques et operationnelles',
    description: "Taille d'entretien et de nettoyage des vegetaux",
    ordreAffichage: 7
  },
  {
    id: 8,
    nomCompetence: 'Taille de decoration',
    categorie: 'TECHNIQUE',
    categorieDisplay: 'Techniques et operationnelles',
    description: 'Taille ornementale et art topiaire',
      roles: ['OPERATEUR'],
  },
  {
    id: 9,
    nomCompetence: 'Arrosage',
    categorie: 'TECHNIQUE',
    categorieDisplay: 'Techniques et operationnelles',
    description: "Techniques d'arrosage manuel et automatique des espaces verts",
    ordreAffichage: 9
  },
  {
    id: 10,
      roles: ['CLIENT'],
    categorie: 'TECHNIQUE',
    categorieDisplay: 'Techniques et operationnelles',
    description: "Techniques specialisees d'elagage de palmiers",
    ordreAffichage: 10
  },
  {
    id: 11,
    nomCompetence: 'Nettoyage general',
    categorie: 'TECHNIQUE',
    categorieDisplay: 'Techniques et operationnelles',
    description: "Nettoyage general des espaces verts et sites d'intervention",
      roles: ['OPERATEUR'],
  },
  // Organisationnelles et humaines
  {
    id: 12,
    nomCompetence: "Gestion d'equipe",
    categorie: 'ORGANISATIONNELLE',
    categorieDisplay: 'Organisationnelles et humaines',
    description: "Capacite a diriger et coordonner une equipe d'operateurs. Prerequis pour etre chef d'equipe.",
    ordreAffichage: 1
  },
  {
    id: 13,
    nomCompetence: 'Organisation des taches',
    categorie: 'ORGANISATIONNELLE',
    categorieDisplay: 'Organisationnelles et humaines',
    description: "Organisation et repartition des taches au sein d'une equipe",
    ordreAffichage: 2
  },
  {
    id: 14,
    nomCompetence: 'Supervision et coordination',
    categorie: 'ORGANISATIONNELLE',
    categorieDisplay: 'Organisationnelles et humaines',
    description: 'Supervision et coordination des interventions terrain',
    ordreAffichage: 3
  },
  {
    id: 15,
    nomCompetence: 'Respect des procedures',
    categorie: 'ORGANISATIONNELLE',
    categorieDisplay: 'Organisationnelles et humaines',
    description: 'Respect des consignes de securite et des procedures operationnelles',
    ordreAffichage: 4
  }
];

// ============================================================================
// UTILISATEURS
// ============================================================================

export const MOCK_UTILISATEURS: Utilisateur[] = [
  {
    id: 1,
    email: 'admin@greensig.ma',
    nom: 'Admin',
    prenom: 'Super',
    fullName: 'Super Admin',
    typeUtilisateur: 'ADMIN',
    dateCreation: '2024-01-15T10:00:00Z',
    actif: true,
    derniereConnexion: '2024-12-10T08:30:00Z',
    roles: ['ADMIN']
  },
  {
    id: 2,
    email: 'hassan.idrissi@greensig.ma',
    nom: 'Idrissi',
    prenom: 'Hassan',
    fullName: 'Hassan Idrissi',
    typeUtilisateur: 'OPERATEUR',
    dateCreation: '2024-02-01T09:00:00Z',
    actif: true,
    derniereConnexion: '2024-12-10T07:00:00Z',
    roles: ['OPERATEUR', 'CHEF_EQUIPE']
  },
  {
    id: 3,
    email: 'youssef.amrani@greensig.ma',
    nom: 'Amrani',
    prenom: 'Youssef',
    fullName: 'Youssef Amrani',
    typeUtilisateur: 'OPERATEUR',
    dateCreation: '2024-03-15T09:00:00Z',
    actif: true,
    derniereConnexion: '2024-12-10T07:15:00Z',
    roles: ['OPERATEUR']
  },
  {
    id: 4,
    email: 'karim.benjelloun@greensig.ma',
    nom: 'Benjelloun',
    prenom: 'Karim',
    fullName: 'Karim Benjelloun',
    typeUtilisateur: 'OPERATEUR',
    dateCreation: '2024-04-01T09:00:00Z',
    actif: true,
    derniereConnexion: '2024-12-05T16:00:00Z',
    roles: ['OPERATEUR']
  },
  {
    id: 5,
    email: 'omar.tazi@greensig.ma',
    nom: 'Tazi',
    prenom: 'Omar',
    fullName: 'Omar Tazi',
    typeUtilisateur: 'OPERATEUR',
    dateCreation: '2024-02-15T09:00:00Z',
    actif: true,
    derniereConnexion: '2024-12-10T07:30:00Z',
    roles: ['OPERATEUR', 'CHEF_EQUIPE']
  },
  {
    id: 6,
    email: 'fatima.alaoui@greensig.ma',
    nom: 'Alaoui',
    prenom: 'Fatima',
    fullName: 'Fatima Alaoui',
    typeUtilisateur: 'OPERATEUR',
    dateCreation: '2024-05-01T09:00:00Z',
    actif: true,
    derniereConnexion: '2024-12-09T17:00:00Z',
    roles: ['OPERATEUR']
  },
  {
    id: 7,
    email: 'ahmed.benali@client.ma',
    nom: 'Benali',
    prenom: 'Ahmed',
    fullName: 'Ahmed Benali',
    typeUtilisateur: 'CLIENT',
    dateCreation: '2024-01-20T10:00:00Z',
    actif: true,
    derniereConnexion: '2024-12-08T14:00:00Z',
    roles: ['CLIENT']
  },
  {
    id: 8,
    email: 'said.mokhtar@greensig.ma',
    nom: 'Mokhtar',
    prenom: 'Said',
    fullName: 'Said Mokhtar',
    typeUtilisateur: 'OPERATEUR',
    dateCreation: '2024-06-01T09:00:00Z',
    actif: true,
    derniereConnexion: '2024-12-10T07:45:00Z',
    roles: ['OPERATEUR']
  }
];

// ============================================================================
// CLIENTS
// ============================================================================

export const MOCK_CLIENTS: Client[] = [
  {
    utilisateur: 7,
    email: 'ahmed.benali@client.ma',
    nom: 'Benali',
    prenom: 'Ahmed',
    actif: true,
    nomStructure: 'Residence Al Amal',
    adresse: 'Hay Riad, Rabat',
    telephone: '+212 6 12 34 56 78',
    contactPrincipal: 'Ahmed Benali',
    emailFacturation: 'facturation@residencealamal.ma',
    logo: null
  }
];

// ============================================================================
// OPERATEURS
// ============================================================================

export const MOCK_OPERATEURS: OperateurList[] = [
  {
    utilisateur: 2,
    email: 'hassan.idrissi@greensig.ma',
    nom: 'Idrissi',
    prenom: 'Hassan',
    fullName: 'Hassan Idrissi',
    actif: true,
    numeroImmatriculation: 'OP-2024-001',
    statut: 'ACTIF',
    equipe: 1,
    equipeNom: 'Equipe A - Entretien',
    dateEmbauche: '2024-02-01',
    telephone: '+212 6 11 11 11 11',
    photo: null,
    estChefEquipe: true,
    estDisponible: true
  },
  {
    utilisateur: 3,
    email: 'youssef.amrani@greensig.ma',
    nom: 'Amrani',
    prenom: 'Youssef',
    fullName: 'Youssef Amrani',
    actif: true,
    numeroImmatriculation: 'OP-2024-002',
    statut: 'ACTIF',
    equipe: 1,
    equipeNom: 'Equipe A - Entretien',
    dateEmbauche: '2024-03-15',
    telephone: '+212 6 22 22 22 22',
    photo: null,
    estChefEquipe: false,
    estDisponible: true
  },
  {
    utilisateur: 4,
    email: 'karim.benjelloun@greensig.ma',
    nom: 'Benjelloun',
    prenom: 'Karim',
    fullName: 'Karim Benjelloun',
    actif: true,
    numeroImmatriculation: 'OP-2024-003',
    statut: 'EN_CONGE',
    equipe: 2,
    equipeNom: 'Equipe B - Plantation',
    dateEmbauche: '2024-04-01',
    telephone: '+212 6 33 33 33 33',
    photo: null,
    estChefEquipe: false,
    estDisponible: false
  },
  {
    utilisateur: 5,
    email: 'omar.tazi@greensig.ma',
    nom: 'Tazi',
    prenom: 'Omar',
    fullName: 'Omar Tazi',
    actif: true,
    numeroImmatriculation: 'OP-2024-004',
    statut: 'ACTIF',
    equipe: 2,
    equipeNom: 'Equipe B - Plantation',
    dateEmbauche: '2024-02-15',
    telephone: '+212 6 44 44 44 44',
    photo: null,
    estChefEquipe: true,
    estDisponible: true
  },
  {
    utilisateur: 6,
    email: 'fatima.alaoui@greensig.ma',
    nom: 'Alaoui',
    prenom: 'Fatima',
    fullName: 'Fatima Alaoui',
    actif: true,
    numeroImmatriculation: 'OP-2024-005',
    statut: 'ACTIF',
    equipe: 1,
    equipeNom: 'Equipe A - Entretien',
    dateEmbauche: '2024-05-01',
    telephone: '+212 6 55 55 55 55',
    photo: null,
    estChefEquipe: false,
    estDisponible: true
  },
  {
    utilisateur: 8,
    email: 'said.mokhtar@greensig.ma',
    nom: 'Mokhtar',
    prenom: 'Said',
    fullName: 'Said Mokhtar',
    actif: true,
    numeroImmatriculation: 'OP-2024-006',
    statut: 'ACTIF',
    equipe: null,
    equipeNom: null,
    dateEmbauche: '2024-06-01',
    telephone: '+212 6 66 66 66 66',
    photo: null,
    estChefEquipe: false,
    estDisponible: true
  }
];

// ============================================================================
// COMPETENCES OPERATEURS
// ============================================================================

export const MOCK_COMPETENCES_OPERATEURS: CompetenceOperateur[] = [
  // Hassan Idrissi (Chef equipe)
  { id: 1, operateur: 2, operateurNom: 'Hassan Idrissi', competence: 1, niveau: 'EXPERT', niveauDisplay: 'Expert', dateAcquisition: '2024-02-15', dateModification: '2024-11-01T10:00:00Z' },
  { id: 2, operateur: 2, operateurNom: 'Hassan Idrissi', competence: 7, niveau: 'EXPERT', niveauDisplay: 'Expert', dateAcquisition: '2024-02-15', dateModification: '2024-11-01T10:00:00Z' },
  { id: 3, operateur: 2, operateurNom: 'Hassan Idrissi', competence: 9, niveau: 'INTERMEDIAIRE', niveauDisplay: 'Intermediaire', dateAcquisition: '2024-03-01', dateModification: '2024-11-01T10:00:00Z' },
  { id: 4, operateur: 2, operateurNom: 'Hassan Idrissi', competence: 12, niveau: 'EXPERT', niveauDisplay: 'Expert', dateAcquisition: '2024-02-01', dateModification: '2024-11-01T10:00:00Z' },
  { id: 5, operateur: 2, operateurNom: 'Hassan Idrissi', competence: 13, niveau: 'INTERMEDIAIRE', niveauDisplay: 'Intermediaire', dateAcquisition: '2024-02-01', dateModification: '2024-11-01T10:00:00Z' },

  // Youssef Amrani
  { id: 6, operateur: 3, operateurNom: 'Youssef Amrani', competence: 1, niveau: 'INTERMEDIAIRE', niveauDisplay: 'Intermediaire', dateAcquisition: '2024-04-01', dateModification: '2024-11-01T10:00:00Z' },
  { id: 7, operateur: 3, operateurNom: 'Youssef Amrani', competence: 9, niveau: 'EXPERT', niveauDisplay: 'Expert', dateAcquisition: '2024-03-20', dateModification: '2024-11-01T10:00:00Z' },
  { id: 8, operateur: 3, operateurNom: 'Youssef Amrani', competence: 11, niveau: 'INTERMEDIAIRE', niveauDisplay: 'Intermediaire', dateAcquisition: '2024-04-15', dateModification: '2024-11-01T10:00:00Z' },

  // Karim Benjelloun
  { id: 9, operateur: 4, operateurNom: 'Karim Benjelloun', competence: 7, niveau: 'EXPERT', niveauDisplay: 'Expert', dateAcquisition: '2024-04-15', dateModification: '2024-11-01T10:00:00Z' },
  { id: 10, operateur: 4, operateurNom: 'Karim Benjelloun', competence: 8, niveau: 'INTERMEDIAIRE', niveauDisplay: 'Intermediaire', dateAcquisition: '2024-05-01', dateModification: '2024-11-01T10:00:00Z' },
  { id: 11, operateur: 4, operateurNom: 'Karim Benjelloun', competence: 6, niveau: 'EXPERT', niveauDisplay: 'Expert', dateAcquisition: '2024-04-15', dateModification: '2024-11-01T10:00:00Z' },

  // Omar Tazi (Chef equipe)
  { id: 12, operateur: 5, operateurNom: 'Omar Tazi', competence: 1, niveau: 'EXPERT', niveauDisplay: 'Expert', dateAcquisition: '2024-02-20', dateModification: '2024-11-01T10:00:00Z' },
  { id: 13, operateur: 5, operateurNom: 'Omar Tazi', competence: 7, niveau: 'EXPERT', niveauDisplay: 'Expert', dateAcquisition: '2024-02-20', dateModification: '2024-11-01T10:00:00Z' },
  { id: 14, operateur: 5, operateurNom: 'Omar Tazi', competence: 6, niveau: 'EXPERT', niveauDisplay: 'Expert', dateAcquisition: '2024-03-01', dateModification: '2024-11-01T10:00:00Z' },
  { id: 15, operateur: 5, operateurNom: 'Omar Tazi', competence: 12, niveau: 'INTERMEDIAIRE', niveauDisplay: 'Intermediaire', dateAcquisition: '2024-02-15', dateModification: '2024-11-01T10:00:00Z' },

  // Fatima Alaoui
  { id: 16, operateur: 6, operateurNom: 'Fatima Alaoui', competence: 9, niveau: 'EXPERT', niveauDisplay: 'Expert', dateAcquisition: '2024-05-15', dateModification: '2024-11-01T10:00:00Z' },
  { id: 17, operateur: 6, operateurNom: 'Fatima Alaoui', competence: 4, niveau: 'INTERMEDIAIRE', niveauDisplay: 'Intermediaire', dateAcquisition: '2024-06-01', dateModification: '2024-11-01T10:00:00Z' },
  { id: 18, operateur: 6, operateurNom: 'Fatima Alaoui', competence: 11, niveau: 'EXPERT', niveauDisplay: 'Expert', dateAcquisition: '2024-05-20', dateModification: '2024-11-01T10:00:00Z' },

  // Said Mokhtar
  { id: 19, operateur: 8, operateurNom: 'Said Mokhtar', competence: 1, niveau: 'DEBUTANT', niveauDisplay: 'Debutant', dateAcquisition: '2024-06-15', dateModification: '2024-11-01T10:00:00Z' },
  { id: 20, operateur: 8, operateurNom: 'Said Mokhtar', competence: 11, niveau: 'INTERMEDIAIRE', niveauDisplay: 'Intermediaire', dateAcquisition: '2024-07-01', dateModification: '2024-11-01T10:00:00Z' }
];

// ============================================================================
// EQUIPES
// ============================================================================

export const MOCK_EQUIPES: EquipeList[] = [
  {
    id: 1,
    nomEquipe: 'Equipe A - Entretien',
    chefEquipe: 2,
    chefEquipeNom: 'Hassan Idrissi',
    specialite: 'Entretien general',
    actif: true,
    dateCreation: '2024-02-01',
    nombreMembres: 3,
    statutOperationnel: 'COMPLETE'
  },
  {
    id: 2,
    nomEquipe: 'Equipe B - Plantation',
    chefEquipe: 5,
    chefEquipeNom: 'Omar Tazi',
    specialite: 'Plantation et amenagement',
    actif: true,
    dateCreation: '2024-02-15',
    nombreMembres: 2,
    statutOperationnel: 'PARTIELLE'
  }
];

// ============================================================================
// ABSENCES
// ============================================================================

export const MOCK_ABSENCES: Absence[] = [
  {
    id: 1,
    operateur: 4,
    operateurNom: 'Karim Benjelloun',
    typeAbsence: 'CONGE',
    typeAbsenceDisplay: 'Conge',
    dateDebut: '2024-12-05',
    dateFin: '2024-12-15',
    dureeJours: 11,
    statut: 'VALIDEE',
    statutDisplay: 'Validee',
    motif: 'Conges annuels',
    dateDemande: '2024-11-25T10:00:00Z',
    valideePar: 1,
    valideeParNom: 'Super Admin',
    dateValidation: '2024-11-26T14:00:00Z',
    commentaire: 'Approuve',
    equipeImpactee: { id: 2, nom: 'Equipe B - Plantation' }
  },
  {
    id: 2,
    operateur: 3,
    operateurNom: 'Youssef Amrani',
    typeAbsence: 'FORMATION',
    typeAbsenceDisplay: 'Formation',
    dateDebut: '2024-12-20',
    dateFin: '2024-12-22',
    dureeJours: 3,
    statut: 'DEMANDEE',
    statutDisplay: 'Demandee',
    motif: 'Formation securite',
    dateDemande: '2024-12-08T09:00:00Z',
    valideePar: null,
    valideeParNom: null,
    dateValidation: null,
    commentaire: '',
    equipeImpactee: { id: 1, nom: 'Equipe A - Entretien' }
  },
  {
    id: 3,
    operateur: 6,
    operateurNom: 'Fatima Alaoui',
    typeAbsence: 'MALADIE',
    typeAbsenceDisplay: 'Maladie',
    dateDebut: '2024-11-28',
    dateFin: '2024-11-30',
    dureeJours: 3,
    statut: 'VALIDEE',
    statutDisplay: 'Validee',
    motif: 'Arret maladie',
    dateDemande: '2024-11-28T08:00:00Z',
    valideePar: 1,
    valideeParNom: 'Super Admin',
    dateValidation: '2024-11-28T09:00:00Z',
    commentaire: 'Bon retablissement',
    equipeImpactee: { id: 1, nom: 'Equipe A - Entretien' }
  }
];

// ============================================================================
// HISTORIQUE EQUIPES
// ============================================================================

export const MOCK_HISTORIQUE_EQUIPES: HistoriqueEquipeOperateur[] = [
  {
    id: 1,
    operateur: 2,
    operateurNom: 'Hassan Idrissi',
    equipe: 1,
    equipeNom: 'Equipe A - Entretien',
    dateDebut: '2024-02-01',
    dateFin: null,
    roleDansEquipe: 'CHEF'
  },
  {
    id: 2,
    operateur: 3,
    operateurNom: 'Youssef Amrani',
    equipe: 1,
    equipeNom: 'Equipe A - Entretien',
    dateDebut: '2024-03-15',
    dateFin: null,
    roleDansEquipe: 'MEMBRE'
  },
  {
    id: 3,
    operateur: 4,
    operateurNom: 'Karim Benjelloun',
    equipe: 2,
    equipeNom: 'Equipe B - Plantation',
    dateDebut: '2024-04-01',
    dateFin: null,
    roleDansEquipe: 'MEMBRE'
  },
  {
    id: 4,
    operateur: 5,
    operateurNom: 'Omar Tazi',
    equipe: 2,
    equipeNom: 'Equipe B - Plantation',
    dateDebut: '2024-02-15',
    dateFin: null,
    roleDansEquipe: 'CHEF'
  },
  {
    id: 5,
    operateur: 6,
    operateurNom: 'Fatima Alaoui',
    equipe: 1,
    equipeNom: 'Equipe A - Entretien',
    dateDebut: '2024-05-01',
    dateFin: null,
    roleDansEquipe: 'MEMBRE'
  }
];

// ============================================================================
// STATISTIQUES
// ============================================================================

export const MOCK_STATISTIQUES: StatistiquesUtilisateurs = {
  utilisateurs: {
    total: 8,
    actifs: 8,
    parType: {
      ADMIN: 1,
      OPERATEUR: 6,
      CLIENT: 1
    }
  },
  operateurs: {
    total: 6,
    actifs: 5,
    disponiblesAujourdhui: 5,
    parStatut: {
      ACTIF: 5,
      INACTIF: 0,
      EN_CONGE: 1
    },
    chefsEquipe: 2
  },
  equipes: {
    total: 2,
    actives: 2,
    statutsOperationnels: {
      completes: 1,
      partielles: 1,
      indisponibles: 0
    }
  },
  absences: {
    enAttente: 1,
    enCours: 1,
    parType: {
      CONGE: 1,
      MALADIE: 1,
      FORMATION: 1,
      AUTRE: 0
    }
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getUtilisateurById = (id: number): Utilisateur | undefined => {
  return MOCK_UTILISATEURS.find(u => u.id === id);
};

export const getOperateurById = (utilisateurId: number): OperateurList | undefined => {
  return MOCK_OPERATEURS.find(o => o.utilisateur === utilisateurId);
};

export const getEquipeById = (id: number): EquipeList | undefined => {
  return MOCK_EQUIPES.find(e => e.id === id);
};

export const getCompetenceById = (id: number): Competence | undefined => {
  return MOCK_COMPETENCES.find(c => c.id === id);
};

export const getOperateursByEquipe = (equipeId: number): OperateurList[] => {
  return MOCK_OPERATEURS.filter(o => o.equipe === equipeId);
};

export const getCompetencesOperateur = (operateurId: number): CompetenceOperateur[] => {
  return MOCK_COMPETENCES_OPERATEURS.filter(co => co.operateur === operateurId);
};

export const getAbsencesByOperateur = (operateurId: number): Absence[] => {
  return MOCK_ABSENCES.filter(a => a.operateur === operateurId);
};

export const getAbsencesEnCours = (): Absence[] => {
  const today = new Date().toISOString().split('T')[0];
  return MOCK_ABSENCES.filter(a =>
    a.statut === 'VALIDEE' &&
    a.dateDebut <= today &&
    a.dateFin >= today
  );
};

export const getAbsencesAValider = (): Absence[] => {
  return MOCK_ABSENCES.filter(a => a.statut === 'DEMANDEE');
};

export const getOperateursDisponibles = (): OperateurList[] => {
  return MOCK_OPERATEURS.filter(o => o.estDisponible && o.actif);
};

export const getChefsPotentiels = (): OperateurList[] => {
  // Operateurs avec competence "Gestion d'equipe" niveau >= INTERMEDIAIRE
  const operateursAvecGestion = MOCK_COMPETENCES_OPERATEURS
    .filter(co =>
      co.competence === 12 &&
      ['INTERMEDIAIRE', 'EXPERT', 'AUTORISE'].includes(co.niveau)
    )
    .map(co => co.operateur);

  return MOCK_OPERATEURS.filter(o =>
    operateursAvecGestion.includes(o.utilisateur) && o.actif
  );
};

export const getEquipeDetail = (equipeId: number): EquipeDetail | undefined => {
  const equipe = MOCK_EQUIPES.find(e => e.id === equipeId);
  if (!equipe) return undefined;

  const chef = MOCK_OPERATEURS.find(o => o.utilisateur === equipe.chefEquipe);
  const membres = MOCK_OPERATEURS.filter(o => o.equipe === equipeId);

  return {
    ...equipe,
    chefEquipeDetail: chef!,
    membres
  };
};

export const getOperateurDetail = (utilisateurId: number): OperateurDetail | undefined => {
  const operateur = MOCK_OPERATEURS.find(o => o.utilisateur === utilisateurId);
  if (!operateur) return undefined;

  const utilisateur = MOCK_UTILISATEURS.find(u => u.id === utilisateurId);
  const competences = getCompetencesOperateur(utilisateurId);
  const equipesDirigees = MOCK_EQUIPES.filter(e => e.chefEquipe === utilisateurId);
  const peutEtreChef = competences.some(c =>
    c.competence === 12 &&
    ['INTERMEDIAIRE', 'EXPERT', 'AUTORISE'].includes(c.niveau)
  );

  return {
    ...operateur,
    utilisateurDetail: utilisateur!,
    competencesDetail: competences,
    equipesDirigeesCount: equipesDirigees.length,
    peutEtreChef
  };
};
