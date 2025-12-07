# 📡 Documentation des Endpoints API - GreenSIG

Cette documentation détaille tous les endpoints nécessaires pour l'intégration backend Django, organisés par module.

---

## 🔐 Module d'Authentification

### **POST** `/api/auth/login`
**Description** : Authentification utilisateur  
**Body** :
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response 200** :
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "name": "mpigajesse",
    "email": "mpigajesse23@gmail.com",
    "role": "ADMIN|OPERATOR|CLIENT",
    "avatar": "url_to_avatar"
  }
}
```
**Errors** : `401 Unauthorized`, `400 Bad Request`

---

### **POST** `/api/auth/logout`
**Description** : Déconnexion utilisateur  
**Headers** : `Authorization: Bearer {token}`  
**Response 200** :
```json
{
  "message": "Logout successful"
}
```

---

### **GET** `/api/auth/me`
**Description** : Récupérer les informations de l'utilisateur connecté  
**Headers** : `Authorization: Bearer {token}`  
**Response 200** :
```json
{
  "id": "uuid",
  "name": "aldrinbrunodjourobi",
  "email": "aldrinbrunodjourobi@gmail.com",
  "role": "ADMIN",
  "avatar": "url_to_avatar"
}
```



---

### **POST** `/api/auth/refresh`
**Description** : Rafraîchir le token JWT  
**Body** :
```json
{
  "refresh_token": "refresh_token_here"
}
```
**Response 200** :
```json
{
  "token": "new_jwt_token",
  "refresh_token": "new_refresh_token"
}
```

---

## 📊 Module Dashboard

### **GET** `/api/dashboard/kpis`
**Description** : Récupérer les KPIs du tableau de bord  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** :
- `period` : `day|week|month|year` (optionnel, défaut: `month`)

**Response 200** :
```json
{
  "kpis": [
    {
      "label": "Interventions actives",
      "value": 12,
      "change": 5,
      "trend": "up|down|neutral"
    },
    {
      "label": "Réclamations ouvertes",
      "value": 3,
      "change": -2,
      "trend": "down"
    },
    {
      "label": "Taux de disponibilité",
      "value": "94%",
      "change": 1.2,
      "trend": "up"
    },
    {
      "label": "Rentabilité Site A",
      "value": "+12%",
      "change": 0,
      "trend": "neutral"
    }
  ]
}
```

---

### **GET** `/api/dashboard/recent-activity`
**Description** : Récupérer l'activité récente (tâches + réclamations)  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** :
- `limit` : nombre d'éléments (défaut: 10)

**Response 200** :
```json
{
  "tasks": [...],
  "claims": [...]
}
```

---

## 📦 Module Inventaire

### **GET** `/api/inventory/items`
**Description** : Liste tous les items d'inventaire  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** :
- `category` : `Matériel|Végétation|Hydrologie` (optionnel)
- `status` : `DISPONIBLE|EN_MAINTENANCE|HORS_SERVICE` (optionnel)
- `search` : recherche textuelle (optionnel)
- `page` : numéro de page (défaut: 1)
- `limit` : items par page (défaut: 20)

**Response 200** :
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Tondeuse Autoportée John Deere",
      "category": "Matériel",
      "subcategory": "Machinerie",
      "status": "DISPONIBLE",
      "location": "Entrepôt A",
      "lastService": "2023-10-15",
      "nextService": "2024-04-15",
      "serialNumber": "JD-8842-X",
      "description": "Tondeuse professionnelle pour grandes surfaces.",
      "purchaseDate": "2020-01-15",
      "purchasePrice": 15000.00,
      "supplier": "John Deere France"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 8,
    "limit": 20
  }
}
```

---

### **GET** `/api/inventory/items/{id}`
**Description** : Détails d'un item spécifique  
**Headers** : `Authorization: Bearer {token}`  
**Response 200** :
```json
{
  "id": "uuid",
  "name": "Tondeuse Autoportée John Deere",
  "category": "Matériel",
  "subcategory": "Machinerie",
  "status": "DISPONIBLE",
  "location": "Entrepôt A",
  "lastService": "2023-10-15",
  "nextService": "2024-04-15",
  "serialNumber": "JD-8842-X",
  "description": "Tondeuse professionnelle",
  "maintenanceHistory": [
    {
      "date": "2023-10-15",
      "type": "Révision complète",
      "cost": 450.00,
      "technician": "Marc V."
    }
  ]
}
```

---

### **POST** `/api/inventory/items`
**Description** : Créer un nouvel item d'inventaire  
**Headers** : `Authorization: Bearer {token}`  
**Body** :
```json
{
  "name": "Débroussailleuse Stihl",
  "category": "Matériel",
  "subcategory": "Outillage",
  "status": "DISPONIBLE",
  "location": "Entrepôt B",
  "serialNumber": "ST-001-X",
  "description": "Débroussailleuse thermique",
  "purchaseDate": "2024-01-10",
  "purchasePrice": 450.00,
  "supplier": "Stihl France"
}
```
**Response 201** :
```json
{
  "id": "uuid",
  "name": "Débroussailleuse Stihl",
  "category": "Matériel",
  ...
}
```

---

### **PUT** `/api/inventory/items/{id}`
**Description** : Mettre à jour un item  
**Headers** : `Authorization: Bearer {token}`  
**Body** : Mêmes champs que POST (tous optionnels)  
**Response 200** : Item mis à jour

---

### **DELETE** `/api/inventory/items/{id}`
**Description** : Supprimer un item  
**Headers** : `Authorization: Bearer {token}`  
**Response 204** : No Content

---

### **GET** `/api/inventory/vegetation`
**Description** : Liste des éléments de végétation  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `type`, `family`, `search`, `page`, `limit`

**Response 200** :
```json
{
  "items": [
    {
      "id": "uuid",
      "category": "Végétation",
      "displayFormat": "Point",
      "speciesName": "Phoenix dactylifera",
      "family": "Arecaceae",
      "description": "Palmier dattier",
      "size": "5-8m",
      "symbol": "🌴",
      "observations": "Résistant à la sécheresse"
    }
  ],
  "pagination": {...}
}
```

---

### **GET** `/api/inventory/hydrology`
**Description** : Liste des équipements d'hydrologie  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `type`, `search`, `page`, `limit`

**Response 200** :
```json
{
  "items": [
    {
      "id": "uuid",
      "category": "Hydrologie",
      "displayFormat": "Point",
      "equipmentName": "Puit P-001",
      "family": "Captage",
      "description": "Puit principal zone A",
      "depth": "45m",
      "diameter": "800mm",
      "symbol": "💧",
      "observations": "Débit: 15m³/h"
    }
  ],
  "pagination": {...}
}
```

---

### **POST** `/api/inventory/items/{id}/maintenance`
**Description** : Enregistrer une maintenance  
**Headers** : `Authorization: Bearer {token}`  
**Body** :
```json
{
  "date": "2024-12-05",
  "type": "Révision|Réparation|Contrôle",
  "description": "Changement d'huile et filtres",
  "cost": 150.00,
  "technician": "Marc V.",
  "nextServiceDate": "2025-06-05"
}
```
**Response 201** : Maintenance enregistrée

---

## 📅 Module Planification

### **GET** `/api/planning/tasks`
**Description** : Liste des tâches planifiées  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** :
- `status` : `A_FAIRE|EN_COURS|TERMINE` (optionnel)
- `type` : `TAILLE|TONTE|NETTOYAGE|PLANTATION|ARROSAGE|TRAITEMENT` (optionnel)
- `assignee` : ID de l'équipe/membre (optionnel)
- `dateFrom` : date de début (format ISO)
- `dateTo` : date de fin (format ISO)
- `page`, `limit`

**Response 200** :
```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Tonte Parc Central",
      "type": "TONTE",
      "status": "EN_COURS",
      "date": "2023-11-25",
      "assignee": "Équipe A",
      "assigneeId": "uuid",
      "recurrence": "1x/semaine",
      "duration": "4h",
      "zone": "Parc Central - Zone Nord",
      "priority": "NORMALE",
      "description": "Tonte hebdomadaire du parc central",
      "coordinates": {
        "lat": 32.2141,
        "lng": -7.9344
      }
    }
  ],
  "pagination": {...}
}
```

---

### **GET** `/api/planning/tasks/{id}`
**Description** : Détails d'une tâche  
**Headers** : `Authorization: Bearer {token}`  
**Response 200** : Objet tâche complet avec historique

---

### **POST** `/api/planning/tasks`
**Description** : Créer une nouvelle tâche  
**Headers** : `Authorization: Bearer {token}`  
**Body** :
```json
{
  "title": "Taille Haies Avenue Jaurès",
  "type": "TAILLE",
  "status": "A_FAIRE",
  "date": "2023-11-26",
  "assigneeId": "uuid",
  "recurrence": null,
  "duration": "6h",
  "zone": "Avenue Jaurès",
  "priority": "HAUTE",
  "description": "Taille des haies le long de l'avenue",
  "coordinates": {
    "lat": 32.2150,
    "lng": -7.9350
  }
}
```
**Response 201** : Tâche créée

---

### **PUT** `/api/planning/tasks/{id}`
**Description** : Mettre à jour une tâche  
**Headers** : `Authorization: Bearer {token}`  
**Body** : Mêmes champs que POST (tous optionnels)  
**Response 200** : Tâche mise à jour

---

### **DELETE** `/api/planning/tasks/{id}`
**Description** : Supprimer une tâche  
**Headers** : `Authorization: Bearer {token}`  
**Response 204** : No Content

---

### **GET** `/api/planning/calendar`
**Description** : Vue calendrier des tâches  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** :
- `month` : mois (1-12)
- `year` : année

**Response 200** :
```json
{
  "month": 11,
  "year": 2023,
  "tasks": [
    {
      "date": "2023-11-25",
      "tasks": [...]
    }
  ]
}
```

---

## 🛠️ Module Interventions

### **GET** `/api/interventions`
**Description** : Liste des interventions  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `status`, `type`, `site`, `dateFrom`, `dateTo`, `page`, `limit`

**Response 200** :
```json
{
  "interventions": [
    {
      "id": "uuid",
      "title": "Intervention Parc Central",
      "type": "TONTE",
      "status": "EN_COURS",
      "site": "Parc Central",
      "siteId": "uuid",
      "startDate": "2023-11-25T08:00:00Z",
      "endDate": "2023-11-25T12:00:00Z",
      "assignedTeam": "Équipe A",
      "teamId": "uuid",
      "description": "Tonte complète du parc",
      "progress": 65,
      "coordinates": {
        "lat": 32.2141,
        "lng": -7.9344
      },
      "photos": ["url1", "url2"],
      "notes": "Conditions météo favorables"
    }
  ],
  "pagination": {...}
}
```

---

### **GET** `/api/interventions/{id}`
**Description** : Détails d'une intervention  
**Headers** : `Authorization: Bearer {token}`  
**Response 200** : Intervention complète avec historique et photos

---

### **POST** `/api/interventions`
**Description** : Créer une intervention  
**Headers** : `Authorization: Bearer {token}`  
**Body** :
```json
{
  "title": "Intervention urgente",
  "type": "TRAITEMENT",
  "status": "A_FAIRE",
  "siteId": "uuid",
  "startDate": "2023-11-26T09:00:00Z",
  "endDate": "2023-11-26T17:00:00Z",
  "teamId": "uuid",
  "description": "Traitement phytosanitaire",
  "priority": "HAUTE"
}
```
**Response 201** : Intervention créée

---

### **PUT** `/api/interventions/{id}`
**Description** : Mettre à jour une intervention  
**Headers** : `Authorization: Bearer {token}`  
**Body** : Champs modifiables  
**Response 200** : Intervention mise à jour

---

### **POST** `/api/interventions/{id}/photos`
**Description** : Ajouter des photos à une intervention  
**Headers** : `Authorization: Bearer {token}`, `Content-Type: multipart/form-data`  
**Body** : FormData avec fichiers images  
**Response 201** :
```json
{
  "photos": ["url1", "url2", "url3"]
}
```

---

### **PATCH** `/api/interventions/{id}/status`
**Description** : Changer le statut d'une intervention  
**Headers** : `Authorization: Bearer {token}`  
**Body** :
```json
{
  "status": "EN_COURS|TERMINE|ANNULE",
  "notes": "Notes optionnelles"
}
```
**Response 200** : Intervention mise à jour

---

## 👥 Module Équipes

### **GET** `/api/teams/members`
**Description** : Liste des membres d'équipe  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `status`, `role`, `search`, `page`, `limit`

**Response 200** :
```json
{
  "members": [
    {
      "id": "uuid",
      "name": "Thomas Dubois",
      "role": "Superviseur",
      "status": "DISPONIBLE|OCCUPE|MALADIE|CONGE|ACCIDENT|ABSENT",
      "avatar": "url_or_initials",
      "email": "thomas.dubois@greensig.com",
      "phone": "+33612345678",
      "productivity": "Gestion",
      "monthlyInterventions": 45,
      "skills": ["Management", "Planification"],
      "hireDate": "2020-01-15",
      "certifications": ["CACES R482", "Phytolicence"]
    }
  ],
  "pagination": {...}
}
```

---

### **GET** `/api/teams/members/{id}`
**Description** : Détails d'un membre  
**Headers** : `Authorization: Bearer {token}`  
**Response 200** : Membre complet avec historique d'interventions

---

### **POST** `/api/teams/members`
**Description** : Ajouter un membre  
**Headers** : `Authorization: Bearer {token}`  
**Body** :
```json
{
  "name": "Marie Petit",
  "role": "Jardinier",
  "status": "DISPONIBLE",
  "email": "marie.petit@greensig.com",
  "phone": "+33612345679",
  "skills": ["Tonte", "Taille", "Fleurissement"],
  "hireDate": "2021-03-01"
}
```
**Response 201** : Membre créé

---

### **PUT** `/api/teams/members/{id}`
**Description** : Mettre à jour un membre  
**Headers** : `Authorization: Bearer {token}`  
**Body** : Champs modifiables  
**Response 200** : Membre mis à jour

---

### **PATCH** `/api/teams/members/{id}/status`
**Description** : Changer le statut d'un membre  
**Headers** : `Authorization: Bearer {token}`  
**Body** :
```json
{
  "status": "DISPONIBLE|OCCUPE|MALADIE|CONGE|ACCIDENT|ABSENT",
  "reason": "Congés annuels",
  "startDate": "2024-12-10",
  "endDate": "2024-12-20"
}
```
**Response 200** : Statut mis à jour

---

### **GET** `/api/teams/availability`
**Description** : Disponibilité des équipes  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** :
- `date` : date spécifique (format ISO)

**Response 200** :
```json
{
  "date": "2024-12-05",
  "available": 12,
  "busy": 5,
  "unavailable": 3,
  "members": [...]
}
```

---

## 📢 Module Réclamations

### **GET** `/api/claims`
**Description** : Liste des réclamations  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `status`, `priority`, `source`, `search`, `page`, `limit`

**Response 200** :
```json
{
  "claims": [
    {
      "id": "uuid",
      "title": "Branche tombée sur voirie",
      "status": "NOUVEAU|EN_COURS|RESOLU|EN_RETARD",
      "priority": "HAUTE|MOYENNE|BASSE",
      "source": "CLIENT|INTERNE",
      "author": "Jean Dupont",
      "authorEmail": "jean.dupont@example.com",
      "authorPhone": "+33612345678",
      "date": "2023-11-25T10:30:00Z",
      "deadline": "2023-11-26T18:00:00Z",
      "location": "Rue de la Paix",
      "coordinates": {
        "lat": 32.2145,
        "lng": -7.9340
      },
      "description": "Une grosse branche est tombée...",
      "photos": ["url1", "url2"],
      "assignedTo": "uuid",
      "resolution": null,
      "autoRating": null
    }
  ],
  "pagination": {...}
}
```

---

### **GET** `/api/claims/{id}`
**Description** : Détails d'une réclamation  
**Headers** : `Authorization: Bearer {token}`  
**Response 200** : Réclamation complète avec historique

---

### **POST** `/api/claims`
**Description** : Créer une réclamation  
**Headers** : `Authorization: Bearer {token}` (optionnel pour portail client)  
**Body** :
```json
{
  "title": "Banc public endommagé",
  "priority": "MOYENNE",
  "source": "CLIENT",
  "author": "Sophie Martin",
  "authorEmail": "sophie.martin@example.com",
  "authorPhone": "+33612345679",
  "location": "Square des Lilas",
  "coordinates": {
    "lat": 32.2150,
    "lng": -7.9350
  },
  "description": "Le banc est cassé...",
  "photos": ["base64_or_urls"]
}
```
**Response 201** : Réclamation créée

---

### **PUT** `/api/claims/{id}`
**Description** : Mettre à jour une réclamation  
**Headers** : `Authorization: Bearer {token}`  
**Body** : Champs modifiables  
**Response 200** : Réclamation mise à jour

---

### **PATCH** `/api/claims/{id}/status`
**Description** : Changer le statut d'une réclamation  
**Headers** : `Authorization: Bearer {token}`  
**Body** :
```json
{
  "status": "EN_COURS|RESOLU|EN_RETARD",
  "assignedTo": "uuid",
  "resolution": "Intervention effectuée le...",
  "autoRating": 5
}
```
**Response 200** : Statut mis à jour

---

### **POST** `/api/claims/{id}/comments`
**Description** : Ajouter un commentaire  
**Headers** : `Authorization: Bearer {token}`  
**Body** :
```json
{
  "comment": "Intervention planifiée pour demain",
  "isInternal": true
}
```
**Response 201** : Commentaire ajouté

---

## 🗺️ Module Cartographie

### **GET** `/api/map/sites`
**Description** : Liste des sites géolocalisés  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `category`, `search`

**Response 200** :
```json
{
  "sites": [
    {
      "id": "uuid",
      "name": "IMED-LAB",
      "category": "RECHERCHE|INFRASTRUCTURE|RESIDENCE|SANTE|HOTELLERIE",
      "description": "Institut de Recherche",
      "coordinates": {
        "lat": 32.2141,
        "lng": -7.9344
      },
      "color": "#3b82f6",
      "googleMapsUrl": "https://maps.google.com/...",
      "address": "Benguerir, Morocco",
      "surface": "5000m²",
      "status": "ACTIF"
    }
  ]
}
```

---

### **GET** `/api/map/sites/{id}`
**Description** : Détails d'un site  
**Headers** : `Authorization: Bearer {token}`  
**Response 200** : Site complet avec interventions associées

---

### **POST** `/api/map/sites`
**Description** : Créer un site  
**Headers** : `Authorization: Bearer {token}`  
**Body** :
```json
{
  "name": "Nouveau Site",
  "category": "INFRASTRUCTURE",
  "description": "Description du site",
  "coordinates": {
    "lat": 32.2150,
    "lng": -7.9350
  },
  "address": "Adresse complète",
  "surface": "3000m²"
}
```
**Response 201** : Site créé

---

### **GET** `/api/map/layers`
**Description** : Configuration des couches cartographiques  
**Headers** : `Authorization: Bearer {token}`  
**Response 200** :
```json
{
  "layers": [
    {
      "id": "PLAN",
      "name": "Plan",
      "url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "attribution": "© OpenStreetMap",
      "maxNativeZoom": 19
    },
    {
      "id": "SATELLITE",
      "name": "Satellite",
      "url": "...",
      "attribution": "© Esri"
    }
  ]
}
```

---

### **GET** `/api/map/overlays/vegetation`
**Description** : Données de végétation pour la carte  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `bounds` (optionnel, format: `lat1,lng1,lat2,lng2`)

**Response 200** :
```json
{
  "features": [
    {
      "id": "uuid",
      "type": "Point|Polygon",
      "geometry": {
        "type": "Point",
        "coordinates": [-7.9344, 32.2141]
      },
      "properties": {
        "type": "Palmier",
        "species": "Phoenix dactylifera",
        "color": "#f59e42",
        "symbol": "🌴"
      }
    }
  ]
}
```

---

### **GET** `/api/map/overlays/hydrology`
**Description** : Données d'hydrologie pour la carte  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `bounds` (optionnel)

**Response 200** :
```json
{
  "features": [
    {
      "id": "uuid",
      "type": "Point|LineString",
      "geometry": {
        "type": "Point",
        "coordinates": [-7.9344, 32.2141]
      },
      "properties": {
        "type": "Puit",
        "name": "P-001",
        "color": "#2563eb",
        "symbol": "💧"
      }
    }
  ]
}
```

---

### **GET** `/api/map/search`
**Description** : Recherche géographique  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `q` (query string)

**Response 200** :
```json
{
  "results": [
    {
      "name": "IMED-LAB",
      "description": "Institut de Recherche",
      "coordinates": {
        "lat": 32.2141,
        "lng": -7.9344
      },
      "zoom": 18,
      "type": "site"
    }
  ]
}
```

---

## 📱 Module Portail Client

### **GET** `/api/client-portal/dashboard`
**Description** : Tableau de bord client  
**Headers** : `Authorization: Bearer {client_token}`  
**Response 200** :
```json
{
  "client": {
    "id": "uuid",
    "name": "Ville de Benguerir",
    "contractStart": "2023-01-01",
    "contractEnd": "2025-12-31"
  },
  "stats": {
    "interventionsThisMonth": 45,
    "openClaims": 2,
    "satisfaction": 4.5
  },
  "recentInterventions": [...],
  "openClaims": [...]
}
```

---

### **GET** `/api/client-portal/interventions`
**Description** : Interventions du client  
**Headers** : `Authorization: Bearer {client_token}`  
**Query Params** : `dateFrom`, `dateTo`, `page`, `limit`  
**Response 200** : Liste des interventions (vue client)

---

### **GET** `/api/client-portal/claims`
**Description** : Réclamations du client  
**Headers** : `Authorization: Bearer {client_token}`  
**Query Params** : `status`, `page`, `limit`  
**Response 200** : Liste des réclamations

---

### **POST** `/api/client-portal/claims`
**Description** : Créer une réclamation (portail client)  
**Headers** : `Authorization: Bearer {client_token}`  
**Body** : Même format que `/api/claims`  
**Response 201** : Réclamation créée

---

### **GET** `/api/client-portal/reports`
**Description** : Rapports mensuels  
**Headers** : `Authorization: Bearer {client_token}`  
**Query Params** : `month`, `year`

**Response 200** :
```json
{
  "month": 11,
  "year": 2023,
  "report": {
    "interventions": 45,
    "surfaceTreated": "125000m²",
    "claims": 3,
    "satisfaction": 4.5,
    "pdfUrl": "url_to_pdf"
  }
}
```

---

## 📈 Module Reporting

### **GET** `/api/reports/interventions`
**Description** : Rapport des interventions  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `dateFrom`, `dateTo`, `type`, `site`, `format` (json|pdf|excel)

**Response 200** :
```json
{
  "period": {
    "from": "2023-11-01",
    "to": "2023-11-30"
  },
  "summary": {
    "total": 120,
    "byType": {
      "TONTE": 45,
      "TAILLE": 30,
      "PLANTATION": 15,
      "ARROSAGE": 20,
      "TRAITEMENT": 10
    },
    "byStatus": {
      "TERMINE": 100,
      "EN_COURS": 15,
      "A_FAIRE": 5
    }
  },
  "details": [...]
}
```

---

### **GET** `/api/reports/productivity`
**Description** : Rapport de productivité des équipes  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `month`, `year`, `teamId`

**Response 200** :
```json
{
  "month": 11,
  "year": 2023,
  "teams": [
    {
      "teamId": "uuid",
      "teamName": "Équipe A",
      "interventions": 45,
      "surfaceTreated": "35000m²",
      "productivity": "450m²/h",
      "efficiency": 92
    }
  ]
}
```

---

### **GET** `/api/reports/claims`
**Description** : Rapport des réclamations  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `dateFrom`, `dateTo`, `format`

**Response 200** :
```json
{
  "period": {...},
  "summary": {
    "total": 45,
    "byStatus": {
      "RESOLU": 35,
      "EN_COURS": 8,
      "NOUVEAU": 2
    },
    "byPriority": {
      "HAUTE": 5,
      "MOYENNE": 25,
      "BASSE": 15
    },
    "averageResolutionTime": "2.5 jours"
  }
}
```

---

### **GET** `/api/reports/financial`
**Description** : Rapport financier  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `month`, `year`

**Response 200** :
```json
{
  "month": 11,
  "year": 2023,
  "revenue": 125000.00,
  "costs": {
    "labor": 45000.00,
    "materials": 15000.00,
    "equipment": 8000.00,
    "maintenance": 3500.00
  },
  "profit": 53500.00,
  "margin": 42.8
}
```

---

## 🔔 Module Notifications

### **GET** `/api/notifications`
**Description** : Liste des notifications  
**Headers** : `Authorization: Bearer {token}`  
**Query Params** : `read` (true|false), `page`, `limit`

**Response 200** :
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "CLAIM|INTERVENTION|TASK|MAINTENANCE",
      "title": "Nouvelle réclamation",
      "message": "Une nouvelle réclamation a été créée",
      "read": false,
      "createdAt": "2023-11-25T10:30:00Z",
      "relatedId": "uuid",
      "relatedType": "claim"
    }
  ],
  "unreadCount": 5,
  "pagination": {...}
}
```

---

### **PATCH** `/api/notifications/{id}/read`
**Description** : Marquer comme lu  
**Headers** : `Authorization: Bearer {token}`  
**Response 200** : Notification mise à jour

---

### **POST** `/api/notifications/read-all`
**Description** : Marquer toutes comme lues  
**Headers** : `Authorization: Bearer {token}`  
**Response 200** :
```json
{
  "message": "All notifications marked as read",
  "count": 5
}
```

---

## 📊 Codes d'Erreur Standards

Tous les endpoints utilisent les codes HTTP standards :

- **200 OK** : Succès
- **201 Created** : Ressource créée
- **204 No Content** : Succès sans contenu
- **400 Bad Request** : Données invalides
- **401 Unauthorized** : Non authentifié
- **403 Forbidden** : Non autorisé
- **404 Not Found** : Ressource introuvable
- **422 Unprocessable Entity** : Validation échouée
- **500 Internal Server Error** : Erreur serveur

**Format d'erreur** :
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Les données fournies sont invalides",
    "details": {
      "email": ["Ce champ est requis"],
      "date": ["Format de date invalide"]
    }
  }
}
```

---

## 🔒 Authentification

Tous les endpoints (sauf `/api/auth/login`) nécessitent un token JWT dans le header :

```
Authorization: Bearer {jwt_token}
```

Le token contient :
- `user_id` : ID de l'utilisateur
- `role` : Rôle (ADMIN, OPERATOR, CLIENT)
- `exp` : Date d'expiration

---

## 📝 Notes d'Implémentation Django

### Structure Recommandée

```
backend/
├── greensig/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── authentication/
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   └── urls.py
│   ├── dashboard/
│   ├── inventory/
│   ├── planning/
│   ├── interventions/
│   ├── teams/
│   ├── claims/
│   ├── map/
│   ├── client_portal/
│   ├── reporting/
│   └── notifications/
└── manage.py
```

### Packages Recommandés

- `djangorestframework` : API REST
- `djangorestframework-simplejwt` : JWT Authentication
- `django-cors-headers` : CORS
- `django-filter` : Filtrage avancé
- `drf-spectacular` : Documentation OpenAPI
- `pillow` : Gestion d'images
- `celery` : Tâches asynchrones
- `django-storages` : Stockage fichiers (S3, etc.)
- `psycopg2` : PostgreSQL

### Permissions

Créer des classes de permissions personnalisées :
- `IsAdmin` : Accès complet
- `IsOperator` : Accès lecture/écriture (sauf config)
- `IsClient` : Accès limité au portail client

---

**Date de création** : 2025-12-05  
**Version** : 1.0  
**Auteur** : GreenSIG Development Team
