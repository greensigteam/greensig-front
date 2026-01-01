// ============================================================================
// CLIENT INVENTORY SERVICE
// Service pour récupérer les statistiques d'inventaire agrégées par client
// ============================================================================

import { fetchAllSites } from './api';
import { apiFetch } from './apiFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryStats {
    totalObjets: number;
    vegetation: {
        total: number;
        byType: Record<string, number>;
    };
    hydraulique: {
        total: number;
        byType: Record<string, number>;
    };
    bySite?: Array<{
        siteId: string;
        siteName: string;
        total: number;
        vegetation: number;
        hydraulique: number;
    }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const OBJECT_TYPES = [
    'arbres', 'gazons', 'palmiers', 'arbustes', 'vivaces', 'cactus', 'graminees',
    'puits', 'pompes', 'vannes', 'clapets', 'canalisations', 'aspersions', 'gouttes', 'ballons'
];

const VEG_TYPES = ['arbres', 'gazons', 'palmiers', 'arbustes', 'vivaces', 'cactus', 'graminees'];
const HYDRO_TYPES = ['puits', 'pompes', 'vannes', 'clapets', 'canalisations', 'aspersions', 'gouttes', 'ballons'];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère les statistiques d'inventaire pour un client donné
 *
 * OPTION 1 (préférée) : Utilise un endpoint backend dédié si disponible
 * OPTION 2 (fallback) : Calcule les stats côté client en agrégeant toutes les requêtes
 */
export async function fetchClientInventoryStats(clientId: number): Promise<InventoryStats> {
    // OPTION 1: Essayer d'abord l'endpoint backend (à implémenter côté Django)
    try {
        const response = await apiFetch(`${API_BASE_URL}/clients/${clientId}/inventory-stats/`);
        const data = await response.json();
        return data;
    } catch (error) {
        // Si l'endpoint n'existe pas (404) ou autre erreur, fallback sur calcul client-side
        console.warn('Backend inventory stats endpoint not available, falling back to client-side calculation');
        return await computeInventoryStatsClientSide(clientId);
    }
}

// ============================================================================
// OPTION 2: CLIENT-SIDE COMPUTATION
// ============================================================================

/**
 * Calcule les statistiques d'inventaire côté client
 * Attention: Effectue de nombreuses requêtes (potentiellement lent)
 */
async function computeInventoryStatsClientSide(structureClientId: number): Promise<InventoryStats> {
    const stats: InventoryStats = {
        totalObjets: 0,
        vegetation: {
            total: 0,
            byType: {}
        },
        hydraulique: {
            total: 0,
            byType: {}
        },
        bySite: []
    };

    try {
        // 1. Récupérer tous les sites de la structure client
        const allSites = await fetchAllSites(true); // Force refresh
        const clientSites = allSites.filter(s => s.structure_client === structureClientId);

        if (clientSites.length === 0) {
            return stats; // Pas de sites = pas d'objets
        }

        // 2. Pour chaque site, récupérer les objets de tous les types
        const siteStatsPromises = clientSites.map(site =>
            fetchSiteInventoryStats(site.id, site.name || `Site ${site.id}`)
        );

        const siteStatsArray = await Promise.all(siteStatsPromises);

        // 3. Agréger les résultats
        for (const siteStats of siteStatsArray) {
            stats.totalObjets += siteStats.total;
            stats.vegetation.total += siteStats.vegetation;
            stats.hydraulique.total += siteStats.hydraulique;

            // Ajouter aux stats par site
            if (stats.bySite) {
                stats.bySite.push(siteStats);
            }

            // Agréger par type
            for (const [type, count] of Object.entries(siteStats.byType)) {
                if (VEG_TYPES.includes(type)) {
                    stats.vegetation.byType[type] = (stats.vegetation.byType[type] || 0) + count;
                } else if (HYDRO_TYPES.includes(type)) {
                    stats.hydraulique.byType[type] = (stats.hydraulique.byType[type] || 0) + count;
                }
            }
        }

        return stats;
    } catch (error) {
        console.error('Error computing inventory stats:', error);
        throw new Error('Erreur lors du calcul des statistiques d\'inventaire');
    }
}

/**
 * Récupère les statistiques d'inventaire pour un site donné
 */
async function fetchSiteInventoryStats(
    siteId: string,
    siteName: string
): Promise<{
    siteId: string;
    siteName: string;
    total: number;
    vegetation: number;
    hydraulique: number;
    byType: Record<string, number>;
}> {
    const siteStats = {
        siteId,
        siteName,
        total: 0,
        vegetation: 0,
        hydraulique: 0,
        byType: {} as Record<string, number>
    };

    // Requêtes en parallèle pour tous les types d'objets
    const typeCountPromises = OBJECT_TYPES.map(async (type) => {
        try {
            const response = await apiFetch(`${API_BASE_URL}/${type}/?site=${siteId}`);
            const data = await response.json();

            // L'API Django renvoie une réponse paginée avec { count, results }
            const count = data.count || data.results?.length || 0;

            if (count > 0) {
                siteStats.byType[type] = count;
                siteStats.total += count;

                if (VEG_TYPES.includes(type)) {
                    siteStats.vegetation += count;
                } else if (HYDRO_TYPES.includes(type)) {
                    siteStats.hydraulique += count;
                }
            }
        } catch (error) {
            // Ignorer les erreurs pour types non disponibles
            console.warn(`Failed to fetch ${type} for site ${siteId}:`, error);
        }
    });

    await Promise.all(typeCountPromises);

    return siteStats;
}

// ============================================================================
// HELPER: Format stats for display
// ============================================================================

/**
 * Formate les statistiques pour l'affichage
 * Trie les types par count décroissant et traduit les noms
 */
export function formatInventoryStats(stats: InventoryStats): {
    vegetationFormatted: Array<{ label: string; count: number }>;
    hydrauliqueFormatted: Array<{ label: string; count: number }>;
} {
    const typeLabels: Record<string, string> = {
        arbres: 'Arbres',
        gazons: 'Gazons',
        palmiers: 'Palmiers',
        arbustes: 'Arbustes',
        vivaces: 'Vivaces',
        cactus: 'Cactus',
        graminees: 'Graminées',
        puits: 'Puits',
        pompes: 'Pompes',
        vannes: 'Vannes',
        clapets: 'Clapets',
        canalisations: 'Canalisations',
        aspersions: 'Aspersions',
        gouttes: 'Gouttes à goutte',
        ballons: 'Ballons'
    };

    const vegetationFormatted = Object.entries(stats.vegetation.byType)
        .map(([type, count]) => ({
            label: typeLabels[type] || type,
            count
        }))
        .sort((a, b) => b.count - a.count);

    const hydrauliqueFormatted = Object.entries(stats.hydraulique.byType)
        .map(([type, count]) => ({
            label: typeLabels[type] || type,
            count
        }))
        .sort((a, b) => b.count - a.count);

    return {
        vegetationFormatted,
        hydrauliqueFormatted
    };
}
