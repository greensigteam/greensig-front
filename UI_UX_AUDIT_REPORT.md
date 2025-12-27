# 📊 GreenSIG - Rapport d'Audit UI/UX

**Date** : 23 décembre 2025
**Version** : 1.0
**Statut** : En cours d'implémentation

---

## 📑 Table des Matières

1. [Résumé Exécutif](#résumé-exécutif)
2. [Nettoyage Effectué](#nettoyage-effectué)
3. [Problèmes Critiques](#problèmes-critiques)
4. [Problèmes Importants](#problèmes-importants)
5. [Améliorations Moyennes](#améliorations-moyennes)
6. [Plan d'Action](#plan-daction)
7. [Fichiers Prioritaires](#fichiers-prioritaires)
8. [Suivi d'Avancement](#suivi-davancement)

---

## 📋 Résumé Exécutif

Cet audit identifie des incohérences significatives à travers le frontend GreenSIG qui impactent l'expérience utilisateur, la maintenabilité et la cohérence visuelle. L'analyse couvre 50+ fichiers de composants à travers les tableaux, modales, cartes, badges, boutons et formulaires.

**Statistiques clés** :
- 15+ implémentations de badges inline à consolider
- 15+ modales avec des patterns différents
- 3 variations de styles de boutons primaires
- 8+ patterns différents pour les inputs
- Z-index chaotique (50, 60, 1000)

---

## ✅ Nettoyage Effectué

### Header.tsx - Simplification de la Navbar

**Éléments supprimés** :
- ❌ Bouton de géolocalisation (icône position)
- ❌ Select "Aller à un site..." pour navigation
- ❌ Import `fetchAllSites` et type `SiteFrontend` inutilisés
- ❌ State `sites` et `useEffect` de chargement

**Fichier modifié** : `components/Header.tsx`
**Lignes supprimées** : 324-361, 65-84
**Résultat** : ✅ Build réussi sans erreurs

---

## 🔴 Problèmes Critiques

### 1. BADGES - Duplication Massive

**Impact** : Code dupliqué, maintenance difficile, incohérences visuelles

**Problème** :
```tsx
// ❌ MAUVAIS - Répété dans 15+ endroits
<span className={`px-2 py-1 rounded-full text-xs font-medium ${
  e.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
}`}>
  {e.actif ? 'Oui' : 'Non'}
</span>

// ❌ MAUVAIS - Composant custom dans Teams.tsx (lignes 92-130)
const StatutOperateurBadge: React.FC<{ statut?: StatutOperateur | null }> = ({ statut }) => {
  const safe = getBadgeColors(STATUT_OPERATEUR_COLORS, statut);
  const label = statut ? STATUT_OPERATEUR_LABELS[statut] : 'Non renseigné';
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${safe.bg} ${safe.text}`}>
      {label}
    </span>
  );
};
```

**Localisations** :
- `pages/Teams.tsx` : Lignes 92-130 (4 composants de badges)
- `pages/Teams.tsx` : Ligne 1019 (Badge Actif/Inactif)
- `pages/Users.tsx` : Multiples badges inline
- `pages/Inventory.tsx` : Badges de type
- 8+ autres localisations

**Solution** :
```tsx
// ✅ BON - Utiliser un composant Badge unifié
<Badge variant="status" type="operateur" value={statut} />
<Badge variant="boolean" value={e.actif} labels={{true: 'Actif', false: 'Inactif'}} />
<Badge variant="custom" bg="bg-blue-100" text="text-blue-800">Chef d'équipe</Badge>
```

**Tailles trouvées** :
| Localisation | Padding | Font Size | Border Radius |
|--------------|---------|-----------|---------------|
| StatusBadge.tsx | `px-2.5 py-0.5` | `text-xs` | `rounded-full` |
| Teams.tsx (inline) | `px-2 py-1` | `text-xs` | `rounded-full` |
| Inventory.tsx | `px-1.5 py-0.5` | `text-xs` | `rounded` |
| Planning.tsx | `px-2 py-0.5` | `text-xs` | `rounded-full` |

---

### 2. MODALES - Z-index Chaotique

**Problème** : Pas de hiérarchie claire, risque de conflits

**Z-index trouvés** :
| Composant | Z-index | Fichier |
|-----------|---------|---------|
| ConfirmModal | `z-[60]` | `components/ConfirmModal.tsx` |
| CreateObjectModal | `z-[1000]` | `components/CreateObjectModal.tsx` |
| EditObjectModal | `z-50` | `components/EditObjectModal.tsx` |
| EditUserModal | `z-50` | `components/EditUserModal.tsx` |
| CreateTeamModal | `z-50` | `pages/Teams.tsx` |
| Inventory Detail Modal | `z-50` | `pages/Inventory.tsx` |

**Solution recommandée** :
```tsx
// Hiérarchie standardisée
const Z_INDEX = {
  DROPDOWN: 40,
  MODAL_BASE: 50,
  MODAL_CONFIRM: 60,
  TOOLTIP: 70,
  TOAST: 100
};
```

**Autres incohérences modales** :

1. **Border Radius** :
   - `rounded-xl` (80%)
   - `rounded-lg` (20%)
   - → Standardiser à `rounded-xl`

2. **Backdrop** :
   - Avec blur : `bg-black/50 backdrop-blur-sm` ✅
   - Sans blur : `bg-black/50` ❌
   - → Toujours utiliser `backdrop-blur-sm`

3. **Structure Header** :
   - Pattern A (ConfirmModal) : Centré avec icône
   - Pattern B (La plupart) : Flex justify-between avec titre + close
   - Pattern C (CreateObjectModal) : Background thème coloré

---

### 3. TABLEAUX - Colonnes d'Actions Incohérentes

**Pattern 1** (Teams.tsx) : Icônes seules
```tsx
<button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
  <Edit2 className="w-4 h-4" />
</button>
```

**Pattern 2** (Inventory.tsx) : Boutons complets avec texte
```tsx
<button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
  <MapIcon className="w-4 h-4" />
  Carte
</button>
```

**Recommandation** : Standardiser sur **icônes seules** pour économiser l'espace dans les tableaux

---

## 🟠 Problèmes Importants

### 4. COULEURS DE BOUTONS Incohérentes

**Problème** : Utilisation de `green-600` ET `emerald-600` pour le même usage

| Utilisation | Couleurs trouvées | Standardisation recommandée |
|-------------|-------------------|----------------------------|
| Primaire (Success) | `emerald-600` + `green-600` | → `emerald-600` uniquement |
| Secondaire (Info) | `blue-600` + `blue-500` | → `blue-600` uniquement |
| Danger (Delete) | `red-600` + `red-500` | → `red-600` uniquement |
| Avertissement | `amber-600` + `yellow-600` + `orange-600` | → `amber-600` uniquement |

**Tailles de boutons trouvées** :
```tsx
// Small (tables, actions)
className="p-1 text-blue-600 hover:bg-blue-100 rounded"

// Medium (filtres)
className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg"

// Large (modales, headers)
className="px-4 py-2 bg-emerald-600 text-white rounded-lg"

// Extra large (pages)
className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium"
```

**États hover incohérents** :
- Pattern 1 : `bg-emerald-600 hover:bg-emerald-700` ✅
- Pattern 2 : `style.filter = 'brightness(0.9)'` ❌
- Pattern 3 : `hover:bg-gray-100` (icônes)

---

### 5. CARTES / PANELS - Border Radius Mélangé

**Variations trouvées** :
```tsx
// Pattern A - Dashboard
className="bg-white rounded-lg border border-gray-200 p-3"

// Pattern B - Map Panels
className="bg-white rounded-xl shadow-2xl border border-gray-200"

// Pattern C - Inventory Filters
className="mb-6 pb-4 border-b border-gray-200"
```

**Recommandation** :
```tsx
// Small card/stat
className="bg-white rounded-lg border border-gray-200 p-3"

// Medium card/panel
className="bg-white rounded-lg border border-gray-200 p-4"

// Large panel
className="bg-white rounded-lg border border-gray-200 p-6"

// Modal (exception)
className="bg-white rounded-xl shadow-2xl border border-gray-200"
```

---

### 6. FORMULAIRES - Focus States Multiples

**Patterns trouvés** :
```tsx
// Pattern A (Le plus commun) ✅
className="focus:ring-2 focus:ring-emerald-500 outline-none"

// Pattern B
className="focus:ring-2 focus:ring-emerald-500 focus:border-transparent"

// Pattern C
className="focus:ring-2 focus:ring-emerald-500"
```

**Standardisation** :
```tsx
// À utiliser partout
className="w-full px-3 py-2 border border-gray-300 rounded-lg
           focus:ring-2 focus:ring-emerald-500 outline-none
           transition-all"
```

---

## 🟡 Améliorations Moyennes

### 7. Espacement (Gap) Inconsistant

| Utilisation | Gaps trouvés | Recommandation |
|-------------|--------------|----------------|
| Boutons footer modales | `gap-3` | ✅ Conserver |
| Champs de formulaire | `space-y-4` | ✅ Conserver |
| Grilles de cartes | `gap-3`, `gap-4`, `gap-6` | → Standardiser à `gap-4` |
| Lignes de filtres | `gap-2`, `gap-3`, `gap-4` | → Standardiser à `gap-3` |

### 8. Ombres (Shadows)

**Variations trouvées** :
- Pas d'ombre (la plupart des cartes)
- `shadow-sm` (états hover)
- `shadow-lg` (dropdowns)
- `shadow-2xl` (modales)

**Recommandation** :
```tsx
// Cartes normales
className="border border-gray-200" // Pas d'ombre, juste bordure

// Cartes hover
className="hover:shadow-sm transition-shadow"

// Dropdowns / Suggestions
className="shadow-lg"

// Modales
className="shadow-2xl"
```

---

## 📋 Plan d'Action

### Phase 1 : Consolidation des Badges (2-3 jours) 🔴 **EN COURS**

**Objectifs** :
- [ ] Créer `components/shared/Badge.tsx` avec variants
- [ ] Étendre StatusBadge ou créer composant unifié
- [ ] Remplacer 15+ implémentations inline
- [ ] Documenter l'utilisation

**Nouveau composant Badge** :
```tsx
// Badge.tsx
interface BadgeProps {
  variant: 'status' | 'boolean' | 'role' | 'custom';
  value?: string | boolean;
  type?: string; // Pour variant="status"
  size?: 'xs' | 'sm' | 'md';
  labels?: { true: string; false: string }; // Pour boolean
  bg?: string; // Pour custom
  text?: string; // Pour custom
  children?: React.ReactNode; // Pour custom
}

// Utilisations
<Badge variant="status" type="operateur" value="DISPONIBLE" />
<Badge variant="boolean" value={true} labels={{true: 'Actif', false: 'Inactif'}} />
<Badge variant="role" value="ADMIN" />
<Badge variant="custom" bg="bg-purple-100" text="text-purple-800">VIP</Badge>
```

**Fichiers à modifier** :
- [ ] `components/shared/Badge.tsx` (nouveau)
- [ ] `pages/Teams.tsx` (lignes 92-130, 1001-1131)
- [ ] `pages/Users.tsx` (badges inline)
- [ ] `pages/Inventory.tsx` (badges de type)
- [ ] `pages/Planning.tsx` (badges priorité)
- [ ] `pages/SuiviTaches.tsx` (badges statut)

---

### Phase 2 : Standardisation Modales (3-4 jours) 🟠

**Objectifs** :
- [ ] Créer `components/shared/BaseModal.tsx`
- [ ] Définir z-index constants
- [ ] Migrer toutes les modales (15+)
- [ ] Standardiser animations

**Template BaseModal** :
```tsx
// BaseModal.tsx
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  footer?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'confirm' | 'danger';
}

// Structure standardisée
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
  <div className="bg-white rounded-xl shadow-2xl w-full max-w-{size} max-h-[90vh] overflow-hidden flex flex-col">
    {/* Header */}
    <div className="p-6 border-b border-gray-200 flex items-center justify-between">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* Body */}
    <div className="flex-1 overflow-y-auto p-6">
      {children}
    </div>

    {/* Footer */}
    {footer && (
      <div className="p-6 border-t border-gray-200 flex gap-3">
        {footer}
      </div>
    )}
  </div>
</div>
```

**Z-index constants** :
```tsx
// constants/zIndex.ts
export const Z_INDEX = {
  DROPDOWN: 40,
  MODAL_BASE: 50,
  MODAL_CONFIRM: 60,
  TOOLTIP: 70,
  TOAST: 100
} as const;
```

**Modales à migrer** :
- [ ] `components/ConfirmModal.tsx`
- [ ] `components/CreateObjectModal.tsx`
- [ ] `components/EditObjectModal.tsx`
- [ ] `components/users/EditUserModal.tsx`
- [ ] `pages/Teams.tsx` (CreateTeamModal, EditTeamModal)
- [ ] `pages/Inventory.tsx` (Detail modal)
- [ ] ... +9 autres modales

---

### Phase 3 : Harmonisation Boutons (2 jours) 🟠

**Objectifs** :
- [ ] Créer `components/shared/Button.tsx`
- [ ] Définir variants et tailles
- [ ] Remplacer tous les boutons (50+ fichiers)
- [ ] Documenter patterns

**Composant Button** :
```tsx
// Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

// Classes par variant
const VARIANT_CLASSES = {
  primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  secondary: 'bg-blue-600 hover:bg-blue-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
  outline: 'bg-transparent border-2 border-gray-300 hover:border-emerald-600 text-gray-700'
};

// Classes par taille
const SIZE_CLASSES = {
  xs: 'p-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};
```

**Exemples d'utilisation** :
```tsx
// Action principale
<Button variant="primary" size="md">Enregistrer</Button>

// Action secondaire
<Button variant="secondary" size="md">Annuler</Button>

// Suppression
<Button variant="danger" size="sm" icon={<Trash2 />}>Supprimer</Button>

// Icône seule (tables)
<Button variant="ghost" size="xs" icon={<Edit2 />} />

// Chargement
<Button variant="primary" loading>Chargement...</Button>
```

---

### Phase 4 : Formulaires (2-3 jours) 🟡

**Objectifs** :
- [ ] Créer `components/shared/Input.tsx`
- [ ] Créer `components/shared/Select.tsx`
- [ ] Créer `components/shared/Textarea.tsx`
- [ ] Standardiser focus states
- [ ] Ajouter états error/success

**Composant Input** :
```tsx
// Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

// Classes standardisées
const baseClasses = "w-full px-3 py-2 border rounded-lg transition-all outline-none";
const focusClasses = "focus:ring-2 focus:ring-emerald-500";
const errorClasses = "border-red-500 focus:ring-red-500";
const successClasses = "border-green-500 focus:ring-green-500";

// Utilisation
<Input
  label="Nom du site"
  type="text"
  placeholder="Entrez le nom..."
  error={errors.nom}
  hint="Le nom doit être unique"
/>
```

---

## 📁 Fichiers Prioritaires

### Critique (Phase 1) 🔴

| Fichier | Lignes | Changements | Statut |
|---------|--------|-------------|--------|
| `components/shared/Badge.tsx` | Nouveau | Créer composant unifié | ⏳ À faire |
| `pages/Teams.tsx` | 92-130, 1001-1131 | Remplacer 4 badges + actions | ⏳ À faire |
| `pages/Users.tsx` | Multiple | Remplacer badges inline | ⏳ À faire |
| `pages/Inventory.tsx` | 16-178 | Refactor table modale + badges | ⏳ À faire |

### Important (Phase 2) 🟠

| Fichier | Changements | Statut |
|---------|-------------|--------|
| `components/shared/BaseModal.tsx` | Créer composant base | ⏳ À faire |
| `constants/zIndex.ts` | Créer constants | ⏳ À faire |
| 15+ modales | Migrer vers BaseModal | ⏳ À faire |

### Moyen (Phase 3-4) 🟡

| Fichier | Changements | Statut |
|---------|-------------|--------|
| `components/shared/Button.tsx` | Créer composant | ⏳ À faire |
| `components/shared/Input.tsx` | Créer composant | ⏳ À faire |
| 50+ fichiers | Remplacer boutons | ⏳ À faire |

---

## 📊 Suivi d'Avancement

### Phase 1 : Badges (En cours)
- [x] Audit complet effectué
- [x] Rapport documenté
- [ ] Badge.tsx créé
- [ ] Teams.tsx migré
- [ ] Users.tsx migré
- [ ] Inventory.tsx migré
- [ ] Planning.tsx migré
- [ ] Documentation utilisateur

**Avancement** : 20% (2/10)

### Phase 2 : Modales
- [x] Audit effectué
- [ ] BaseModal.tsx créé
- [ ] Z-index constants définis
- [ ] Migration des modales
- [ ] Tests

**Avancement** : 10% (1/5)

### Phase 3 : Boutons
- [x] Audit effectué
- [ ] Button.tsx créé
- [ ] Migration des boutons
- [ ] Documentation

**Avancement** : 10% (1/4)

### Phase 4 : Formulaires
- [x] Audit effectué
- [ ] Input.tsx créé
- [ ] Select.tsx créé
- [ ] Textarea.tsx créé
- [ ] Migration

**Avancement** : 10% (1/5)

---

## 📝 Notes

### Décisions Prises
1. **23/12/2025** : Header simplifié - Suppression select sites + bouton position
2. **23/12/2025** : Démarrage Phase 1 - Consolidation badges

### Conventions de Code
- **Couleur primaire** : `emerald-600` (plus `green-600`)
- **Border radius modales** : `rounded-xl`
- **Border radius cartes** : `rounded-lg`
- **Focus inputs** : `focus:ring-2 focus:ring-emerald-500 outline-none`
- **Gap modales** : `gap-3`
- **Gap formulaires** : `space-y-4`
- **Gap grilles** : `gap-4`

### Ressources
- Composant StatusBadge existant : `components/StatusBadge.tsx`
- Composant DataTable existant : `components/DataTable.tsx`
- Tailwind config : `tailwind.config.js`

---

**Dernière mise à jour** : 23 décembre 2025
**Prochaine révision** : Fin Phase 1
