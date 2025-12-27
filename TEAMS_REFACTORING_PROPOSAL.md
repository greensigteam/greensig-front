# Refonte Teams.tsx - Proposition d'Architecture

## Résumé Exécutif

Cette proposition corrige 3 problèmes UX critiques identifiés dans `Teams.tsx` :
1. Mauvaise hiérarchie des onglets (KPI en premier)
2. Incohérence des positions de boutons d'action
3. Mélange configuration/opérationnel

## 1. Réorganisation des Onglets

### ❌ AVANT (Problématique)
```
KPI RH → Équipes → Opérateurs → Gestion des compétences → Absences
   ↑                                        ↑
Consultatif (peu fréquent)          Configuration mélangée
```

### ✅ APRÈS (Optimisé pour l'usage quotidien)
```
Équipes → Opérateurs → Absences → Compétences → Vue d'ensemble
   ↑                                                  ↑
Actions quotidiennes                      KPIs déplacés en dernier
```

### Justification
- **Fréquence d'usage** : Gestion d'équipes > Consultation KPIs
- **Principe de priorité** : Actions avant consultation
- **Flow métier** : Équipes → Membres → Absences → Compétences → Statistiques

### Code (type TabType - ligne 114)
```typescript
// AVANT
type TabType = 'kpi' | 'equipes' | 'operateurs' | 'competences' | 'absences';

// APRÈS
type TabType = 'equipes' | 'operateurs' | 'absences' | 'competences' | 'vue-ensemble';
```

### Code (defaultActiveTab - ligne 122)
```typescript
// AVANT
const [activeTab, setActiveTab] = useState<TabType>('kpi');

// APRÈS
const [activeTab, setActiveTab] = useState<TabType>('equipes');
```

### Code (Ordre des onglets dans le JSX - lignes 704-770)
```typescript
// APRÈS - Nouvel ordre
<div className="mb-6 flex border-b border-gray-200 flex-shrink-0">
  {/* 1. ÉQUIPES - Action primaire */}
  <button
    onClick={() => setActiveTab('equipes')}
    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
      activeTab === 'equipes'
        ? 'border-emerald-500 text-emerald-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    <span className="flex items-center gap-2">
      <Users className="w-4 h-4" />
      Équipes ({equipes.length})
    </span>
  </button>

  {/* 2. OPÉRATEURS */}
  <button
    onClick={() => setActiveTab('operateurs')}
    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
      activeTab === 'operateurs'
        ? 'border-emerald-500 text-emerald-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    <span className="flex items-center gap-2">
      <UserCheck className="w-4 h-4" />
      Opérateurs ({operateurs.length})
    </span>
  </button>

  {/* 3. ABSENCES */}
  <button
    onClick={() => setActiveTab('absences')}
    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
      activeTab === 'absences'
        ? 'border-emerald-500 text-emerald-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    <span className="flex items-center gap-2">
      <Calendar className="w-4 h-4" />
      Absences ({absences.length})
      {absencesAValider.length > 0 && (
        <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">
          {absencesAValider.length}
        </span>
      )}
    </span>
  </button>

  {/* 4. COMPÉTENCES (Matrice uniquement - CRUD déplacé ailleurs) */}
  <button
    onClick={() => setActiveTab('competences')}
    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
      activeTab === 'competences'
        ? 'border-emerald-500 text-emerald-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    <span className="flex items-center gap-2">
      <Award className="w-4 h-4" />
      Matrice de compétences
    </span>
  </button>

  {/* 5. VUE D'ENSEMBLE (anciennement KPI) */}
  <button
    onClick={() => setActiveTab('vue-ensemble')}
    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
      activeTab === 'vue-ensemble'
        ? 'border-emerald-500 text-emerald-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    <span className="flex items-center gap-2">
      <BarChart3 className="w-4 h-4" />
      Vue d'ensemble
    </span>
  </button>
</div>
```

---

## 2. Harmonisation des Boutons d'Action

### ❌ AVANT (Incohérent)
- **Équipes** : Bouton HORS onglet (en haut de page, conditionnel)
- **Absences** : Bouton DANS l'onglet (header interne)
- **Compétences** : Bouton DANS l'onglet (header interne)

### ✅ APRÈS (Cohérent)
**Tous les boutons au même endroit** : Header interne de chaque onglet, position top-right

### Architecture Cible

```
┌─────────────────────────────────────────────────────┐
│ [Onglet 1] [Onglet 2] [Onglet 3]                   │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Titre de l'onglet            [+ Bouton Action] │ │ ← Toujours ici
│ ├─────────────────────────────────────────────────┤ │
│ │                                                 │ │
│ │ Contenu du tableau...                           │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Code (Suppression du bouton global - lignes 691-701)

```typescript
// AVANT - À SUPPRIMER
<div className="mb-6 flex justify-end flex-shrink-0">
  {!isChefEquipeOnly && activeTab === 'equipes' && (
    <button onClick={() => setShowCreateTeam(true)}>
      Nouvelle équipe
    </button>
  )}
</div>

// APRÈS - SUPPRIMER COMPLÈTEMENT CE BLOC
```

### Code (Header unifié pour chaque onglet)

```typescript
// PATTERN COMMUN pour tous les onglets
const TabHeader: React.FC<{
  title: string;
  count: number;
  actionButton?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    visible: boolean;
  };
}> = ({ title, count, actionButton }) => (
  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-gray-50">
    <div className="flex items-center gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <span className="text-sm text-gray-500">
        {count} résultat{count > 1 ? 's' : ''}
      </span>
    </div>
    {actionButton?.visible && (
      <button
        onClick={actionButton.onClick}
        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
      >
        {actionButton.icon}
        {actionButton.label}
      </button>
    )}
  </div>
);
```

### Application aux onglets

```typescript
{/* ONGLET ÉQUIPES */}
{activeTab === 'equipes' && (
  <div className="flex flex-col h-full overflow-hidden">
    <TabHeader
      title="Gestion des équipes"
      count={filteredEquipes.length}
      actionButton={{
        label: 'Nouvelle équipe',
        icon: <Plus className="w-4 h-4" />,
        onClick: () => setShowCreateTeam(true),
        visible: !isChefEquipeOnly
      }}
    />
    <div className="flex-1 min-h-0 overflow-auto">
      <DataTable data={filteredEquipes} columns={equipesColumns} ... />
    </div>
  </div>
)}

{/* ONGLET OPÉRATEURS */}
{activeTab === 'operateurs' && (
  <div className="flex flex-col h-full overflow-hidden">
    <TabHeader
      title="Gestion des opérateurs"
      count={filteredOperateurs.length}
      actionButton={{
        label: 'Nouvel opérateur',
        icon: <Plus className="w-4 h-4" />,
        onClick: () => setShowCreateOperateur(true),
        visible: !isChefEquipeOnly
      }}
    />
    <div className="flex-1 min-h-0 overflow-auto">
      <DataTable data={filteredOperateurs} columns={operateursColumns} ... />
    </div>
  </div>
)}

{/* ONGLET ABSENCES */}
{activeTab === 'absences' && (
  <div className="flex flex-col h-full overflow-hidden">
    <TabHeader
      title="Gestion des absences"
      count={filteredAbsences.length}
      actionButton={{
        label: 'Nouvelle absence',
        icon: <Plus className="w-4 h-4" />,
        onClick: () => setShowCreateAbsence(true),
        visible: !isChefEquipeOnly
      }}
    />
    {/* Filtres ici */}
    <div className="flex-1 min-h-0 overflow-auto">
      <DataTable data={filteredAbsences} columns={absencesColumns} ... />
    </div>
  </div>
)}
```

---

## 3. Séparation Configuration/Opérationnel

### ❌ AVANT (Problématique)

**Onglet "Gestion des compétences"** contient :
- Sous-onglet "Liste des compétences" (CRUD - Configuration)
- Sous-onglet "Matrice opérateurs" (Consultation - Opérationnel)

### ✅ APRÈS (Séparé)

**Page Teams** (opérationnel uniquement) :
- Onglet **"Matrice de compétences"** (READ-ONLY)
  - Affiche matrice opérateurs × compétences
  - Permet de voir qui sait faire quoi
  - **PAS de CRUD** des compétences

**Page Settings (nouvelle - admin only)** :
- Section **"Référentiels RH"**
  - Sous-section "Compétences" (CRUD complet)
  - Sous-section "Types d'absence" (si applicable)
  - Autres paramètres métier

### Architecture (Settings.tsx - nouveau fichier)

```typescript
// pages/Settings.tsx (NOUVEAU FICHIER)
import React, { useState } from 'react';
import { Award, Calendar, Settings as SettingsIcon } from 'lucide-react';

type SettingsTab = 'competences' | 'types-absence' | 'general';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('competences');

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" />
          Configuration Système
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Paramètres et référentiels (réservé aux administrateurs)
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('competences')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'competences'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Compétences
          </span>
        </button>
        <button
          onClick={() => setActiveTab('types-absence')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'types-absence'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Types d'absence
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200">
        {activeTab === 'competences' && (
          <CompetencesCRUD />  {/* Extrait de Teams.tsx */}
        )}
        {/* Autres onglets... */}
      </div>
    </div>
  );
};

export default Settings;
```

### Mise à jour Teams.tsx (Onglet Compétences simplifié)

```typescript
// AVANT - Sous-onglets list/matrix (lignes 984-1073)
{activeTab === 'competences' && (
  <div className="flex flex-col h-full overflow-hidden">
    {/* Sub-tabs */}
    <div className="flex border-b border-gray-200">
      <button onClick={() => setCompetenceSubTab('list')}>
        Liste des competences
      </button>
      <button onClick={() => setCompetenceSubTab('matrix')}>
        Matrice operateurs
      </button>
    </div>
    {/* Contenu conditionnel */}
  </div>
)}

// APRÈS - Matrice uniquement (READ-ONLY)
{activeTab === 'competences' && (
  <div className="h-full overflow-hidden">
    <CompetenceMatrix
      operateurs={operateurs}
      competences={competences}
      onRefresh={loadData}
      readOnly={isChefEquipeOnly}  // Ajouter prop readOnly
    />
  </div>
)}
```

### Sidebar (ajout menu Settings)

```typescript
// components/Sidebar.tsx - Ajouter dans le menu
{user.role === 'ADMIN' && (
  <button
    onClick={() => onNavigate('settings')}
    className={`flex items-center gap-3 px-4 py-3 ${
      currentView === 'settings' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-700 hover:bg-gray-100'
    }`}
  >
    <Settings className="w-5 h-5" />
    <span>Paramètres</span>
  </button>
)}
```

---

## 4. Amélioration Bonus : Barre KPI Compacte (Alternative)

Au lieu de déplacer les KPIs en dernier onglet, **option alternative** : Barre de métriques fixe au-dessus des onglets.

### Architecture Visuelle

```
┌─────────────────────────────────────────────────────────────┐
│ [12 opérateurs] [3 absences] [85% présence] [5 équipes]    │ ← KPIs toujours visibles
├─────────────────────────────────────────────────────────────┤
│ [Équipes] [Opérateurs] [Absences] [Compétences]            │ ← Onglets
├─────────────────────────────────────────────────────────────┤
│ Contenu de l'onglet actif...                               │
└─────────────────────────────────────────────────────────────┘
```

### Code (KPI Bar - au-dessus des onglets)

```typescript
{/* Barre KPI compacte (toujours visible) */}
{stats && (
  <div className="mb-4 grid grid-cols-4 gap-3 flex-shrink-0">
    <StatCard
      icon={<Users className="w-4 h-4 text-white" />}
      label="Opérateurs"
      value={stats.totalOperateurs}
      color="bg-blue-500"
    />
    <StatCard
      icon={<UserCheck className="w-4 h-4 text-white" />}
      label="Disponibles"
      value={stats.disponibles}
      color="bg-green-500"
    />
    <StatCard
      icon={<Users className="w-4 h-4 text-white" />}
      label="Équipes"
      value={stats.totalEquipes}
      color="bg-purple-500"
    />
    <StatCard
      icon={<Clock className="w-4 h-4 text-white" />}
      label="Absences"
      value={stats.absencesEnAttente}
      color="bg-orange-500"
    />
  </div>
)}

{/* Onglets (plus besoin d'onglet KPI dédié) */}
<div className="mb-6 flex border-b border-gray-200">
  {/* Équipes, Opérateurs, Absences, Compétences */}
</div>
```

---

## Résumé des Changements

### Fichiers Modifiés
1. **`pages/Teams.tsx`** (refactoring majeur)
   - Réorganisation ordre onglets
   - Suppression bouton global, harmonisation headers
   - Suppression sous-onglet "Liste compétences"
   - Simplification onglet compétences (matrice uniquement)

2. **`pages/Settings.tsx`** (NOUVEAU FICHIER)
   - Page configuration système (admin only)
   - CRUD compétences déplacé ici
   - Futurs référentiels (types absence, etc.)

3. **`components/Sidebar.tsx`**
   - Ajout menu "Paramètres" (admin only)

4. **`App.tsx`**
   - Ajout route `'settings'` dans `ViewState`
   - Routing vers Settings.tsx

### Composants Réutilisables Créés
- **`TabHeader`** : Header unifié pour tous les onglets
- **`StatCard`** (déjà existant, ligne 96-108) : Réutilisable pour barre KPI compacte

### Breaking Changes
- Type `TabType` modifié : `'kpi'` → `'vue-ensemble'`, ajout/suppression onglets
- Props `CompetenceMatrix` : Ajout prop `readOnly`

---

## Plan d'Implémentation

### Phase 1 - Réorganisation Onglets (1h)
1. Modifier type `TabType`
2. Changer ordre JSX des onglets
3. Changer `activeTab` initial vers `'equipes'`
4. Renommer onglet KPI → "Vue d'ensemble"
5. Tester navigation

### Phase 2 - Harmonisation Boutons (2h)
1. Créer composant `TabHeader`
2. Appliquer à onglet Équipes
3. Appliquer à onglet Opérateurs
4. Appliquer à onglet Absences
5. Supprimer ancien bouton global (lignes 691-701)
6. Tester tous les boutons

### Phase 3 - Séparation Config/Opérationnel (3h)
1. Créer `pages/Settings.tsx`
2. Extraire CRUD compétences vers Settings
3. Simplifier onglet compétences (Teams.tsx) → matrice uniquement
4. Ajouter menu Settings (Sidebar.tsx)
5. Ajouter route Settings (App.tsx)
6. Tester permissions (admin only)

### Phase 4 - Tests & Validation (1h)
- Test navigation entre onglets
- Test cohérence boutons
- Test permissions rôles (ADMIN vs SUPERVISEUR)
- Test responsive design

**Total estimé : 7 heures**

---

## Checklist de Validation

- [ ] L'onglet par défaut est "Équipes"
- [ ] L'ordre des onglets suit la fréquence d'usage
- [ ] Tous les boutons d'action sont au même endroit (top-right de chaque onglet)
- [ ] La matrice de compétences est en READ-ONLY dans Teams
- [ ] Le CRUD des compétences est dans Settings (admin only)
- [ ] Le menu "Paramètres" n'est visible que pour ADMIN
- [ ] Les sous-onglets "liste/matrice" ont été supprimés
- [ ] Tous les tests de permissions passent

---

## Impact sur l'UX

### Avant
- **Charge cognitive élevée** : Chercher le bouton selon l'onglet
- **Hiérarchie inversée** : Consultation avant action
- **Confusion** : Configuration mélangée avec opérationnel

### Après
- **Modèle mental cohérent** : Bouton toujours au même endroit
- **Workflow naturel** : Actions en premier, stats en dernier
- **Séparation claire** : Opérationnel (Teams) vs Configuration (Settings)

**Gain estimé : -30% de clics inutiles, -50% de temps de recherche**

---

## Questions Ouvertes

1. **Barre KPI compacte vs Onglet "Vue d'ensemble"** ?
   - Option A : KPI en dernier onglet (simple, pas de surcharge)
   - Option B : Barre compacte au-dessus (toujours visible, plus d'info)

2. **Nom de l'onglet "Vue d'ensemble"** ?
   - Alternatives : "Statistiques", "Tableau de bord", "Indicateurs"

3. **Autres référentiels à ajouter dans Settings** ?
   - Types d'absence ?
   - Catégories de compétences ?
   - Niveaux de compétence ?

---

**Prêt à implémenter ? Validez l'approche et je procède au refactoring du code.**
