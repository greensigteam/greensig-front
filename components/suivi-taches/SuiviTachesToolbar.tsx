import React from 'react';
import { Filter, Building2, MapPin, Users, Clock, ChevronDown, X, RefreshCw, Calendar } from 'lucide-react';
import { PlanningFilters, StatutTache } from '../../types/planning';
import { StructureClient, EquipeList } from '../../types/users';
import { SiteFrontend } from '../../services/api';

interface SuiviTachesToolbarProps {
    filters: PlanningFilters;
    onFiltersChange: (filters: PlanningFilters) => void;
    showFilters: boolean;
    onShowFiltersChange: (show: boolean) => void;
    activeFiltersCount: number;
    onClearFilters: () => void;
    structures: StructureClient[];
    equipes: EquipeList[];
    filteredSites: SiteFrontend[];
    loadingFilters: boolean;
    filteredTachesCount: number;
    loadingTasks: boolean;
    onRefresh: () => void;
}

export const SuiviTachesToolbar: React.FC<SuiviTachesToolbarProps> = ({
    filters,
    onFiltersChange,
    showFilters,
    onShowFiltersChange,
    activeFiltersCount,
    onClearFilters,
    structures,
    equipes,
    filteredSites,
    loadingFilters,
    filteredTachesCount,
    loadingTasks,
    onRefresh,
}) => {
    const handleClientChange = (clientId: number | null) => {
        onFiltersChange({
            ...filters,
            clientId,
            siteId: null // Reset site when org changes
        });
    };

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0 overflow-x-auto">
            {/* Filter Toggle Button */}
            <button
                onClick={() => onShowFiltersChange(!showFilters)}
                className={`relative p-2.5 rounded-lg transition-all duration-200 shrink-0 ${
                    showFilters || activeFiltersCount > 0
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 shadow-sm'
                }`}
                title="Filtres"
            >
                <Filter className="w-4 h-4" />
                {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">
                        {activeFiltersCount}
                    </span>
                )}
            </button>

            {/* Inline Filters */}
            {showFilters && (
                <>
                    <div className="h-8 w-px bg-slate-200 shrink-0"></div>

                    {/* Structure Client Filter (Organization) */}
                    <div className="relative shrink-0">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                            value={filters.clientId ?? ''}
                            onChange={e => handleClientChange(e.target.value ? Number(e.target.value) : null)}
                            className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]"
                            disabled={loadingFilters}
                        >
                            <option value="">Organisation</option>
                            {structures.map(s => (
                                <option key={s.id} value={s.id}>{s.nom}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Site Filter */}
                    <div className="relative shrink-0">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                            value={filters.siteId ?? ''}
                            onChange={e => onFiltersChange({ ...filters, siteId: e.target.value ? Number(e.target.value) : null })}
                            className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]"
                            disabled={loadingFilters}
                        >
                            <option value="">Site</option>
                            {filteredSites.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Equipe Filter */}
                    <div className="relative shrink-0">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                            value={filters.equipeId ?? ''}
                            onChange={e => onFiltersChange({ ...filters, equipeId: e.target.value ? Number(e.target.value) : null })}
                            className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]"
                            disabled={loadingFilters}
                        >
                            <option value="">Équipe</option>
                            {equipes.map(e => (
                                <option key={e.id} value={e.id}>{e.nomEquipe}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Statut Filter */}
                    <div className="relative shrink-0">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                            value={filters.statuts.length === 1 ? filters.statuts[0] : ''}
                            onChange={e => onFiltersChange({ ...filters, statuts: e.target.value ? [e.target.value as StatutTache] : [] })}
                            className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[130px]"
                        >
                            <option value="">Statut</option>
                            <option value="PLANIFIEE">Planifiée</option>
                            <option value="EN_RETARD">En retard</option>
                            <option value="EXPIREE">Expirée</option>
                            <option value="EN_COURS">En cours</option>
                            <option value="TERMINEE">Terminée</option>
                            <option value="ANNULEE">Annulée</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Date Range Filter */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="date"
                                value={filters.dateDebut ?? ''}
                                onChange={e => onFiltersChange({ ...filters, dateDebut: e.target.value || null })}
                                className="pl-9 pr-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer w-[140px]"
                                title="Date de début"
                            />
                        </div>
                        <span className="text-slate-400 text-sm">→</span>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="date"
                                value={filters.dateFin ?? ''}
                                onChange={e => onFiltersChange({ ...filters, dateFin: e.target.value || null })}
                                className="pl-9 pr-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer w-[140px]"
                                title="Date de fin"
                            />
                        </div>
                    </div>

                    {/* Reset Filters */}
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={onClearFilters}
                            className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm shrink-0"
                            title="Réinitialiser les filtres"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </>
            )}

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Count */}
            <span className="text-sm text-slate-500 shrink-0">
                {filteredTachesCount} tâche{filteredTachesCount > 1 ? 's' : ''}
            </span>

            {/* Refresh Button */}
            <button
                onClick={onRefresh}
                disabled={loadingTasks}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                title="Actualiser"
            >
                <RefreshCw className={`w-5 h-5 ${loadingTasks ? 'animate-spin' : ''}`} />
            </button>
        </div>
    );
};

export default SuiviTachesToolbar;
