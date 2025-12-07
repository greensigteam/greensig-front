# 👥 Informations de l'Équipe GreenSIG

## 📧 Contact

**Email principal de l'équipe** : greensig7@gmail.com

---

## 👨‍💻 Équipe de Développement

L'équipe GreenSIG est composée d'**un Docteur en IA et de trois Ingénieurs en IA et Big Data** :

| Membre | Email | Spécialité |
|--------|-------|------------|
| **Dr. Sohaib Baroud** | sohaib.baroud@eigsica.ma | Docteur en IA |
| **Teurtysoyono** | teurtysoyono@gmail.com | Ingénieur IA & BD |
| **Aldrin Bruno Djourobi** | aldrinbrunodjourobi@gmail.com | Ingénieur IA & BD |
| **Jesse Mpiga** | mpigajesse23@gmail.com | Ingénieur IA & BD |

### Contact Collectif
- 📧 **Email de l'équipe** : greensig7@gmail.com
- 🎓 **Composition** : 1 Docteur en IA + 3 Ingénieurs en IA & Big Data
- 🏢 **Institution** : EIGSICA

---

## 🏢 À propos du Projet

**GreenSIG** est une solution complète de gestion des espaces verts assistée par un Système d'Information Géographique (SIG).

### Objectifs
- Faciliter la gestion des interventions sur les espaces verts
- Optimiser la planification des équipes
- Améliorer le suivi des réclamations
- Fournir une vue cartographique interactive
- Générer des rapports détaillés

---

## 🛠️ Stack Technique

### Frontend
- **Framework** : React 19 + TypeScript
- **Build Tool** : Vite
- **Cartographie** : Leaflet / React-Leaflet
- **UI** : Lucide React Icons
- **Routing** : Leaflet Routing Machine

### Backend (En développement)
- **Framework** : Django 5.0+
- **API** : Django REST Framework
- **Base de données** : PostgreSQL 15+ (avec PostGIS)
- **Authentification** : JWT (Simple JWT)
- **Cache** : Redis
- **Tâches asynchrones** : Celery

---

## 📂 Structure du Projet

```
GreenSIG/
├── GreenSIGV1/              # Frontend React + TypeScript
│   ├── components/          # Composants réutilisables
│   ├── pages/              # Pages de l'application
│   ├── data/               # Données statiques
│   ├── docs/               # Documentation
│   └── services/           # Services API
│
└── backend/                # Backend Django (à créer)
    ├── apps/               # Applications Django
    ├── greensig/          # Configuration Django
    └── requirements/      # Dépendances Python
```

---

## 📋 Modules de l'Application

1. **Dashboard** - Tableau de bord avec KPIs
2. **Map** - Cartographie interactive (Leaflet)
3. **Inventory** - Gestion du matériel, végétation, hydrologie
4. **Planning** - Planification des tâches
5. **Interventions** - Suivi des interventions
6. **Teams** - Gestion des équipes
7. **Claims** - Système de réclamations
8. **Client Portal** - Interface client
9. **Reporting** - Génération de rapports

---

## 🚀 Démarrage Rapide

### Frontend

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement
npm run dev

# Build de production
npm run build
```

### Backend (À venir)

```bash
# Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Installer les dépendances
pip install -r requirements/development.txt

# Lancer le serveur
python manage.py runserver
```

---

## 📚 Documentation

### Frontend
- `README.md` - Documentation principale
- `docs/DOCUMENTATION_CARTOGRAPHIE.md` - Documentation cartographie
- `docs/SITES_INTEGRATION.md` - Intégration des sites
- `convention/` - Conventions de code

### Backend
- `docs/API_ENDPOINTS.md` - Documentation des endpoints API
- `docs/BACKEND_ARCHITECTURE.md` - Architecture backend
- `docs/BACKEND_FOLDER_STRUCTURE.md` - Structure des dossiers
- `docs/BACKEND_README.md` - Guide de démarrage backend
- `docs/.env.backend.example` - Template de configuration

---

## 🤝 Contribution

### Workflow Git

1. Créer une branche depuis `main`
   ```bash
   git checkout -b feature/nom-de-la-feature
   ```

2. Développer la fonctionnalité

3. Commiter les changements
   ```bash
   git add .
   git commit -m "Description de la feature"
   ```

4. Pousser la branche
   ```bash
   git push origin feature/nom-de-la-feature
   ```

5. Créer une Pull Request

### Standards de Code

#### Frontend
- Utiliser TypeScript pour le typage
- Suivre les conventions de nommage (voir `convention/`)
- Commenter le code complexe
- Tester les fonctionnalités

#### Backend
- Suivre les conventions Django/Python (PEP 8)
- Écrire des tests unitaires
- Documenter les endpoints API
- Valider les données entrantes

---

## 📞 Support & Contact

### Questions Techniques
📧 **Email** : greensig7@gmail.com

### Documentation
📖 Consulter les fichiers dans le dossier `docs/`

### Issues
🐛 Créer une issue sur le repository Git

---

## 📄 Licence

Tous droits réservés - GreenSIG © 2025

---

## 🎯 Roadmap

### Phase 1 : Frontend ✅
- [x] Interface utilisateur React
- [x] Cartographie Leaflet
- [x] Gestion des modules
- [x] Documentation frontend

### Phase 2 : Backend (En cours)
- [ ] Mise en place Django
- [ ] Création des modèles
- [ ] Implémentation des endpoints API
- [ ] Authentification JWT
- [ ] Tests unitaires

### Phase 3 : Intégration
- [ ] Connexion Frontend-Backend
- [ ] Gestion des fichiers uploadés
- [ ] Notifications en temps réel
- [ ] Rapports PDF/Excel

### Phase 4 : Déploiement
- [ ] Configuration serveur
- [ ] Base de données PostgreSQL
- [ ] Redis pour le cache
- [ ] Monitoring et logs

---

**Dernière mise à jour** : 2025-12-05  
**Version** : 1.0  
**Équipe** : GreenSIG Development Team  
**Contact** : greensig7@gmail.com
