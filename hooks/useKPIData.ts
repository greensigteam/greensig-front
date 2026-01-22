import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { apiFetch } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Types
export interface KPIDetails {
    valeur: number;
    objectif: number | null;
    unite: string;
    objectif_atteint: boolean | null;
    details: Record<string, any>;
    alerte?: boolean;
    message_alerte?: string;
    error?: string;
}

export interface KPIEvolution {
    valeur_precedente: number;
    variation: number;
    variation_pct: number;
    tendance: 'hausse' | 'baisse' | 'stable';
}

export interface KPIData {
    periode: {
        mois: string;
        debut: string;
        fin: string;
    };
    kpis: {
        respect_planning: KPIDetails;
        taux_realisation_reclamations: KPIDetails;
        temps_moyen_traitement_reclamations: KPIDetails;
        temps_realisation_taches: KPIDetails;
        temps_travail_par_site: KPIDetails;
    };
    evolution: Record<string, KPIEvolution>;
    sites_disponibles: Array<{ id: number; nom: string }>;
    types_taches_disponibles?: Array<{ id: number; nom: string }>;
}

export interface KPIHistorique {
    historique: Array<{
        mois: string;
        kpis: Record<string, number>;
    }>;
}

// Constants
export const COLORS = {
    primary: '#059669',
    secondary: '#3b82f6',
    warning: '#f59e0b',
    danger: '#ef4444',
    success: '#22c55e',
    gray: '#6b7280',
};

export const KPI_COLORS: Record<string, string> = {
    respect_planning: '#059669',
    taux_realisation_reclamations: '#3b82f6',
    temps_moyen_traitement_reclamations: '#f59e0b',
    temps_realisation_taches: '#8b5cf6',
    temps_travail_par_site: '#ec4899',
};

export const KPI_LABELS: Record<string, string> = {
    respect_planning: 'Respect du planning',
    taux_realisation_reclamations: 'Taux de réalisation réclamations',
    temps_moyen_traitement_reclamations: 'Temps moyen traitement réclamations',
    temps_realisation_taches: 'Temps de réalisation par tâche',
    temps_travail_par_site: 'Temps total de travail',
};

export const ALL_KPI_KEYS = [
    'respect_planning',
    'taux_realisation_reclamations',
    'temps_moyen_traitement_reclamations',
    'temps_realisation_taches',
    'temps_travail_par_site'
] as const;

export type KPIKey = typeof ALL_KPI_KEYS[number];

export interface UseKPIDataReturn {
    // Data
    data: KPIData | null;
    historique: KPIHistorique | null;
    loading: boolean;
    error: string | null;

    // Filters
    selectedSite: string;
    setSelectedSite: (site: string) => void;
    selectedMois: string;
    setSelectedMois: (mois: string) => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    visibleKPIs: Set<string>;

    // Export state
    isExporting: boolean;
    setIsExporting: (exporting: boolean) => void;
    showExportMenu: boolean;
    setShowExportMenu: (show: boolean) => void;
    exportMenuRef: React.RefObject<HTMLDivElement>;

    // Computed values
    moisOptions: Array<{ value: string; label: string }>;
    periodeRaccourcis: Array<{ label: string; value: string; icon: string }>;
    hasActiveFilters: boolean;
    selectedSiteName: string;
    chartData: Array<Record<string, any>>;
    sitesData: Array<any>;

    // Actions
    loadData: () => Promise<void>;
    resetFilters: () => void;
    toggleKPIVisibility: (kpiKey: string) => void;
    toggleAllKPIs: () => void;
}

export function useKPIData(): UseKPIDataReturn {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<KPIData | null>(null);
    const [historique, setHistorique] = useState<KPIHistorique | null>(null);

    // Filters
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [selectedMois, setSelectedMois] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [showFilters, setShowFilters] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // KPI visibility
    const [visibleKPIs, setVisibleKPIs] = useState<Set<string>>(new Set(ALL_KPI_KEYS));

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (selectedSite) params.append('site_id', selectedSite);
            if (selectedMois) params.append('mois', selectedMois);

            const [kpiResponse, historiqueResponse] = await Promise.all([
                apiFetch(`${API_BASE_URL}/kpis/?${params.toString()}`),
                apiFetch(`${API_BASE_URL}/kpis/historique/?${params.toString()}`),
            ]);

            const kpiData = await kpiResponse.json();
            const historiqueData = await historiqueResponse.json();

            setData(kpiData);
            setHistorique(historiqueData);
        } catch (err: any) {
            console.error('Error loading KPI data:', err);
            setError(err.message || 'Erreur lors du chargement des KPIs');
        } finally {
            setLoading(false);
        }
    }, [selectedSite, selectedMois]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Close export menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Generate month options (last 12 months)
    const moisOptions = useMemo(() => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            options.push({ value, label });
        }
        return options;
    }, []);

    // Period shortcuts
    const periodeRaccourcis = useMemo(() => {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const twoMonthsAgoStr = `${twoMonthsAgo.getFullYear()}-${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}`;
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const threeMonthsAgoStr = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}`;

        return [
            { label: 'Ce mois', value: currentMonth, icon: '📅' },
            { label: 'M-1', value: lastMonthStr, icon: '◀' },
            { label: 'M-2', value: twoMonthsAgoStr, icon: '◀◀' },
            { label: 'M-3', value: threeMonthsAgoStr, icon: '◀◀◀' },
        ];
    }, []);

    // Check if filters are active
    const hasActiveFilters = useMemo(() => {
        return selectedSite !== '' || selectedMois !== periodeRaccourcis[0]?.value;
    }, [selectedSite, selectedMois, periodeRaccourcis]);

    // Get selected site name
    const selectedSiteName = useMemo(() => {
        return data?.sites_disponibles.find(s => s.id.toString() === selectedSite)?.nom || 'Tous les sites';
    }, [data, selectedSite]);

    // Prepare chart data
    const chartData = useMemo(() => {
        return historique?.historique.map(item => ({
            mois: new Date(item.mois + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
            'Respect planning': item.kpis.respect_planning,
            'Réalisation réclamations': item.kpis.taux_realisation_reclamations,
            'Temps traitement (h)': item.kpis.temps_moyen_traitement_reclamations,
            'Temps tâche (h)': item.kpis.temps_realisation_taches,
            'Total travail (h)': item.kpis.temps_travail_par_site,
        })) || [];
    }, [historique]);

    // Sites data for bar chart
    const sitesData = useMemo(() => {
        return data?.kpis.temps_travail_par_site.details?.par_site || [];
    }, [data]);

    // Reset filters
    const resetFilters = useCallback(() => {
        setSelectedSite('');
        setSelectedMois(periodeRaccourcis[0]?.value || '');
    }, [periodeRaccourcis]);

    // Toggle KPI visibility
    const toggleKPIVisibility = useCallback((kpiKey: string) => {
        setVisibleKPIs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(kpiKey)) {
                newSet.delete(kpiKey);
            } else {
                newSet.add(kpiKey);
            }
            return newSet;
        });
    }, []);

    // Toggle all KPIs
    const toggleAllKPIs = useCallback(() => {
        if (visibleKPIs.size === ALL_KPI_KEYS.length) {
            setVisibleKPIs(new Set());
        } else {
            setVisibleKPIs(new Set(ALL_KPI_KEYS));
        }
    }, [visibleKPIs.size]);

    return {
        // Data
        data,
        historique,
        loading,
        error,

        // Filters
        selectedSite,
        setSelectedSite,
        selectedMois,
        setSelectedMois,
        showFilters,
        setShowFilters,
        visibleKPIs,

        // Export state
        isExporting,
        setIsExporting,
        showExportMenu,
        setShowExportMenu,
        exportMenuRef,

        // Computed values
        moisOptions,
        periodeRaccourcis,
        hasActiveFilters,
        selectedSiteName,
        chartData,
        sitesData,

        // Actions
        loadData,
        resetFilters,
        toggleKPIVisibility,
        toggleAllKPIs,
    };
}
