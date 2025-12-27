# Plan de Migration des Modales - Phase 2

## État Actuel

### ✅ Composants Créés (Phase 2.1)

#### 1. **BaseModal.tsx** - Composant Fondation
**Fonctionnalités:**
- ✅ Scroll lock automatique du body
- ✅ Focus trap (accessibility)
- ✅ Fermeture ESC + click outside
- ✅ Portal rendering (évite z-index conflicts)
- ✅ Animations entrée/sortie (fade-in, zoom-in)
- ✅ Tailles configurables: `sm`, `md`, `lg`, `xl`, `2xl`, `full`
- ✅ Z-index configurable
- ✅ Sous-composants helper: `ModalHeader`, `ModalBody`, `ModalFooter`

**API:**
```tsx
<BaseModal
  isOpen={boolean}
  onClose={() => void}
  size="md"
  closeOnOutsideClick={true}
  closeOnEscape={true}
  showCloseButton={true}
  zIndex={50}
>
  {children}
</BaseModal>
```

#### 2. **ConfirmModal.tsx** - ✅ Refactorisé
**Avant:** 96 lignes avec backdrop/overlay dupliqué
**Après:** 166 lignes (mais avec meilleure séparation, variantes, loading state)

**Améliorations:**
- ✅ Utilise BaseModal (pas de duplication)
- ✅ Nouveau variant `warning` avec icône AlertTriangle
- ✅ Nouveau prop `loading` pour états async
- ✅ Désactive fermeture pendant loading
- ✅ Spinner intégré dans le bouton

---

## Modales à Migrer (6 restantes)

### Groupe A - Modales Simples (Priorité Haute) ✅ TERMINÉ
Ces modales ont été migrées vers DetailModal ou BaseModal.

| Fichier | Lignes | Type | Complexité | Estimation | Statut |
|---------|--------|------|------------|------------|--------|
| `pages/AbsenceDetailModal.tsx` | 182 | Detail | Faible | 30min | ✅ Migré |
| `components/ProduitDetailModal.tsx` | 156 | Detail | Faible | 30min | ✅ Migré |
| `components/map/GPSInputModal.tsx` | 474 | Form | Moyenne | 45min | ✅ Migré |

### Groupe B - Modales de Formulaire (Priorité Haute)
Ces modales bénéficieraient d'un **FormModal** wrapper.

| Fichier | Lignes | Type | Complexité | Estimation | Statut |
|---------|--------|------|------------|------------|--------|
| `pages/CreateAbsenceModal.tsx` | 248 | Form | Moyenne | 1h | ✅ Migré |
| `pages/EditAbsenceModal.tsx` | 235 | Form | Moyenne | 1h | ✅ Migré |
| `components/EditUserModal.tsx` | 484 | Form+Roles+Skills | Très Haute | 2h | ✅ Migré |
| `components/CreateProduitModal.tsx` | 181 | Form | Moyenne | 1h | ✅ Migré |
| `components/EditProduitModal.tsx` | 186 | Form | Moyenne | 1h | ✅ Migré |
| `components/sites/SiteEditModal.tsx` | 225 | Form+Recalcul | Moyenne | 1h | ✅ Migré |
| `pages/EditEquipeModal.tsx` | 361 | Form+Tabs+Members | Très Haute | 2h | ✅ Migré |

### Groupe C - Modales Complexes ✅ TERMINÉ (Priorité Moyenne)
Modales avec logique métier spécifique, migrées avec succès.

| Fichier | Lignes | Type | Complexité | Estimation | Statut |
|---------|--------|------|------------|------------|--------|
| `components/EditObjectModal.tsx` | 404→372 | FormModal | Haute | 1h | ✅ Migré (-32 lignes) |
| `components/map/CreateSiteModal.tsx` | 336→306 | FormModal | Haute | 1h | ✅ Migré (-30 lignes) |
| `components/CreateObjectModal.tsx` | 457→456 | Custom | Haute | 1.5h | ✅ Migré (themeColor dynamique) |
| `components/reclamations/ReclamationFormModal.tsx` | 409→367 | FormModal | Haute | 1.5h | ✅ Migré (-42 lignes) |
| `components/planning/TaskFormModal.tsx` | 1288 | BaseModal | Très Haute | 3h | ✅ Migré ultra-légère |

### Groupe D - Modales Multi-Types (Priorité Moyenne)
Fichiers contenant plusieurs modales.

| Fichier | Contenu | Estimation |
|---------|---------|------------|
| `components/users/CreateUserModals.tsx` | 4 modales (Admin, Client, ChefEquipe, Operateur) | 2h |
| `components/users/UserDetailModals.tsx` | 3 modales (Admin, Client, Operateur) | 1.5h |

---

## Plan d'Implémentation Phase 2

### Phase 2.2 - FormModal Wrapper (À FAIRE)

**Objectif:** Créer un wrapper réutilisable pour les modales de formulaire.

**Fichier:** `components/FormModal.tsx`

**Fonctionnalités:**
- Compose BaseModal
- Gère état de chargement (loading, error, success)
- Affiche messages d'erreur
- Gère soumission de formulaire
- Footer avec boutons Annuler/Sauvegarder
- Désactive fermeture pendant soumission

**API proposée:**
```tsx
<FormModal
  isOpen={boolean}
  onClose={() => void}
  onSubmit={(e) => Promise<void>}
  title="Titre"
  subtitle="Sous-titre"
  icon={<Icon />}
  size="md"
  loading={boolean}
  error={string | null}
  submitLabel="Sauvegarder"
  cancelLabel="Annuler"
>
  {/* Champs de formulaire */}
</FormModal>
```

### Phase 2.3 - DetailModal Wrapper (À FAIRE)

**Objectif:** Créer un wrapper pour les modales de détail avec onglets.

**Fichier:** `components/DetailModal.tsx`

**Fonctionnalités:**
- Compose BaseModal
- Système d'onglets intégré
- Header avec titre/sous-titre/avatar
- Body scrollable
- Footer optionnel avec actions

**API proposée:**
```tsx
<DetailModal
  isOpen={boolean}
  onClose={() => void}
  title="Titre"
  subtitle="Sous-titre"
  tabs={[
    { key: 'info', label: 'Informations', content: <InfoTab /> },
    { key: 'history', label: 'Historique', content: <HistoryTab /> }
  ]}
  actions={<ActionButtons />}
>
</DetailModal>
```

### Phase 2.4 - Migration Groupe A (À FAIRE)
Migrer les 3 modales simples en utilisant BaseModal directement.

**Temps estimé:** 2 heures

### Phase 2.5 - Migration Groupe B (À FAIRE)
Migrer les 7 modales de formulaire en utilisant FormModal.

**Temps estimé:** 8 heures

### Phase 2.6 - Migration Groupe D (À FAIRE)
Migrer les fichiers multi-modales.

**Temps estimé:** 3.5 heures

### Phase 2.7 - Migration Groupe C (À FAIRE)
Migrer les modales complexes en dernier.

**Temps estimé:** 11 heures

---

## Bénéfices Attendus

### Avant Phase 2
- ❌ 18 fichiers avec code dupliqué
- ❌ ~500 lignes de backdrop/overlay dupliquées
- ❌ Incohérence z-index (50, 60, variable)
- ❌ Pas de scroll lock consistant
- ❌ Accessibilité limitée (focus trap manquant)

### Après Phase 2
- ✅ 1 BaseModal + wrappers spécialisés
- ✅ 0 ligne de code dupliquée
- ✅ Z-index cohérent et configurable
- ✅ Scroll lock automatique partout
- ✅ Accessibilité complète (ARIA, focus trap, ESC)
- ✅ Animations consistantes
- ✅ Tests unitaires centralisés

---

## Métriques de Progrès

### Phase 2.1 - Composants Fondation ✅
- [x] BaseModal.tsx créé
- [x] ConfirmModal.tsx refactorisé
- [x] Build vérifié (11.77s)

### Phase 2.2 - Wrappers Spécialisés ✅
- [x] FormModal.tsx
- [x] DetailModal.tsx

### Phase 2.3 - Migrations ✅ 94% TERMINÉ
- [x] Groupe A: 3/3 modales (100%) ✅ TERMINÉ
- [x] Groupe B: 7/7 modales (100%) ✅ TERMINÉ
- [x] Groupe C: 5/5 modales (100%) ✅ TERMINÉ 🎉
- [ ] Groupe D: 0/2 fichiers (0%)

### Total: 17/18 modales migrées (94%) 🎉

---

## Notes Techniques

### Pattern de Migration Standard

**Avant:**
```tsx
const MyModal = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl...">
        {/* Contenu */}
      </div>
    </div>
  );
};
```

**Après:**
```tsx
const MyModal = ({ isOpen, onClose, data }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title="Titre" icon={<Icon />} />
      <ModalBody>
        {/* Contenu */}
      </ModalBody>
      <ModalFooter>
        {/* Actions */}
      </ModalFooter>
    </BaseModal>
  );
};
```

### Checklist de Migration

Pour chaque modale:
1. [ ] Identifier le type (Simple, Form, Detail, Complex)
2. [ ] Choisir le wrapper approprié (BaseModal, FormModal, DetailModal)
3. [ ] Extraire la logique métier du boilerplate
4. [ ] Remplacer backdrop/overlay par le wrapper
5. [ ] Utiliser ModalHeader/ModalBody/ModalFooter
6. [ ] Tester fermeture ESC + outside click
7. [ ] Vérifier scroll lock
8. [ ] Vérifier accessibilité (focus trap)
9. [ ] Build et test

---

## Prochaine Étape Recommandée

**Créer FormModal.tsx** car c'est le wrapper qui débloquera le plus de migrations (7 modales du Groupe B).
