import React, { useMemo } from 'react';
import {
  Filter,
  Building2,
  MapPin,
  Users,
  Clock,
  ChevronDown,
  X,
  RefreshCw,
  ListTodo,
  CalendarDays,
  Repeat,
} from 'lucide-react';
import {
  PlanningFilters,
  StatutTache,
  DistributionFilters,
  StatusDistribution,
  STATUS_DISTRIBUTION_LABELS,
} from '../../types/planning';
import { StructureClient, EquipeList } from '../../types/users';
import { SiteFrontend } from '../../services/api';

export type ViewMode = 'tasks' | 'distributions';

interface SuiviTachesToolbarProps {
  // Filtres des tâches
  filters: PlanningFilters;
  onFiltersChange: (filters: PlanningFilters) => void;
  activeFiltersCount: number;
  onClearFilters: () => void;

  // Filtres des distributions
  distributionFilters?: DistributionFilters;
  onDistributionFiltersChange?: (filters: DistributionFilters) => void;

  // État commun
  showFilters: boolean;
  onShowFiltersChange: (show: boolean) => void;
  structures: StructureClient[];
  equipes: EquipeList[];
  filteredSites: SiteFrontend[];
  loadingFilters: boolean;
  filteredTachesCount: number;
  loadingTasks: boolean;
  onRefresh: () => void;

  // Mode de vue
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  distributionsCount?: number;
}

export const SuiviTachesToolbar: React.FC<SuiviTachesToolbarProps> = ({
  filters,
  onFiltersChange,
  activeFiltersCount,
  onClearFilters,
  distributionFilters = {},
  onDistributionFiltersChange,
  showFilters,
  onShowFiltersChange,
  structures,
  equipes,
  filteredSites,
  loadingFilters,
  filteredTachesCount,
  loadingTasks,
  onRefresh,
  viewMode = 'tasks',
  onViewModeChange,
  distributionsCount = 0,
}) => {
  // Calculer le nombre de filtres actifs pour les distributions
  const distributionActiveFiltersCount = useMemo(() => {
    let count = 0;
    if (distributionFilters.status) count++;
    if (distributionFilters.status_in && distributionFilters.status_in.length > 0) count++;
    if (distributionFilters.actif !== undefined) count++;
    if (distributionFilters.termine !== undefined) count++;
    if (distributionFilters.equipe) count++;
    if (distributionFilters.structure) count++;
    if (distributionFilters.site) count++;
    if (distributionFilters.urgent !== undefined) count++;
    if (distributionFilters.est_report !== undefined) count++;
    if (distributionFilters.search) count++;
    return count;
  }, [distributionFilters]);

  // Filtrer les sites par structure sélectionnée (pour distributions)
  const distributionFilteredSites = useMemo(() => {
    if (!distributionFilters.structure) return filteredSites;
    return filteredSites.filter((s) => s.structure_client === distributionFilters.structure);
  }, [filteredSites, distributionFilters.structure]);

  // Nombre de filtres actifs selon le mode
  const currentActiveFiltersCount =
    viewMode === 'distributions' ? distributionActiveFiltersCount : activeFiltersCount;

  const handleClientChange = (clientId: number | null) => {
    onFiltersChange({
      ...filters,
      clientId,
      siteId: null, // Reset site when org changes
    });
  };

  const handleDistributionFilterChange = (updates: Partial<DistributionFilters>) => {
    if (onDistributionFiltersChange) {
      onDistributionFiltersChange({ ...distributionFilters, ...updates });
    }
  };

  const handleDistributionShortcut = (
    shortcut: 'actif' | 'termine' | 'urgent' | 'est_report',
    currentValue: boolean | undefined,
  ) => {
    if (onDistributionFiltersChange) {
      const newValue = currentValue === true ? undefined : true;
      const updates: Partial<DistributionFilters> = { [shortcut]: newValue };

      // Clear status_in when using status shortcuts
      if (shortcut === 'actif' || shortcut === 'termine') {
        updates.status_in = undefined;
      }

      onDistributionFiltersChange({ ...distributionFilters, ...updates });
    }
  };

  const handleClearCurrentFilters = () => {
    if (viewMode === 'distributions' && onDistributionFiltersChange) {
      onDistributionFiltersChange({});
    } else {
      onClearFilters();
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0 overflow-x-auto">
      {/* View Mode Toggle */}
      {onViewModeChange && (
        <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
          <button
            onClick={() => onViewModeChange('tasks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              viewMode === 'tasks'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Vue par tâches"
          >
            <ListTodo className="w-4 h-4" />
            <span className="hidden sm:inline">Tâches</span>
          </button>
          <button
            onClick={() => onViewModeChange('distributions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              viewMode === 'distributions'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Vue par jour"
          >
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Par jour</span>
          </button>
        </div>
      )}

      {/* Separator */}
      {onViewModeChange && <div className="h-8 w-px bg-slate-200 shrink-0"></div>}

      {/* Filter Toggle Button */}
      <button
        onClick={() => onShowFiltersChange(!showFilters)}
        className={`relative p-2.5 rounded-lg transition-all duration-200 shrink-0 ${
          showFilters || currentActiveFiltersCount > 0
            ? 'bg-emerald-600 text-white shadow-md'
            : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 shadow-sm'
        }`}
        title="Filtres"
      >
        <Filter className="w-4 h-4" />
        {currentActiveFiltersCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">
            {currentActiveFiltersCount}
          </span>
        )}
      </button>

      {/* ==================== FILTRES TÂCHES ==================== */}
      {showFilters && viewMode === 'tasks' && (
        <>
          <div className="h-8 w-px bg-slate-200 shrink-0"></div>

          {/* Structure Client Filter (Organization) */}
          <div className="relative shrink-0">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={filters.clientId ?? ''}
              onChange={(e) => handleClientChange(e.target.value ? Number(e.target.value) : null)}
              className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]"
              disabled={loadingFilters}
            >
              <option value="">Organisation</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Site Filter */}
          <div className="relative shrink-0">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={filters.siteId ?? ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  siteId: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]"
              disabled={loadingFilters}
            >
              <option value="">Site</option>
              {filteredSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Equipe Filter */}
          <div className="relative shrink-0">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={filters.equipeId ?? ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  equipeId: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]"
              disabled={loadingFilters}
            >
              <option value="">Équipe</option>
              {equipes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nomEquipe}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Statut Filter */}
          <div className="relative shrink-0">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={filters.statuts.length === 1 ? filters.statuts[0] : ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  statuts: e.target.value ? [e.target.value as StatutTache] : [],
                })
              }
              className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[130px]"
            >
              <option value="">Statut</option>
              <option value="PLANIFIEE">Planifiée</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINEE">Terminée</option>
              <option value="ANNULEE">Annulée</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="date"
              value={filters.dateDebut ?? ''}
              onChange={(e) => onFiltersChange({ ...filters, dateDebut: e.target.value || null })}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer w-[150px]"
              title="Date de début"
            />
            <span className="text-slate-400 text-sm">→</span>
            <input
              type="date"
              value={filters.dateFin ?? ''}
              onChange={(e) => onFiltersChange({ ...filters, dateFin: e.target.value || null })}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer w-[150px]"
              title="Date de fin"
            />
          </div>
        </>
      )}

      {/* ==================== FILTRES DISTRIBUTIONS ==================== */}
      {showFilters && viewMode === 'distributions' && onDistributionFiltersChange && (
        <>
          <div className="h-8 w-px bg-slate-200 shrink-0"></div>

          {/* Structure Client (Organisation) */}
          <div className="relative shrink-0">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={distributionFilters.structure ?? ''}
              onChange={(e) =>
                handleDistributionFilterChange({
                  structure: e.target.value ? Number(e.target.value) : undefined,
                  site: undefined, // Reset site when structure changes
                })
              }
              disabled={loadingTasks}
              className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[140px]"
            >
              <option value="">Organisation</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Site */}
          <div className="relative shrink-0">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={distributionFilters.site ?? ''}
              onChange={(e) =>
                handleDistributionFilterChange({
                  site: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              disabled={loadingTasks}
              className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[130px]"
            >
              <option value="">Site</option>
              {distributionFilteredSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Statut des distributions */}
          <div className="relative shrink-0">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={distributionFilters.status || ''}
              onChange={(e) =>
                handleDistributionFilterChange({
                  status: (e.target.value as StatusDistribution) || undefined,
                  status_in: undefined,
                  actif: undefined,
                  termine: undefined,
                })
              }
              className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[130px]"
              disabled={loadingTasks}
            >
              <option value="">Statut</option>
              {Object.entries(STATUS_DISTRIBUTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Équipe */}
          <div className="relative shrink-0">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={distributionFilters.equipe ?? ''}
              onChange={(e) =>
                handleDistributionFilterChange({
                  equipe: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              disabled={loadingTasks}
              className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[130px]"
            >
              <option value="">Équipe</option>
              {equipes.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nomEquipe}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Raccourcis rapides */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleDistributionShortcut('actif', distributionFilters.actif)}
              disabled={loadingTasks}
              className={`
                                px-3 py-2 rounded-lg text-sm font-medium transition-all border-2
                                ${
                                  distributionFilters.actif === true
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }
                            `}
              title="NON_REALISEE, EN_COURS (distributions actives)"
            >
              Actif
            </button>

            <button
              onClick={() => handleDistributionShortcut('urgent', distributionFilters.urgent)}
              disabled={loadingTasks}
              className={`
                                px-3 py-2 rounded-lg text-sm font-medium transition-all border-2
                                ${
                                  distributionFilters.urgent === true
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }
                            `}
              title="Priorité >= 4"
            >
              Urgent
            </button>

            <button
              onClick={() =>
                handleDistributionShortcut('est_report', distributionFilters.est_report)
              }
              disabled={loadingTasks}
              className={`
                                flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2
                                ${
                                  distributionFilters.est_report === true
                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }
                            `}
              title="Distributions issues d'un report"
            >
              <Repeat className="w-3.5 h-3.5" />
              Reports
            </button>
          </div>
        </>
      )}

      {/* Reset Filters (pour les deux modes) */}
      {showFilters && currentActiveFiltersCount > 0 && (
        <button
          onClick={handleClearCurrentFilters}
          className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm shrink-0"
          title="Réinitialiser les filtres"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Count */}
      <span className="text-sm text-slate-500 shrink-0">
        {viewMode === 'distributions' ? (
          <>
            {distributionsCount} distribution{distributionsCount > 1 ? 's' : ''}
          </>
        ) : (
          <>
            {filteredTachesCount} tâche{filteredTachesCount > 1 ? 's' : ''}
          </>
        )}
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
