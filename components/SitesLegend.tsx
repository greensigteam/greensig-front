import React, { useEffect, useState } from 'react';
import { fetchAllSites, SiteFrontend } from '../services/api';
import { HYDRO_LEGEND, VEG_LEGEND } from '../constants';
import { Microscope, Building2, Home, Stethoscope, BedDouble, Loader2 } from 'lucide-react';

interface SitesLegendProps {
    onSiteClick?: (site: SiteFrontend) => void;
    // Optionnel: passer les sites depuis le parent pour éviter double chargement
    sites?: SiteFrontend[];
}

const CATEGORY_LABELS: Record<SiteFrontend['category'], string> = {
    RECHERCHE: 'Recherche',
    INFRASTRUCTURE: 'Infrastructure',
    RESIDENCE: 'Résidences',
    SANTE: 'Santé',
    HOTELLERIE: 'Hôtellerie'
};

const CATEGORY_ICONS: Record<SiteFrontend['category'], React.ElementType> = {
    RECHERCHE: Microscope,
    INFRASTRUCTURE: Building2,
    RESIDENCE: Home,
    SANTE: Stethoscope,
    HOTELLERIE: BedDouble
};

export const SitesLegend: React.FC<SitesLegendProps> = ({ onSiteClick, sites: propSites }) => {
    const [sites, setSites] = useState<SiteFrontend[]>(propSites || []);
    const [loading, setLoading] = useState(!propSites);

    // Charger les sites si non fournis en props
    useEffect(() => {
        if (propSites) {
            setSites(propSites);
            setLoading(false);
            return;
        }

        const loadSites = async () => {
            try {
                setLoading(true);
                const loadedSites = await fetchAllSites();
                setSites(loadedSites);
            } catch (error) {
                console.error('Erreur chargement sites dans SitesLegend:', error);
            } finally {
                setLoading(false);
            }
        };
        loadSites();
    }, [propSites]);

    // Mettre à jour si propSites change
    useEffect(() => {
        if (propSites) {
            setSites(propSites);
        }
    }, [propSites]);

    const categories = Array.from(new Set(sites.map(s => s.category)));

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 max-h-[600px] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Légende</h3>

            {/* Légende par catégorie de site */}
            <div className="mb-4">
                <h4 className="font-semibold text-sm text-gray-600 mb-2">Sites</h4>
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement...
                    </div>
                ) : (
                    <div className="space-y-2">
                        {categories.map(category => {
                            const sitesInCategory = sites.filter(s => s.category === category);
                            const color = sitesInCategory[0]?.color || '#6b7280';
                            const Icon = CATEGORY_ICONS[category] || Building2;

                            return (
                                <div key={category} className="flex items-center gap-2">
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm border border-white"
                                        style={{ backgroundColor: color + '20' }}
                                    >
                                        <Icon className="w-3.5 h-3.5" style={{ color: color }} />
                                    </div>
                                    <span className="text-sm text-gray-700">
                                        {CATEGORY_LABELS[category]} ({sitesInCategory.length})
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Légende Hydrologie */}
            <div className="mb-4">
                <h4 className="font-semibold text-sm text-gray-600 mb-2">Hydrologie</h4>
                <div className="space-y-2">
                    {HYDRO_LEGEND.map(item => (
                        <div key={item.type} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-gray-700">{item.type}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Légende Végétation */}
            <div className="mb-4">
                <h4 className="font-semibold text-sm text-gray-600 mb-2">Végétation</h4>
                <div className="space-y-2">
                    {VEG_LEGEND.map(item => {
                        const Icon = item.icon;
                        return (
                            <div key={item.type} className="flex items-center gap-2">
                                {Icon ? (
                                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: item.color }} />
                                )}
                                <span className="text-sm text-gray-700">{item.type}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Liste des sites */}
            <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-2">
                    Tous les sites {!loading && `(${sites.length})`}
                </h4>
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement des sites...
                    </div>
                ) : sites.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2">
                        Aucun site disponible
                    </div>
                ) : (
                    <div className="space-y-1">
                        {sites.map(site => (
                            <button
                                key={site.id}
                                onClick={() => onSiteClick?.(site)}
                                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors flex items-center gap-2 group"
                            >
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-white shadow group-hover:scale-110 transition-transform"
                                    style={{ backgroundColor: site.color }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-gray-800 truncate">
                                        {site.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                        {site.description}
                                    </div>
                                </div>
                                <svg
                                    className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
