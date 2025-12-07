# 🌍 Documentation Technique : Cartographie & Intégration Google Maps

Ce document détaille l'architecture cartographique actuelle de **GreenSIG** et fournit un guide pas-à-pas pour intégrer **Google Maps**.

---

## 1. Architecture Actuelle (Leaflet + OpenStreetMap)

### 🛠️ Stack Technique
Actuellement, le projet utilise une architecture **Open Source** standard et robuste :

*   **Moteur de rendu** : [Leaflet](https://leafletjs.com/) (via `react-leaflet`). C'est la librairie qui gère l'affichage de la carte, le zoom, et les interactions.
*   **Fournisseurs de Tuiles (Tile Providers)** : Ce sont les services qui fournissent les images de la carte (les petits carrés de 256x256 pixels).

### 📍 Configuration Actuelle
Les couches sont définies dans `constants.ts`. Nous utilisons un système de **Layers** (Couches) interchangeables :

1.  **PLAN (OpenStreetMap)** :
    *   *Type* : Carte vectorielle standard.
    *   *URL* : `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
    *   *Avantage* : Gratuit, mise à jour communautaire, très détaillé pour les zones urbaines.

2.  **SATELLITE (Esri World Imagery)** :
    *   *Type* : Images satellites.
    *   *URL* : Service ArcGIS d'Esri.
    *   *Avantage* : Très haute résolution, souvent meilleure que Google dans certaines zones rurales, gratuit pour usage non-commercial.

3.  **TERRAIN (OpenTopoMap)** :
    *   *Type* : Carte topographique (relief).
    *   *Avantage* : Idéal pour visualiser les dénivelés.

### 💻 Structure du Code
*   **`types.ts`** : Définit l'enum `MapLayerType` (PLAN, SATELLITE, TERRAIN).
*   **`constants.ts`** : Contient l'objet `MAP_LAYERS` avec les URLs des serveurs de tuiles.
*   **`MapView.tsx`** : Le composant `<TileLayer />` consomme l'URL active pour afficher la carte.

---

## 2. Guide d'Implémentation Google Maps

Il est tout à fait possible d'intégrer Google Maps dans l'architecture actuelle (Leaflet) sans réécrire tout le code. Nous allons utiliser les **Tuiles Google** (Google Tiles).

### ⚠️ Prérequis & Avertissement
*   **Méthode "Directe"** : Utiliser les URLs des serveurs de tuiles Google (`mt1.google.com`). C'est gratuit et fonctionne immédiatement, mais c'est techniquement une "zone grise" par rapport aux conditions d'utilisation de Google pour des applications commerciales à fort trafic.
*   **Méthode "Officielle"** : Utiliser l'API Google Maps JavaScript (payante au-delà d'un quota) avec une clé API.

*Nous allons documenter ici la **Méthode Directe** car elle s'intègre parfaitement à votre code actuel.*

### 📝 Étapes d'Implémentation

#### Étape 1 : Mettre à jour les Types
Ouvrez `d:\GREENSIG\GreenSIGV1\types.ts` et ajoutez `GOOGLE` à l'enum.

```typescript
export enum MapLayerType {
  PLAN = 'PLAN',
  SATELLITE = 'SATELLITE',
  TERRAIN = 'TERRAIN',
  GOOGLE_HYBRID = 'GOOGLE_HYBRID' // <--- Ajout
}
```

#### Étape 2 : Ajouter la Configuration Google
Ouvrez `d:\GREENSIG\GreenSIGV1\constants.ts` et ajoutez la configuration de la couche Google.

Voici les URLs magiques de Google Maps :
*   **Plan (Roadmap)** : `http://mt0.google.com/vt/lyrs=m&hl=fr&x={x}&y={y}&z={z}`
*   **Satellite (Seul)** : `http://mt0.google.com/vt/lyrs=s&hl=fr&x={x}&y={y}&z={z}`
*   **Hybride (Satellite + Noms)** : `http://mt0.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}`

**Code à ajouter dans `MAP_LAYERS` :**

```typescript
  [MapLayerType.GOOGLE_HYBRID]: {
    id: MapLayerType.GOOGLE_HYBRID,
    name: "Google Maps (Hybride)",
    url: "http://mt0.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}",
    attribution: '&copy; Google Maps'
  }
```

#### Étape 3 : Mettre à jour l'Interface (Optionnel)
Dans `pages/MapPage.tsx`, si vous utilisez une boucle pour générer les boutons de couches (ce qui est le cas actuellement), le nouveau bouton "Google Maps" apparaîtra automatiquement !

### 🎨 Comparaison des URLs Google
Vous pouvez choisir le style qui vous convient en changeant le paramètre `lyrs=` dans l'URL :

| Type | Paramètre URL | Description |
|------|---------------|-------------|
| **Standard** | `lyrs=m` | La carte Google Maps classique |
| **Satellite** | `lyrs=s` | Images satellites pures (sans routes ni noms) |
| **Hybride** | `lyrs=y` | Satellite + Routes + Noms des villes (Recommandé) |
| **Terrain** | `lyrs=p` | Carte avec relief et terrain |

---

## 3. Résumé pour le Développeur

Pour passer à Google Maps dans ce projet, vous n'avez **PAS** besoin de changer de librairie (pas besoin d'installer `@react-google-maps/api`).

Il suffit de :
1.  Considérer Google Maps comme un simple **fournisseur d'images** (comme OpenStreetMap).
2.  Ajouter l'URL des tuiles Google dans `constants.ts`.
3.  Leaflet s'occupe du reste.

C'est la force de l'architecture modulaire mise en place dans **GreenSIG**.
