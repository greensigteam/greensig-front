# Gestion d'état — Corrections et bonnes pratiques

Ce document décrit les problèmes de gestion d'état identifiés dans GreenSIG et les solutions appliquées, basées sur l'état de l'art React (2025).

---

## Problèmes identifiés

### 1. Perte d'état lors de la navigation

**Symptôme** : En quittant une page puis y revenant, tous les filtres, la pagination et les données chargées sont réinitialisés.

**Cause** : Les routes sont chargées en _lazy loading_ (`React.lazy`). Quand l'utilisateur navigue, le composant est **démonté** — tout son `useState` local est détruit. Au retour, il repart de zéro.

### 2. Perte des exports/générations en cours

**Symptôme** : Lancer un rapport PDF, naviguer vers une autre page, revenir — la génération a "disparu". Les boutons sont débloqués alors que le job tourne encore.

**Cause** : L'état `const [generating, setGenerating] = useState(false)` vivait _dans_ le composant. Dès que la page était quittée, le composant se démontait, l'état `generating = true` disparaissait, et à moins de revenir exactement au bon moment, l'UI ne reflétait plus rien.

### 3. Requêtes API répétées

**Symptôme** : Chaque visite d'une page déclenche un appel réseau, même si les données n'ont pas changé depuis 30 secondes.

**Cause** : Le pattern classique `useEffect(() => { fetch(...).then(setData) }, [])` ne mémorise rien. Le `useEffect` se ré-exécute à chaque montage.

### 4. Position de défilement non restaurée

**Symptôme** : Après navigation retour/avant, la liste recommence en haut au lieu de reprendre là où l'utilisateur s'était arrêté.

**Cause** : React Router ne gère pas le scroll automatiquement sans configuration explicite.

---

## Solutions appliquées

### Solution 1 — Filtres et pagination dans l'URL (`useSearchParams`)

**Fichiers concernés** : `Sites.tsx`, `Notifications.tsx`, `SiteDetailPage.tsx`

**Avant** :

```tsx
const [statusFilter, setStatusFilter] = useState('active');
const [currentPage, setCurrentPage] = useState(1);
```

**Après** :

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const statusFilter = searchParams.get('status') ?? 'active';
const currentPage = Number(searchParams.get('page') ?? '1');
```

**Pourquoi l'URL ?**

- Survit à la navigation : le composant se remonte avec les params déjà présents.
- Partageable : copier l'URL restaure exactement le même état de filtre.
- Compatible boutons Précédent/Suivant du navigateur.
- Aucune synchronisation manuelle (pas de `useEffect` de sync).

**Helper** (pattern utilisé dans Notifications.tsx) :

```tsx
const setFilter = (key: string, value: string) => {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    if (value) next.set(key, value);
    else next.delete(key);
    return next;
  });
};
```

### Solution 2 — État éphémère non-URL dans `sessionStorage`

**Fichiers concernés** : `Interventions.tsx`

Quand l'état ne mérite pas d'être dans l'URL (non partageable, purement navigation locale), `sessionStorage` offre une persistance légère qui survit aux démontages.

```tsx
const [filter, setFilter] = useState<'today' | 'week' | 'all'>(
  () => (sessionStorage.getItem('interventions_filter') as 'today' | 'week' | 'all') || 'today',
);

const handleSetFilter = (value: 'today' | 'week' | 'all') => {
  setFilter(value);
  sessionStorage.setItem('interventions_filter', value);
};
```

L'initialisation lazy (`useState(() => ...)`) lit `sessionStorage` une seule fois au montage.

### Solution 3 — Cache serveur avec TanStack Query (`useQuery`)

**Fichiers concernés** : `Sites.tsx`, `SiteDetailPage.tsx`, `ReclamationDetailPage.tsx`, `StructureDetailPage.tsx`

**Avant** :

```tsx
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  setIsLoading(true);
  fetchData()
    .then(setData)
    .finally(() => setIsLoading(false));
}, [id]);
```

**Après** :

```tsx
const { data, isLoading, error, refetch } = useQuery({
  queryKey: queryKeys.sites.detail(id),
  queryFn: () => fetchSiteById(id),
  staleTime: 2 * 60 * 1000, // 2 minutes
});
```

**Avantages clés** :

| Comportement                | useEffect           | useQuery            |
| --------------------------- | ------------------- | ------------------- |
| Re-fetch au remontage       | Toujours            | Seulement si stale  |
| Cache partagé entre pages   | Non                 | Oui                 |
| Gestion loading/error       | Manuelle            | Automatique         |
| Invalidation après mutation | Manuelle (setState) | `invalidateQueries` |

**`staleTime` recommandés** :

- Données utilisateur/session : `5 * 60 * 1000` (5 min)
- Données métier fréquemment modifiées : `2 * 60 * 1000` (2 min)
- Référentiels (types, enums) : `10 * 60 * 1000` (10 min)

**Invalidation après mutation** :

```tsx
const queryClient = useQueryClient();

const handleDelete = async (id: number) => {
  await deleteSite(id);
  // Invalide le cache → prochain accès re-fetche
  queryClient.invalidateQueries({ queryKey: queryKeys.sites.list() });
};
```

**Mise à jour optimiste après mutation** (sans re-fetch réseau) :

```tsx
const updatedRec = await cloturerReclamation(reclamation.id);
queryClient.setQueryData(['reclamation', id], updatedRec);
// L'API nous renvoie directement l'objet mis à jour → pas besoin de refetch
```

### Solution 4 — Export/génération global (`ExportContext`)

**Fichiers concernés** : `contexts/ExportContext.tsx`, `MonthlyReport.tsx`, `WeeklyReport.tsx`, `MapPage.tsx`, `Planning.tsx`, `Reclamations.tsx`, `Layout.tsx`

**Problème** : Un état `useState` dans un composant meurt quand le composant se démonte.

**Solution** : Déplacer l'état des exports dans un **Context global** qui vit au niveau racine de l'application — donc jamais démonté.

```tsx
// contexts/ExportContext.tsx
export function ExportProvider({ children }) {
  const [activeJobs, setActiveJobs] = useState<ExportJob[]>([]);

  const startExport = (id: string, label: string) =>
    setActiveJobs((prev) => [...prev, { id, label, startedAt: Date.now() }]);

  const endExport = (id: string) => setActiveJobs((prev) => prev.filter((j) => j.id !== id));

  // Bloque la navigation si un export est en cours
  const blocker = useBlocker(activeJobs.length > 0);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('Un export est en cours. Quitter quand même ?')) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker.state]);

  return (
    <ExportContext.Provider
      value={{ startExport, endExport, isExportRunning, hasActiveJobs, activeJobs }}
    >
      {children}
    </ExportContext.Provider>
  );
}
```

**Usage dans une page** :

```tsx
const { startExport, endExport, isExportRunning } = useExport();
const generating = isExportRunning('monthly-pdf');

const handleDownloadPDF = async () => {
  startExport('monthly-pdf', 'Rapport mensuel PDF');
  try {
    await generatePDF(...);
  } finally {
    endExport('monthly-pdf');
  }
};
```

**Bannière persistante dans Layout** : Tant qu'un job est actif, un bandeau s'affiche en bas à droite, même si l'utilisateur a navigué vers une autre page.

**`useBlocker`** (React Router v7) : Intercepte toute tentative de navigation pendant qu'un export est en cours et demande confirmation. Évite les exports silencieusement abandonnés.

### Solution 5 — Restauration du scroll (`ScrollRestoration`)

**Fichier concerné** : `Layout.tsx`

```tsx
import { ScrollRestoration } from 'react-router-dom';

export function Layout() {
  return (
    <div>
      <ScrollRestoration />
      {/* ... reste du layout */}
    </div>
  );
}
```

React Router sauvegarde la position de défilement de chaque route et la restaure automatiquement lors de la navigation retour/avant. Aucune configuration supplémentaire.

---

## Architecture des query keys (`lib/queryKeys.ts`)

Centraliser les query keys évite les typos et garantit que `invalidateQueries` cible exactement le bon cache :

```tsx
export const queryKeys = {
  user: {
    current: ['user', 'me'] as const,
  },
  sites: {
    all: ['sites'] as const,
    list: () => ['sites', 'list'] as const,
    detail: (id: number | string) => ['sites', 'detail', String(id)] as const,
    statistics: (id: number | string) => ['sites', 'statistics', String(id)] as const,
  },
  // ... autres namespaces
};
```

**Hiérarchie** : `invalidateQueries({ queryKey: ['sites'] })` invalide _tout_ ce qui commence par `['sites']` — list, details, statistics. Être plus précis n'invalide que le niveau ciblé.

---

## Règles à suivre pour les nouvelles pages

### Données serveur

```tsx
// ✅ Toujours useQuery pour les données API
const { data, isLoading } = useQuery({
  queryKey: queryKeys.maRessource.list(),
  queryFn: fetchMaRessource,
  staleTime: 2 * 60 * 1000,
});

// ❌ Jamais ce pattern pour des données API
const [data, setData] = useState(null);
useEffect(() => {
  fetchData().then(setData);
}, []);
```

### Filtres / pagination

```tsx
// ✅ URL si l'état est visible/partageable
const [searchParams, setSearchParams] = useSearchParams();
const filter = searchParams.get('filter') ?? 'all';

// ✅ sessionStorage si éphémère, non-partageable
const [tab, setTab] = useState(() => sessionStorage.getItem('myPage_tab') ?? 'info');

// ❌ useState pur pour des filtres qu'on veut conserver
const [filter, setFilter] = useState('all'); // perdu au démontage
```

### Exports / opérations longues

```tsx
// ✅ ExportContext pour tout ce qui peut durer pendant une navigation
const { startExport, endExport } = useExport();
startExport('mon-export', 'Export en cours...');
try {
  await doExport();
} finally {
  endExport('mon-export');
}

// ❌ useState local pour un état d'export
const [isExporting, setIsExporting] = useState(false); // mourait au démontage
```

### Mutations

```tsx
// ✅ Invalider le cache après une mutation
await createItem(data);
queryClient.invalidateQueries({ queryKey: queryKeys.items.list() });

// ✅ Mise à jour locale si l'API renvoie l'objet mis à jour
const updated = await updateItem(id, data);
queryClient.setQueryData(queryKeys.items.detail(id), updated);
```

---

## Résumé des fichiers modifiés

| Fichier                           | Changements                                                       |
| --------------------------------- | ----------------------------------------------------------------- |
| `contexts/ExportContext.tsx`      | Nouveau — tracker global des exports actifs + `useBlocker`        |
| `lib/queryKeys.ts`                | Ajout namespaces `sites`, `utilisateurs`, `clients`, `structures` |
| `App.tsx`                         | Ajout `<ExportProvider>` autour des routes                        |
| `components/Layout.tsx`           | Ajout `<ScrollRestoration>` + bannière export active              |
| `pages/Sites.tsx`                 | `useState+useEffect` → `useQuery`; filtres → `useSearchParams`    |
| `pages/SiteDetailPage.tsx`        | Idem + onglets actifs → `useSearchParams`                         |
| `pages/ReclamationDetailPage.tsx` | 6 `useState` → `useQuery`; mutations → `setQueryData`             |
| `pages/StructureDetailPage.tsx`   | Données structure → `useQuery`                                    |
| `pages/MonthlyReport.tsx`         | `setGenerating` → `startExport/endExport`                         |
| `pages/WeeklyReport.tsx`          | Idem                                                              |
| `pages/MapPage.tsx`               | `setIsExporting` → `startExport/endExport`                        |
| `pages/Planning.tsx`              | Idem (polling loop — 5 occurrences de `endExport`)                |
| `pages/Reclamations.tsx`          | `setExporting` → `startExport/endExport`                          |
| `pages/Notifications.tsx`         | 5 filtres locaux → `useSearchParams` complet                      |
| `pages/Interventions.tsx`         | Filtre actif → `sessionStorage`                                   |
