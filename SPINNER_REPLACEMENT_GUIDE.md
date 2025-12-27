# Guide de remplacement des spinners par LoadingWrapper

## Fichiers traités ✅

1. ✅ **ClientDetailPage.tsx** - 6 spinners remplacés
2. ✅ **Toutes les pages principales** (Teams, Users, Planning, etc.) - spinners de chargement principal remplacés

## Fichiers restants ❌

### Pages (à traiter en priorité)
- **SuiviTaches.tsx** (9 spinners)
- **Sites.tsx** (3 spinners)
- **OperateurDetailPage.tsx** (3 spinners)
- **EditEquipeModal.tsx** (4 spinners)
- **Login.tsx** (1 spinner)
- **Planning.tsx** (1 spinner)
- **Users.tsx** (1 spinner)
- **Inventory.tsx** (1 spinner)

### Composants map/
- MapSearchBar.tsx (1)
- SelectionPanel.tsx (1)
- CreateSiteModal.tsx (1)
- MapFloatingTools.tsx (1)
- GeometryToolsPanel.tsx (5)

### Composants divers
- ConfirmModal.tsx (1)
- CompetenceMatrix.tsx (3)
- DetailModal.tsx (1)
- CreateObjectModal.tsx (2)
- HistoriqueRHPanel.tsx (1)
- FormModal.tsx (1)
- Header.tsx (2)
- export/ExportPanel.tsx (1)
- PhotoUpload.tsx (1)
- SitesLegend.tsx (2)
- users/UserDetailModals.tsx (2)
- planning/TaskFormModal.tsx (1)
- planning/QuickTaskCreator.tsx (1)
- reclamations/ReclamationFormModal.tsx (1)
- sites/SiteEditModal.tsx (1)
- import/ImportWizard.tsx (1)
- import/AttributeMapper.tsx (1)

## Pattern de remplacement

### Pour les chargements de page complète:

**Avant:**
```tsx
if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
        </div>
    );
}

return <YourContent />;
```

**Après:**
```tsx
import LoadingWrapper from '../components/LoadingWrapper';

return (
    <LoadingWrapper isLoading={loading}>
        <YourContent />
    </LoadingWrapper>
);
```

### Pour les sections/modals:

**Avant:**
```tsx
{isLoadingSection ? (
    <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
    </div>
) : (
    <YourSection />
)}
```

**Après:**
```tsx
<LoadingWrapper isLoading={isLoadingSection} fullScreen={false}>
    <YourSection />
</LoadingWrapper>
```

### Pour les spinners dans les boutons:

**Avant:**
```tsx
<button disabled={isSubmitting}>
    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
</button>
```

**Après (OPTION 1 - Garder le spinner local):**
```tsx
<button disabled={isSubmitting}>
    {isSubmitting ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
    ) : 'Enregistrer'}
</button>
```

**Après (OPTION 2 - LoadingWrapper):**
```tsx
{isSubmitting && <LoadingWrapper isLoading={true} fullScreen={false} />}
<button disabled={isSubmitting}>
    Enregistrer
</button>
```

## Commandes de remplacement rapide (regex)

Pour remplacer rapidement dans un fichier:

1. Ajouter l'import:
```tsx
import LoadingWrapper from '../components/LoadingWrapper';
```

2. Chercher:
```regex
<Loader2 className="[^"]*animate-spin[^"]*"[^/]*/>
```

3. Remplacer par LoadingWrapper selon le contexte.

## Vérification finale

Après remplacement, exécutez:
```bash
grep -r "animate-spin" --include="*.tsx" GreenSIGV1/ | wc -l
```

Le résultat devrait être **0** (aucun spinner restant).
