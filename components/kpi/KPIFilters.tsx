import React from 'react';
import { Filter, Calendar, Building2, RotateCcw, X, BarChart3, Eye, EyeOff } from 'lucide-react';
import { KPIData, KPI_LABELS, KPI_COLORS, ALL_KPI_KEYS } from '../../hooks/useKPIData';

interface KPIFiltersProps {
    data: KPIData;
    selectedSite: string;
    setSelectedSite: (site: string) => void;
    selectedMois: string;
    setSelectedMois: (mois: string) => void;
    moisOptions: Array<{ value: string; label: string }>;
    periodeRaccourcis: Array<{ label: string; value: string; icon: string }>;
    hasActiveFilters: boolean;
    selectedSiteName: string;
    visibleKPIs: Set<string>;
    resetFilters: () => void;
    toggleKPIVisibility: (kpiKey: string) => void;
    toggleAllKPIs: () => void;
}

const KPIFilters: React.FC<KPIFiltersProps> = ({
    data,
    selectedSite,
    setSelectedSite,
    selectedMois,
    setSelectedMois,
    moisOptions,
    periodeRaccourcis,
    hasActiveFilters,
    selectedSiteName,
    visibleKPIs,
    resetFilters,
    toggleKPIVisibility,
    toggleAllKPIs,
}) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Filter className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <span className="font-semibold text-slate-700">Filtres de période</span>
                            {hasActiveFilters && (
                                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                    {(selectedSite ? 1 : 0) + (selectedMois !== periodeRaccourcis[0]?.value ? 1 : 0)} actif(s)
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Réinitialiser
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Quick period selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            Période rapide
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {periodeRaccourcis.map((periode) => (
                                <button
                                    key={periode.value}
                                    onClick={() => setSelectedMois(periode.value)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${selectedMois === periode.value
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {periode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Month selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            Mois personnalisé
                        </label>
                        <select
                            value={selectedMois}
                            onChange={(e) => setSelectedMois(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        >
                            {moisOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Site filter */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            Site
                        </label>
                        <div className="relative">
                            <select
                                value={selectedSite}
                                onChange={(e) => setSelectedSite(e.target.value)}
                                className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${selectedSite ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'
                                    }`}
                            >
                                <option value="">Tous les sites</option>
                                {data.sites_disponibles.map(site => (
                                    <option key={site.id} value={site.id}>
                                        {site.nom}
                                    </option>
                                ))}
                            </select>
                            {selectedSite && (
                                <button
                                    onClick={() => setSelectedSite('')}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPI type filter */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-slate-400" />
                            KPIs à afficher
                        </label>
                        <button
                            onClick={toggleAllKPIs}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                            {visibleKPIs.size === ALL_KPI_KEYS.length ? 'Désélectionner tout' : 'Tout sélectionner'}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {ALL_KPI_KEYS.map((kpiKey) => (
                            <button
                                key={kpiKey}
                                onClick={() => toggleKPIVisibility(kpiKey)}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                    visibleKPIs.has(kpiKey)
                                        ? 'text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                                style={visibleKPIs.has(kpiKey) ? { backgroundColor: KPI_COLORS[kpiKey] } : {}}
                            >
                                {visibleKPIs.has(kpiKey) ? (
                                    <Eye className="w-3.5 h-3.5" />
                                ) : (
                                    <EyeOff className="w-3.5 h-3.5" />
                                )}
                                {KPI_LABELS[kpiKey]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active filters tags */}
                {hasActiveFilters && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-500">Filtres actifs:</span>
                            {selectedSite && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                    <Building2 className="w-3 h-3" />
                                    {selectedSiteName}
                                    <button
                                        onClick={() => setSelectedSite('')}
                                        className="ml-1 hover:text-emerald-900"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {selectedMois !== periodeRaccourcis[0]?.value && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                    <Calendar className="w-3 h-3" />
                                    {moisOptions.find(m => m.value === selectedMois)?.label}
                                    <button
                                        onClick={() => setSelectedMois(periodeRaccourcis[0]?.value || '')}
                                        className="ml-1 hover:text-blue-900"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KPIFilters;
