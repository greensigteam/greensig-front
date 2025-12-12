# API Users Module - Documentation Frontend

Documentation des endpoints et conventions de nommage pour le module `api_users` (Gestion des utilisateurs, operateurs, equipes, absences).

**Base URL** : `/api/users/`

---

## Table des Matieres

1. [Conventions de Nommage](#conventions-de-nommage)
2. [Types TypeScript](#types-typescript)
3. [Utilisateurs](#utilisateurs)
4. [Roles](#roles)
5. [Clients](#clients)
6. [Operateurs](#operateurs)
7. [Competences](#competences)
8. [Equipes](#equipes)
9. [Absences](#absences)
10. [Historique RH](#historique-rh)
11. [Statistiques](#statistiques)

---

## Conventions de Nommage

### Backend (Django) -> Frontend (TypeScript)

| Backend (snake_case) | Frontend (camelCase) | Description |
|---------------------|----------------------|-------------|
| `id` | `id` | Identifiant unique |
| `utilisateur` | `utilisateur` | FK vers Utilisateur |
| `type_utilisateur` | `typeUtilisateur` | Type: ADMIN, OPERATEUR, CLIENT |
| `date_creation` | `dateCreation` | Date de creation |
| `derniere_connexion` | `derniereConnexion` | Derniere connexion |
| `nom_structure` | `nomStructure` | Nom de la structure client |
| `contact_principal` | `contactPrincipal` | Contact principal |
| `email_facturation` | `emailFacturation` | Email de facturation |
| `numero_immatriculation` | `numeroImmatriculation` | Matricule operateur |
| `date_embauche` | `dateEmbauche` | Date d'embauche |
| `nom_equipe` | `nomEquipe` | Nom de l'equipe |
| `chef_equipe` | `chefEquipe` | Chef d'equipe (FK) |
| `chef_equipe_nom` | `chefEquipeNom` | Nom complet du chef |
| `nombre_membres` | `nombreMembres` | Nombre de membres |
| `statut_operationnel` | `statutOperationnel` | Statut: COMPLETE, PARTIELLE, INDISPONIBLE |
| `nom_competence` | `nomCompetence` | Nom de la competence |
| `ordre_affichage` | `ordreAffichage` | Ordre d'affichage |
| `niveau_competence` | `niveauCompetence` | Niveau de maitrise |
| `date_acquisition` | `dateAcquisition` | Date d'acquisition |
| `date_modification` | `dateModification` | Date de modification |
| `type_absence` | `typeAbsence` | Type: CONGE, MALADIE, FORMATION, AUTRE |
| `date_debut` | `dateDebut` | Date de debut |
| `date_fin` | `dateFin` | Date de fin |
| `duree_jours` | `dureeJours` | Duree en jours |
| `validee_par` | `valideePar` | Validateur (FK) |
| `date_validation` | `dateValidation` | Date de validation |
| `date_demande` | `dateDemande` | Date de demande |
| `est_chef_equipe` | `estChefEquipe` | Boolean: est chef |
| `est_disponible` | `estDisponible` | Boolean: disponible |
| `peut_etre_chef` | `peutEtreChef` | Boolean: peut etre chef |
| `full_name` | `fullName` | Nom complet |
| `equipe_nom` | `equipeNom` | Nom de l'equipe |
| `role_dans_equipe` | `roleDansEquipe` | Role dans l'equipe |

### Enumerations

```typescript
// Types d'utilisateurs
type TypeUtilisateur = 'ADMIN' | 'OPERATEUR' | 'CLIENT';

// Statuts operateur
type StatutOperateur = 'ACTIF' | 'INACTIF' | 'EN_CONGE';

// Categories de competences
type CategorieCompetence = 'TECHNIQUE' | 'ORGANISATIONNELLE';

// Niveaux de competence
type NiveauCompetence = 'NON' | 'DEBUTANT' | 'INTERMEDIAIRE' | 'EXPERT' | 'AUTORISE';

// Types d'absence
type TypeAbsence = 'CONGE' | 'MALADIE' | 'FORMATION' | 'AUTRE';

// Statuts d'absence
type StatutAbsence = 'DEMANDEE' | 'VALIDEE' | 'REFUSEE' | 'ANNULEE';

// Statuts d'equipe
type StatutEquipe = 'COMPLETE' | 'PARTIELLE' | 'INDISPONIBLE';

// Roles
type NomRole = 'ADMIN' | 'CLIENT' | 'CHEF_EQUIPE' | 'OPERATEUR';
```

---

## Types TypeScript

```typescript
// ============================================================================
// UTILISATEUR
// ============================================================================

interface Utilisateur {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  fullName: string;
  typeUtilisateur: TypeUtilisateur;
  dateCreation: string; // ISO date
  actif: boolean;
  derniereConnexion: string | null;
  roles: NomRole[];
}

interface UtilisateurCreate {
  email: string;
  nom: string;
  prenom: string;
  password: string;
  passwordConfirm: string;
  typeUtilisateur?: TypeUtilisateur;
  actif?: boolean;
}

interface UtilisateurUpdate {
  nom?: string;
  prenom?: string;
  email?: string;
  actif?: boolean;
}

interface ChangePassword {
  oldPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

// ============================================================================
// ROLE
// ============================================================================

interface Role {
  id: number;
  nomRole: NomRole;
  nomDisplay: string;
  description: string;
}

interface UtilisateurRole {
  id: number;
  utilisateur: number;
  utilisateurEmail: string;
  role: number;
  roleNom: string;
  dateAttribution: string;
}

// ============================================================================
// CLIENT
// ============================================================================

interface Client {
  utilisateur: number; // PK
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

interface ClientCreate {
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

// ============================================================================
// COMPETENCE
// ============================================================================

interface Competence {
  id: number;
  nomCompetence: string;
  categorie: CategorieCompetence;
  categorieDisplay: string;
  description: string;
  ordreAffichage: number;
}

interface CompetenceOperateur {
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

// ============================================================================
// OPERATEUR
// ============================================================================

interface OperateurList {
  utilisateur: number; // PK
  email: string;
  nom: string;
  prenom: string;
  fullName: string;
  actif: boolean;
  numeroImmatriculation: string;
  statut: StatutOperateur;
  equipe: number | null;
  equipeNom: string | null;
  dateEmbauche: string;
  telephone: string;
  photo: string | null;
  estChefEquipe: boolean;
  estDisponible: boolean;
}

interface OperateurDetail extends OperateurList {
  utilisateurDetail: Utilisateur;
  competencesDetail: CompetenceOperateur[];
  equipesDirigeesCount: number;
  peutEtreChef: boolean;
}

interface OperateurCreate {
  email: string;
  nom: string;
  prenom: string;
  password: string;
  numeroImmatriculation: string;
  statut?: StatutOperateur;
  equipe?: number | null;
  dateEmbauche: string;
  telephone?: string;
  photo?: string;
}

interface OperateurUpdate {
  nom?: string;
  prenom?: string;
  email?: string;
  actif?: boolean;
  numeroImmatriculation?: string;
  statut?: StatutOperateur;
  equipe?: number | null;
  telephone?: string;
  photo?: string;
}

// ============================================================================
// EQUIPE
// ============================================================================

interface EquipeList {
  id: number;
  nomEquipe: string;
  chefEquipe: number;
  chefEquipeNom: string;
  specialite: string;
  actif: boolean;
  dateCreation: string;
  nombreMembres: number;
  statutOperationnel: StatutEquipe;
}

interface EquipeDetail extends EquipeList {
  chefEquipeDetail: OperateurList;
  membres: OperateurList[];
}

interface EquipeCreate {
  nomEquipe: string;
  chefEquipe: number;
  specialite?: string;
  actif?: boolean;
  membres?: number[]; // IDs des operateurs
}

interface EquipeUpdate {
  nomEquipe?: string;
  chefEquipe?: number;
  specialite?: string;
  actif?: boolean;
}

interface AffecterMembres {
  operateurs: number[];
}

// ============================================================================
// ABSENCE
// ============================================================================

interface Absence {
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

interface AbsenceCreate {
  operateur: number;
  typeAbsence: TypeAbsence;
  dateDebut: string;
  dateFin: string;
  motif?: string;
}

interface AbsenceValidation {
  action: 'valider' | 'refuser';
  commentaire?: string;
}

// ============================================================================
// HISTORIQUE
// ============================================================================

interface HistoriqueEquipeOperateur {
  id: number;
  operateur: number;
  operateurNom: string;
  equipe: number;
  equipeNom: string;
  dateDebut: string;
  dateFin: string | null;
  roleDansEquipe: string;
}

// ============================================================================
// STATISTIQUES
// ============================================================================

interface StatistiquesUtilisateurs {
  utilisateurs: {
    total: number;
    actifs: number;
    parType: Record<TypeUtilisateur, number>;
  };
  operateurs: {
    total: number;
    actifs: number;
    disponiblesAujourdhui: number;
    parStatut: Record<StatutOperateur, number>;
    chefsEquipe: number;
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
```

---

## Utilisateurs

### Liste des utilisateurs

```http
GET /api/users/utilisateurs/
```

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Recherche dans nom, prenom, email |
| `type_utilisateur` | string | Filtrer par type: ADMIN, OPERATEUR, CLIENT |
| `actif` | boolean | Filtrer par statut actif |
| `role` | string | Filtrer par role |
| `date_creation_min` | date | Cree apres cette date |
| `date_creation_max` | date | Cree avant cette date |
| `page` | number | Numero de page |

**Response:** `PaginatedResponse<Utilisateur>`

### Detail d'un utilisateur

```http
GET /api/users/utilisateurs/{id}/
```

### Creer un utilisateur

```http
POST /api/users/utilisateurs/
```

**Body:** `UtilisateurCreate`

### Modifier un utilisateur

```http
PUT /api/users/utilisateurs/{id}/
PATCH /api/users/utilisateurs/{id}/
```

**Body:** `UtilisateurUpdate`

### Desactiver un utilisateur (soft delete)

```http
DELETE /api/users/utilisateurs/{id}/
```

**Response:**
```json
{ "message": "Utilisateur desactive avec succes." }
```

### Changer le mot de passe

```http
POST /api/users/utilisateurs/{id}/change_password/
```

**Body:** `ChangePassword`

### Reactiver un utilisateur

```http
POST /api/users/utilisateurs/{id}/activer/
```

### Roles d'un utilisateur

```http
GET /api/users/utilisateurs/{id}/roles/
```

### Attribuer un role

```http
POST /api/users/utilisateurs/{id}/attribuer_role/
```

**Body:**
```json
{ "role_id": 1 }
```

---

## Roles

### Liste des roles

```http
GET /api/users/roles/
```

### CRUD standard

```http
GET    /api/users/roles/{id}/
POST   /api/users/roles/
PUT    /api/users/roles/{id}/
DELETE /api/users/roles/{id}/
```

---

## Clients

### Liste des clients

```http
GET /api/users/clients/
```

### Detail d'un client

```http
GET /api/users/clients/{utilisateur_id}/
```

> Note: L'ID est l'ID de l'utilisateur associe (PK)

### Creer un client

```http
POST /api/users/clients/
```

**Body:** `ClientCreate`

Cree automatiquement:
- L'utilisateur avec `type_utilisateur: CLIENT`
- Le profil client
- L'attribution du role CLIENT

### Modifier un client

```http
PUT /api/users/clients/{utilisateur_id}/
PATCH /api/users/clients/{utilisateur_id}/
```

### Desactiver un client

```http
DELETE /api/users/clients/{utilisateur_id}/
```

---

## Operateurs

### Liste des operateurs

```http
GET /api/users/operateurs/
```

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Recherche nom, prenom, email, matricule |
| `statut` | string | ACTIF, INACTIF, EN_CONGE |
| `actif` | boolean | Utilisateur actif |
| `equipe` | number | ID de l'equipe |
| `sans_equipe` | boolean | Sans equipe affectee |
| `competence` | number | ID de la competence |
| `competence_nom` | string | Nom de la competence |
| `niveau_minimum` | string | Niveau minimum requis |
| `disponible` | boolean | Disponible aujourd'hui |
| `est_chef` | boolean | Est chef d'equipe |
| `peut_etre_chef` | boolean | Peut etre chef |
| `date_embauche_min` | date | Embauche apres |
| `date_embauche_max` | date | Embauche avant |

### Detail d'un operateur

```http
GET /api/users/operateurs/{utilisateur_id}/
```

**Response:** `OperateurDetail`

### Creer un operateur

```http
POST /api/users/operateurs/
```

**Body:** `OperateurCreate`

Cree automatiquement:
- L'utilisateur avec `type_utilisateur: OPERATEUR`
- Le profil operateur
- L'attribution du role OPERATEUR
- L'historique d'affectation equipe si applicable

### Modifier un operateur

```http
PUT /api/users/operateurs/{utilisateur_id}/
PATCH /api/users/operateurs/{utilisateur_id}/
```

**Body:** `OperateurUpdate`

### Desactiver un operateur

```http
DELETE /api/users/operateurs/{utilisateur_id}/
```

> Erreur 400 si l'operateur est chef d'equipe actif

### Competences d'un operateur

```http
GET /api/users/operateurs/{id}/competences/
```

### Affecter une competence

```http
POST /api/users/operateurs/{id}/affecter_competence/
```

**Body:**
```json
{
  "competence_id": 1,
  "niveau": "INTERMEDIAIRE"
}
```

### Modifier le niveau d'une competence

```http
PUT /api/users/operateurs/{id}/modifier_niveau_competence/
```

**Body:**
```json
{
  "competence_id": 1,
  "niveau": "EXPERT"
}
```

### Absences d'un operateur

```http
GET /api/users/operateurs/{id}/absences/
```

### Historique des equipes

```http
GET /api/users/operateurs/{id}/historique_equipes/
```

### Operateurs disponibles aujourd'hui

```http
GET /api/users/operateurs/disponibles/
```

### Chefs potentiels

```http
GET /api/users/operateurs/chefs_potentiels/
```

> Retourne les operateurs avec la competence "Gestion d'equipe" niveau >= INTERMEDIAIRE

### Filtrer par competence

```http
GET /api/users/operateurs/par_competence/
```

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `competence_id` | number | ID de la competence |
| `competence_nom` | string | Nom de la competence |
| `niveau_minimum` | string | Niveau minimum |
| `disponible_uniquement` | boolean | Seulement les disponibles |

---

## Competences

### Liste des competences

```http
GET /api/users/competences/
```

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Recherche nom et description |
| `categorie` | string | TECHNIQUE ou ORGANISATIONNELLE |

### CRUD standard

```http
GET    /api/users/competences/{id}/
POST   /api/users/competences/
PUT    /api/users/competences/{id}/
DELETE /api/users/competences/{id}/
```

### Operateurs ayant cette competence

```http
GET /api/users/competences/{id}/operateurs/
```

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `niveau_minimum` | string | Niveau minimum requis |

---

## Equipes

### Liste des equipes

```http
GET /api/users/equipes/
```

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Recherche nom, specialite, chef |
| `actif` | boolean | Equipe active |
| `specialite` | string | Filtrer par specialite |
| `chef_equipe` | number | ID du chef |
| `statut_operationnel` | string | COMPLETE, PARTIELLE, INDISPONIBLE |
| `membres_min` | number | Minimum de membres |
| `membres_max` | number | Maximum de membres |

### Detail d'une equipe

```http
GET /api/users/equipes/{id}/
```

**Response:** `EquipeDetail` (inclut les membres)

### Creer une equipe

```http
POST /api/users/equipes/
```

**Body:** `EquipeCreate`

> Le chef doit avoir la competence "Gestion d'equipe" avec niveau >= INTERMEDIAIRE

### Modifier une equipe

```http
PUT /api/users/equipes/{id}/
PATCH /api/users/equipes/{id}/
```

### Desactiver une equipe

```http
DELETE /api/users/equipes/{id}/
```

### Membres d'une equipe

```http
GET /api/users/equipes/{id}/membres/
```

### Affecter des membres

```http
POST /api/users/equipes/{id}/affecter_membres/
```

**Body:**
```json
{
  "operateurs": [1, 2, 3]
}
```

### Retirer un membre

```http
POST /api/users/equipes/{id}/retirer_membre/
```

**Body:**
```json
{
  "operateur_id": 1
}
```

### Statut operationnel detaille

```http
GET /api/users/equipes/{id}/statut/
```

**Response:**
```json
{
  "equipe": { ... },
  "statut_operationnel": "PARTIELLE",
  "total_membres": 5,
  "disponibles_count": 3,
  "absents_count": 2,
  "disponibles": [ ... ],
  "absents": [
    {
      "operateur": { ... },
      "absence": { ... }
    }
  ]
}
```

### Historique des membres

```http
GET /api/users/equipes/{id}/historique/
```

---

## Absences

### Liste des absences

```http
GET /api/users/absences/
```

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Recherche operateur et motif |
| `operateur` | number | ID de l'operateur |
| `type_absence` | string | CONGE, MALADIE, FORMATION, AUTRE |
| `statut` | string | DEMANDEE, VALIDEE, REFUSEE, ANNULEE |
| `equipe` | number | ID de l'equipe |
| `date_debut_min` | date | Debut apres |
| `date_debut_max` | date | Debut avant |
| `date_fin_min` | date | Fin apres |
| `date_fin_max` | date | Fin avant |
| `en_cours` | boolean | En cours aujourd'hui |

### Detail d'une absence

```http
GET /api/users/absences/{id}/
```

### Creer une absence

```http
POST /api/users/absences/
```

**Body:** `AbsenceCreate`

> Validation automatique du chevauchement avec les absences existantes

### Modifier une absence

```http
PUT /api/users/absences/{id}/
PATCH /api/users/absences/{id}/
```

### Supprimer une absence

```http
DELETE /api/users/absences/{id}/
```

### Valider une absence

```http
POST /api/users/absences/{id}/valider/
```

**Body:**
```json
{
  "commentaire": "Absence validee"
}
```

### Refuser une absence

```http
POST /api/users/absences/{id}/refuser/
```

**Body:**
```json
{
  "commentaire": "Periode non disponible"
}
```

### Annuler une absence

```http
POST /api/users/absences/{id}/annuler/
```

### Absences en cours

```http
GET /api/users/absences/en_cours/
```

> Retourne les absences validees actives aujourd'hui

### Absences a valider

```http
GET /api/users/absences/a_valider/
```

> Retourne les absences avec statut DEMANDEE

### Equipes impactees

```http
GET /api/users/absences/equipes_impactees/
```

**Response:**
```json
[
  {
    "equipe": { ... },
    "absences": [ ... ]
  }
]
```

---

## Historique RH

```http
GET /api/users/historique-rh/
```

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `operateur_id` | number | Filtrer par operateur |
| `equipe_id` | number | Filtrer par equipe |
| `date_debut` | date | Debut de la periode |
| `date_fin` | date | Fin de la periode |
| `type` | string | equipes, absences, competences, all |

**Response:**
```json
{
  "equipes": [ ... ],     // si type=equipes ou all
  "absences": [ ... ],    // si type=absences ou all
  "competences": [ ... ]  // si type=competences ou all
}
```

---

## Statistiques

```http
GET /api/users/statistiques/
```

**Response:** `StatistiquesUtilisateurs`

---

## Pagination

Tous les endpoints de liste retournent un format pagine:

```json
{
  "count": 100,
  "next": "http://localhost:8000/api/users/operateurs/?page=2",
  "previous": null,
  "results": [ ... ]
}
```

---

## Exemples d'Appels Frontend (TypeScript)

```typescript
// Service API Users
const API_BASE = '/api/users';

// Liste des operateurs disponibles
async function getOperateursDisponibles(): Promise<OperateurList[]> {
  const response = await fetch(`${API_BASE}/operateurs/disponibles/`);
  return response.json();
}

// Creer un operateur
async function createOperateur(data: OperateurCreate): Promise<OperateurList> {
  const response = await fetch(`${API_BASE}/operateurs/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: data.email,
      nom: data.nom,
      prenom: data.prenom,
      password: data.password,
      numero_immatriculation: data.numeroImmatriculation,
      statut: data.statut,
      equipe: data.equipe,
      date_embauche: data.dateEmbauche,
      telephone: data.telephone,
      photo: data.photo,
    }),
  });
  return response.json();
}

// Obtenir le statut d'une equipe
async function getEquipeStatut(equipeId: number) {
  const response = await fetch(`${API_BASE}/equipes/${equipeId}/statut/`);
  return response.json();
}

// Valider une absence
async function validerAbsence(absenceId: number, commentaire?: string) {
  const response = await fetch(`${API_BASE}/absences/${absenceId}/valider/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commentaire }),
  });
  return response.json();
}

// Statistiques du module
async function getStatistiques(): Promise<StatistiquesUtilisateurs> {
  const response = await fetch(`${API_BASE}/statistiques/`);
  return response.json();
}
```

---

## Utilitaires de Conversion

```typescript
// Convertir snake_case vers camelCase
function snakeToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = snakeToCamel(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

// Convertir camelCase vers snake_case pour l'envoi
function camelToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = camelToSnake(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}
```

---

## Competences Predefinies

Les competences suivantes sont initialisees dans la base de donnees:

### Techniques et Operationnelles
1. Utilisation de tondeuse
2. Utilisation de debroussailleuse
3. Utilisation de tronconneuse
4. Desherbage manuel et mecanique
5. Binage des sols
6. Confection des cuvettes
7. Taille de nettoyage
8. Taille de decoration
9. Arrosage
10. Elagage de palmiers
11. Nettoyage general

### Organisationnelles et Humaines
1. **Gestion d'equipe** (requis pour etre chef d'equipe)
2. Organisation des taches
3. Supervision et coordination
4. Respect des procedures

---

**Date de creation** : 2025-12-11
**Version** : 1.0
**Module Backend** : `api_users`
