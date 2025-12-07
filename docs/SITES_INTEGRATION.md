# Intégration des 12 Sites de Benguerir - Documentation

## 📍 Sites Ajoutés

Les 12 sites suivants ont été intégrés dans l'application GreenSIG :

1. **Phénotypage** - Centre de phénotypage des plantes (Recherche)
2. **Extension Modulaire** - Extension modulaire du campus (Infrastructure)
3. **Tech Park** - Parc technologique et innovation (Infrastructure)
4. **Start Gate** - Incubateur de startups (Infrastructure)
5. **DICE** - Centre de recherche DICE (Recherche)
6. **Villas Chercheurs** - Résidences pour chercheurs (Résidence)
7. **Dome SRO** - Dôme SRO - Structure de recherche (Recherche)
8. **HILTON** - Hôtel Hilton (Hôtellerie)
9. **Hôpital gériatrie** - Hôpital de gériatrie (Santé)
10. **Résidences Locatives** - Résidences locatives (Résidence)
11. **Villas Marguerites** - Villas Marguerites - Résidences (Résidence)
12. **CUB** - Centre Universitaire de Benguerir (Infrastructure)

## 🎨 Catégories et Couleurs

Chaque site est classé par catégorie avec une couleur distinctive :

- **🔬 RECHERCHE** - Violet (#8b5cf6)
- **🏗️ INFRASTRUCTURE** - Bleu (#3b82f6)
- **🏠 RESIDENCE** - Vert (#10b981)
- **🏥 SANTE** - Rouge (#ef4444)
- **🏨 HOTELLERIE** - Orange (#f59e0b)

## 📂 Fichiers Créés/Modifiés

### Nouveaux Fichiers

1. **`data/sites.ts`**
   - Contient la définition de l'interface `Site`
   - Liste complète des 12 sites avec leurs coordonnées
   - Fonctions utilitaires : `getSiteById()` et `getSitesByCategory()`

2. **`components/SitesLegend.tsx`**
   - Composant de légende interactive
   - Affiche les catégories avec compteur
   - Liste complète des sites cliquables
   - Navigation vers chaque site au clic

### Fichiers Modifiés

1. **`components/MapView.tsx`**
   - Import des données des sites
   - Ajout de marqueurs CircleMarker pour chaque site
   - Popups interactifs avec informations détaillées
   - Lien vers Google Maps pour chaque site

2. **`pages/MapPage.tsx`**
   - Import du composant SitesLegend
   - Ajout de l'état `showSitesLegend`
   - Gestionnaire `handleSiteClick()` pour la navigation
   - Panneau de légende des sites avec bouton toggle
   - Positionnement adaptatif selon l'état de la sidebar

## 🗺️ Fonctionnalités Implémentées

### Navigation Interactive ✅ ENTIÈREMENT FONCTIONNELLE

**Manipulation de la carte à la souris** :
- ✅ **Pan (déplacement)** : Cliquer-glisser sur la carte avec le bouton gauche
  - Curseur : Main ouverte (`grab`) au repos
  - Curseur : Main fermée (`grabbing`) pendant le drag
- ✅ **Zoom molette** : Utiliser la molette de la souris pour zoomer/dézoomer
- ✅ **Double-clic** : Double-cliquer pour zoomer rapidement sur une zone
- ✅ **Box Zoom** : Maintenir `Shift` + glisser pour sélectionner une zone à zoomer
- ✅ **Navigation clavier** : Flèches directionnelles, +/- pour zoomer
- ✅ **Boutons de zoom** : Boutons +/- en bas à droite de la carte

**Marqueurs des sites** :
- 12 marqueurs colorés selon la catégorie
- Taille : 10px de rayon avec bordure blanche de 3px
- Opacité : 90% pour un rendu moderne
- **Effet hover** : Agrandissement à 115% au survol
- **Curseur** : Pointeur sur les marqueurs cliquables

**Popups interactifs** :
- Affichage au clic sur un marqueur
- Nom du site en couleur de catégorie
- Description complète
- Badge de catégorie coloré
- Lien vers Google Maps (s'ouvre dans un nouvel onglet)
- Design moderne avec coins arrondis et ombre

**Panneau de légende des sites** :
- Position : **Bas droite**, au-dessus de la légende dynamique
- Toujours visible (pas de toggle)
- Liste complète des 12 sites avec scroll
- Regroupement par catégorie avec compteur
- Navigation au clic vers chaque site (zoom 17)
- Design moderne avec glassmorphism

**Menu déroulant "Aller à un site..."** :
- Position : En haut de la page, dans la barre de recherche
- Affiche les 12 sites avec leur catégorie
- Format : "Nom du site - CATÉGORIE"
- Navigation automatique au clic (zoom 17)
- Affichage du résultat de recherche

### Expérience Utilisateur

1. **Recherche de sites**
   - Les sites peuvent être trouvés via la barre de recherche
   - Recherche par nom, description ou catégorie
   - Navigation automatique vers le site trouvé

2. **Vue d'ensemble**
   - Tous les sites visibles sur la carte par défaut
   - Zoom de 13 sur Benguerir au chargement
   - Zoom de 17 lors de la navigation vers un site

3. **Informations détaillées**
   - Clic sur un marqueur → Popup avec détails
   - Clic sur un site dans la légende → Navigation + résultat de recherche
   - Clic sur un site dans le menu → Navigation + résultat de recherche
   - Lien Google Maps pour itinéraire externe

## 🎯 Coordonnées

Les coordonnées ont été réparties de manière réaliste autour de Benguerir, Maroc :
- Centre : 32.2345°N, -7.9543°W
- Répartition : Rayon d'environ 500m autour du centre
- Zoom par défaut : 13 (vue d'ensemble)
- Zoom sur site : 17 (vue détaillée)

## 🔄 Navigation Fluide

La navigation sur la carte est entièrement fonctionnelle grâce à Leaflet :

- **Drag & Drop** : Maintenez le clic et déplacez la souris
- **Zoom Molette** : Utilisez la molette de la souris
- **Zoom Boutons** : Utilisez les boutons +/- en bas à droite
- **Double-clic** : Zoom rapide sur la zone cliquée
- **Shift + Drag** : Sélection de zone pour zoom

## 📱 Responsive

Le panneau de légende s'adapte automatiquement :
- Position ajustée selon l'état de la sidebar (ouverte/fermée)
- Bouton toggle pour masquer/afficher
- Scroll automatique si la liste est trop longue
- Design moderne avec backdrop blur

## 🚀 Prochaines Étapes Possibles

1. Intégrer les vraies coordonnées depuis les liens Google Maps
2. Ajouter des photos pour chaque site
3. Créer des fiches détaillées pour chaque site
4. Ajouter des filtres par catégorie
5. Implémenter un itinéraire entre sites
6. Ajouter des statistiques par site

## 🎨 Design

- Style moderne avec glassmorphism
- Couleurs cohérentes avec le thème GreenSIG
- Animations fluides (transitions CSS)
- Ombres et bordures subtiles
- Hover effects sur tous les éléments interactifs
