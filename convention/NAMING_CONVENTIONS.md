# Conventions de Nommage - GreenSIG Frontend

Ce document répertorie les conventions de nommage et de structure utilisées dans le projet frontend GreenSIGV1.

## 1. Structure des Fichiers et Dossiers

| Type | Convention | Exemple |
|------|------------|---------|
| **Dossiers** | camelCase ou lowercase | `components`, `pages`, `styles`, `utils` |
| **Composants React** | PascalCase | `DataTable.tsx`, `Header.tsx` |
| **Pages** | PascalCase | `Dashboard.tsx`, `Login.tsx` |
| **Fichiers Utilitaires** | camelCase | `store.ts`, `types.ts`, `constants.ts` |
| **Fichiers de Style** | lowercase | `map.css`, `index.css` |

## 2. Conventions de Code (TypeScript/React)

### Composants
*   Utiliser **PascalCase** pour le nom de la fonction du composant.
*   Utiliser l'export nommé (`export function ComponentName`).

```tsx
export function DataTable() { ... }
```

### Interfaces et Types
*   Utiliser **PascalCase**.
*   Ne pas utiliser de préfixe `I` (ex: `User` et non `IUser`).
*   Les types sont centralisés dans `types.ts` ou définis dans le fichier du composant s'ils sont spécifiques.

```tsx
export interface User {
  id: string;
  name: string;
}
```

### Variables et Fonctions
*   Utiliser **camelCase** pour les variables locales, les références (refs) et les fonctions.

```tsx
const [currentPage, setCurrentPage] = useState(1);
const sortedData = ...;
```

### Props
*   Utiliser **camelCase** pour les noms de props.
*   Les interfaces de props doivent être nommées `ComponentNameProps`.

```tsx
export interface DataTableProps<T> {
    itemsPerPage: number;
    onRowClick?: (item: T) => void;
}
```

### Gestionnaires d'Événements (Event Handlers)
*   Préfixer les fonctions de gestion par `handle` (ex: `handleSort`, `handleSubmit`).
*   Préfixer les props d'événements par `on` (ex: `onClick`, `onExport`).

```tsx
const handleSort = (columnKey: string) => { ... };
// Usage en prop
<Button onClick={handleSort} />
```

### Constantes et Enums
*   **Constantes globales** : UPPER_CASE_SNAKE_CASE (ex: `MOCK_KPIS`).
*   **Enums** : PascalCase pour le nom, UPPER_CASE pour les valeurs.

```tsx
export enum MapLayerType {
  PLAN = 'PLAN',
  SATELLITE = 'SATELLITE'
}
```

## 3. Styles (CSS)

*   **Framework** : Tailwind CSS est utilisé principalement (classes utilitaires).
*   **Fichiers CSS** : Pour les styles globaux ou spécifiques non gérés par Tailwind, utiliser des fichiers `.css` dans le dossier `styles/`.

## 4. Bonnes Pratiques

*   **Imports** : Grouper les imports par type (React, bibliothèques tierces, composants locaux, types/utils).
*   **Typage** : Utiliser le typage strict de TypeScript autant que possible. Éviter `any`.
