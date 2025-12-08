import { Coordinates } from '../types';

export interface Site {
    id: string;
    name: string;
    coordinates: Coordinates;
    description: string;
    category: 'RECHERCHE' | 'INFRASTRUCTURE' | 'RESIDENCE' | 'SANTE' | 'HOTELLERIE';
    googleMapsUrl: string;
    color: string;
}

export const SITES: Site[] = [
    {
        id: 'phenotypage',
        name: 'Phénotypage',
        coordinates: { lat: 32.216623, lng: -7.932517 },
        description: 'Centre de phénotypage des plantes',
        category: 'RECHERCHE',
        googleMapsUrl: 'https://maps.app.goo.gl/m2b8PAB5yaHHijtT7',
        color: '#8b5cf6' // Violet pour recherche
    },
    {
        id: 'extension-modulaire',
        name: 'Extension Modulaire',
        coordinates: { lat: 32.216095, lng: -7.933693 },
        description: 'Extension modulaire du campus',
        category: 'INFRASTRUCTURE',
        googleMapsUrl: 'https://maps.app.goo.gl/2pj5X3vn4awYSzgz6',
        color: '#3b82f6' // Bleu pour infrastructure
    },
    {
        id: 'tech-park',
        name: 'Tech Park',
        coordinates: { lat: 32.219075, lng: -7.931137 },
        description: 'Parc technologique et innovation',
        category: 'INFRASTRUCTURE',
        googleMapsUrl: 'https://maps.app.goo.gl/MPEaFUHq1qdmhVm77',
        color: '#3b82f6'
    },
    {
        id: 'start-gate',
        name: 'Start Gate',
        coordinates: { lat: 32.220959, lng: -7.934374 },
        description: 'Incubateur de startups',
        category: 'INFRASTRUCTURE',
        googleMapsUrl: 'https://maps.app.goo.gl/wM8AXgowNWLzznL27',
        color: '#3b82f6'
    },
    {
        id: 'dice',
        name: 'DICE',
        coordinates: { lat: 32.221846, lng: -7.934003 },
        description: 'Centre de recherche DICE',
        category: 'RECHERCHE',
        googleMapsUrl: 'https://maps.app.goo.gl/c1gvWcPA5oohsyMw6',
        color: '#8b5cf6'
    },
    {
        id: 'villas-chercheurs',
        name: 'Villas Chercheurs',
        coordinates: { lat: 32.212852, lng: -7.937114 },
        description: 'Résidences pour chercheurs',
        category: 'RESIDENCE',
        googleMapsUrl: 'https://maps.app.goo.gl/68G7tVYue2ZoHfhc7',
        color: '#10b981' // Vert pour résidences
    },
    {
        id: 'dome-sro',
        name: 'Dome SRO',
        coordinates: { lat: 32.211786, lng: -7.938083 },
        description: 'Dôme SRO - Structure de recherche',
        category: 'RECHERCHE',
        googleMapsUrl: 'https://maps.app.goo.gl/Lu1D2jAwVQ9nXD9c8',
        color: '#8b5cf6'
    },
    {
        id: 'hilton',
        name: 'HILTON',
        coordinates: { lat: 32.214374, lng: -7.938642 },
        description: 'Hôtel Hilton',
        category: 'HOTELLERIE',
        googleMapsUrl: 'https://maps.app.goo.gl/BrMNKrqbkLdEuM6f9',
        color: '#f59e0b' // Orange pour hôtellerie
    },
    {
        id: 'hopital-geriatrie',
        name: 'Hôpital Gériatrie',
        coordinates: { lat: 32.216334, lng: -7.945208 },
        description: 'Hôpital de gériatrie',
        category: 'SANTE',
        googleMapsUrl: 'https://maps.app.goo.gl/CpJKSkuDHWzGbM5P8',
        color: '#ef4444' // Rouge pour santé
    },
    {
        id: 'residences-locatives',
        name: 'Résidences Locatives',
        coordinates: { lat: 32.218862, lng: -7.947078 },
        description: 'Résidences locatives',
        category: 'RESIDENCE',
        googleMapsUrl: 'https://maps.app.goo.gl/r5iuhEoZurihwQoE7',
        color: '#10b981'
    },
    {
        id: 'villas-marguerites',
        name: 'Villas Marguerites',
        coordinates: { lat: 32.208102, lng: -7.930539 },
        description: 'Villas Marguerites - Résidences',
        category: 'RESIDENCE',
        googleMapsUrl: 'https://maps.app.goo.gl/WqZBrJbNEHJTRoN38',
        color: '#10b981'
    },
    {
        id: 'cub',
        name: 'CUB',
        coordinates: { lat: 32.210210, lng: -7.935591 },
        description: 'Centre Universitaire de Benguerir',
        category: 'INFRASTRUCTURE',
        googleMapsUrl: 'https://maps.app.goo.gl/YAZuQ89ZevzdCRLbA',
        color: '#3b82f6'
    }
];

// Fonction pour obtenir un site par ID
export const getSiteById = (id: string): Site | undefined => {
    return SITES.find(site => site.id === id);
};

// Fonction pour obtenir les sites par catégorie
export const getSitesByCategory = (category: Site['category']): Site[] => {
    return SITES.filter(site => site.category === category);
};
