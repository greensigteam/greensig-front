# Rapport de Site - Structure et Contenu

## Vue d'ensemble

Le rapport de site est accessible via `/monthly-report` (menu "Rapport de Site" dans la sidebar).
Il permet de générer un PDF récapitulatif des activités effectuées sur un site donné sur une période personnalisée.

---

## Filtres disponibles

| Filtre | Description |
|--------|-------------|
| **Site** | **Obligatoire** - Le site pour lequel générer le rapport |
| **Date début** | Date de début de la période (format YYYY-MM-DD) |
| **Date fin** | Date de fin de la période (format YYYY-MM-DD) |

> **Note** : Par défaut, la période est définie du 1er jour du mois en cours jusqu'à aujourd'hui.

---

## Sections du rapport

### 1. Page de couverture
- Titre "Rapport d'Activité"
- Nom du site
- Période sélectionnée
- Nom du client (si disponible)
- Superficie du site
- Date de génération
- Logo GreenSIG

### 2. Avant-propos
- Texte d'introduction avec la période
- **Informations du site** : nom, adresse, superficie, client

### 3. Travaux effectués
Liste des tâches **TERMINÉES ET VALIDÉES PAR L'ADMIN** durant la période, groupées par type :
- Nom du type de tâche
- Nombre d'interventions

> **Important** : Seules les tâches ayant été validées par un administrateur (`etat_validation = 'VALIDEE'`) apparaissent dans le rapport. Les tâches terminées mais non validées ne sont pas incluses.

**Source des données :** `api_planification.Tache` où :
- `statut = 'TERMINEE'`
- `etat_validation = 'VALIDEE'` (validée par l'admin)
- `date_fin_reelle` dans la période sélectionnée
- `objets.site_id = site_id` (tâches liées au site)

### 4. Travaux planifiés
Liste des tâches planifiées pour les **30 jours suivant la période** :
- Nom du type de tâche
- Nombre prévu

**Source des données :** `api_planification.Tache` où :
- `statut IN ('PLANIFIEE', 'NON_DEBUTEE')`
- `date_debut_planifiee` dans les 30 jours suivant la date de fin
- `objets.site_id = site_id` (tâches liées au site)

### 5. Photos avant/après
Galerie de photos montrant l'état avant et après intervention :
- Limitées à 20 paires maximum
- Groupées par tâche
- Affiche le nom de la tâche
- **Uniquement les photos des tâches validées par l'admin**

**Source des données :** `api_suivi_taches.Photo` où :
- `type_photo IN ('AVANT', 'APRES')`
- `date_prise` dans la période sélectionnée
- `tache.statut = 'TERMINEE'`
- `tache.etat_validation = 'VALIDEE'` (validée par l'admin)
- `objet.site_id = site_id` (photos liées au site)
- Uniquement les paires complètes (avant ET après)

### 6. Points d'attention (Réclamations)
Liste des réclamations créées durant la période :
- Numéro de réclamation
- Zone concernée
- Description
- Statut (avec code couleur : vert si résolue, orange sinon)
- Niveau d'urgence

**Source des données :** `api_reclamations.Reclamation` où :
- `date_creation` dans la période sélectionnée
- `zone.site_id = site_id` (réclamations liées au site)

### 7. Statistiques de la période
Tableau récapitulatif avec les indicateurs suivants :

| Indicateur | Description | Source |
|------------|-------------|--------|
| Tâches terminées | Nombre de tâches complétées **et validées** | `Tache.statut = 'TERMINEE' AND etat_validation = 'VALIDEE'` |
| Tâches planifiées | Nombre de tâches prévues | `Tache.date_debut_planifiee` dans la période |
| Taux de réalisation | % terminées validées / planifiées | Calculé |
| Réclamations créées | Nouvelles réclamations | `Reclamation.date_creation` |
| Réclamations résolues | Réclamations fermées | `Reclamation.statut IN ('RESOLUE', 'CLOTUREE')` |
| Heures travaillées | Total des heures (tâches validées) | `ParticipationTache.heures_travaillees` (tâches validées uniquement) |

> **Note** : Les statistiques concernant les tâches terminées et les heures travaillées ne prennent en compte que les tâches ayant été validées par un administrateur.

---

## Aperçu dans l'interface

Avant de télécharger le PDF, l'interface affiche un aperçu avec :

1. **Bandeau coloré** : Titre du rapport + nom du site + bouton "Télécharger PDF"
2. **6 cartes statistiques** : Affichage rapide des KPIs
3. **Sections dépliables** :
   - Travaux effectués (ouvert par défaut)
   - Photos avant/après (fermé par défaut)
   - Points d'attention (fermé par défaut)

---

## Format du PDF généré

- **Format** : A4 portrait
- **Nom du fichier** : `Rapport_[NOM_SITE]_[DATE_DEBUT]_[DATE_FIN].pdf`
- **Exemple** : `Rapport_Jardin_Central_20251201_20251231.pdf`

### Pages du PDF :
1. Page de couverture
2. Avant-propos + Informations du site
3. Travaux effectués + Travaux planifiés
4. Points d'attention (si des réclamations existent)
5. Statistiques de la période + Signature

---

## API Backend

**Endpoint** : `GET /api/monthly-report/`

**Paramètres** :
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `site_id` | int | Oui | ID du site |
| `date_debut` | string | Oui | Date de début (format YYYY-MM-DD) |
| `date_fin` | string | Oui | Date de fin (format YYYY-MM-DD) |

**Exemple** :
```
GET /api/monthly-report/?site_id=1&date_debut=2025-12-01&date_fin=2025-12-31
```

**Réponse** :
```json
{
  "periode": {
    "date_debut": "2025-12-01T00:00:00+00:00",
    "date_fin": "2025-12-31T23:59:59+00:00",
    "nb_jours": 31
  },
  "site": {
    "id": 1,
    "nom": "Jardin Central",
    "adresse": "123 Rue Example",
    "superficie": 5000,
    "client": "Mairie de Paris"
  },
  "travaux_effectues": [...],
  "travaux_planifies": [...],
  "photos": [...],
  "reclamations": [...],
  "statistiques": {
    "taches_terminees": 15,
    "taches_planifiees": 20,
    "taux_realisation": 75.0,
    "reclamations_creees": 3,
    "reclamations_resolues": 2,
    "heures_travaillees": 120.5
  }
}
```

**Erreurs possibles** :
- `400 Bad Request` : Paramètre manquant ou format de date invalide
- `404 Not Found` : Site non trouvé

---

## Workflow de validation des tâches

Pour qu'une tâche apparaisse dans le rapport, elle doit passer par les étapes suivantes :

1. **Création** : La tâche est créée avec le statut `PLANIFIEE`
2. **Exécution** : La tâche passe au statut `EN_COURS` puis `TERMINEE`
3. **Validation admin** : L'administrateur valide la tâche (`etat_validation = 'VALIDEE'`)

**États de validation possibles :**
- `EN_ATTENTE` : En attente de validation (défaut)
- `VALIDEE` : Validée par l'administrateur
- `REJETEE` : Rejetée par l'administrateur

> **Règle métier** : Une tâche doit être à la fois `TERMINEE` ET `VALIDEE` pour apparaître dans le rapport. Cette double vérification garantit que seuls les travaux officiellement approuvés sont inclus dans les rapports.

---

## Permissions

- **Accès** : Réservé aux utilisateurs avec le rôle `ADMIN` ou `SUPERVISEUR`
- **Authentification** : JWT requis