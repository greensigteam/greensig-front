import Dexie, { Table } from 'dexie';

// --- Interfaces pour le stockage local ---

export interface LocalSite {
    id: string;
    name: string;
    data: any; // On stocke l'objet complet SiteFrontend
    lastUpdated: number;
}

export interface LocalInventoryObject {
    id: string; // "type-id" pour assurer l'unicité entre différents types
    objectId: number;
    objectType: string;
    siteId: number | null;
    data: any; // L'objet GeoJSON feature complet
    lastUpdated: number;
}

// --- Définition de la base de données ---

export class GreenSIGDatabase extends Dexie {
    sites!: Table<LocalSite>;
    inventory!: Table<LocalInventoryObject>;

    constructor() {
        super('GreenSIGDatabase');

        // Définition des index pour des recherches rapides
        // Note: Seuls les champs indexés peuvent être utilisés dans .where()
        this.version(1).stores({
            sites: 'id, name, lastUpdated',
            inventory: 'id, objectId, objectType, siteId, lastUpdated'
        });
    }
}

export const db = new GreenSIGDatabase();
