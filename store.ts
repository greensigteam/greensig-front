
import { InventoryItem, Task, TeamMember, KPI } from './types';

export const MOCK_KPIS: KPI[] = [
  { label: "Interventions actives", value: 12, change: 5, trend: 'up' },
  { label: "Réclamations ouvertes", value: 3, change: -2, trend: 'down' },
  { label: "Taux de disponibilité", value: "94%", change: 1.2, trend: 'up' },
  { label: "Rentabilité Site A", value: "+12%", change: 0, trend: 'neutral' },
];

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Tondeuse Autoportée John Deere', category: 'Machinerie', status: 'DISPONIBLE', location: 'Entrepôt A', lastService: '2023-10-15', nextService: '2024-04-15', serialNumber: 'JD-8842-X', description: 'Tondeuse professionnelle pour grandes surfaces.' },
  { id: '2', name: 'Débroussailleuse Stihl FS 400', category: 'Outillage', status: 'EN_MAINTENANCE', location: 'Atelier', lastService: '2023-11-02', nextService: '2023-12-02', serialNumber: 'ST-221-B', description: 'Outil portatif pour finitions.' },
  { id: '3', name: 'Camion Benne Iveco', category: 'Véhicule', status: 'DISPONIBLE', location: 'Parking Sud', lastService: '2023-09-20', nextService: '2024-03-20', serialNumber: 'IV-992-Z' },
  { id: '4', name: 'Souffleur Thermique', category: 'Outillage', status: 'HORS_SERVICE', location: 'Zone Recyclage', lastService: '2023-01-10', serialNumber: 'SF-001-A' },
  { id: '5', name: 'Tracteur Kubota', category: 'Machinerie', status: 'DISPONIBLE', location: 'Entrepôt B', lastService: '2023-12-01', nextService: '2024-06-01', serialNumber: 'KU-773-C' },
];

export const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Tonte Parc Central', type: 'TONTE', status: 'EN_COURS', date: '2023-11-25', assignee: 'Équipe A', recurrence: '1x/semaine', duration: '4h', zone: 'Parc Central - Zone Nord' },
  { id: '2', title: 'Taille Haies Avenue Jaurès', type: 'TAILLE', status: 'A_FAIRE', date: '2023-11-26', assignee: 'Équipe B', duration: '6h', zone: 'Avenue Jaurès' },
  { id: '3', title: 'Plantation Massifs Mairie', type: 'PLANTATION', status: 'TERMINE', date: '2023-11-24', assignee: 'Équipe C', duration: '2j', zone: 'Mairie' },
  { id: '4', title: 'Arrosage automatique secteur Nord', type: 'ARROSAGE', status: 'A_FAIRE', date: '2023-11-27', assignee: 'Auto', recurrence: '1x/jour', duration: '1h', zone: 'Secteur Nord' },
];

export const MOCK_TEAM: TeamMember[] = [
  { id: '1', name: 'Thomas Dubois', role: 'Superviseur', status: 'OCCUPE', avatar: 'TD', productivity: 'Gestion', monthlyInterventions: 45, skills: ['Management', 'Planification'] },
  { id: '2', name: 'Marie Petit', role: 'Jardinier', status: 'DISPONIBLE', avatar: 'MP', productivity: '320 m²/h', monthlyInterventions: 28, skills: ['Tonte', 'Taille', 'Fleurissement'] },
  { id: '3', name: 'Karim Benali', role: 'Conducteur', status: 'MALADIE', avatar: 'KB', productivity: 'N/A', monthlyInterventions: 12, skills: ['Conduite Engins', 'Mécanique'] },
  { id: '4', name: 'Julie Rossi', role: 'Paysagiste', status: 'CONGE', avatar: 'JR', productivity: '150 m²/h', monthlyInterventions: 22, skills: ['Conception', 'Plantation'] },
  { id: '5', name: 'Paul Simon', role: 'Jardinier', status: 'ACCIDENT', avatar: 'PS', productivity: '300 m²/h', monthlyInterventions: 15, skills: ['Tonte', 'Élagage'] },
];
