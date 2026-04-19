import { FC, useMemo, useState } from 'react';
import { X, Clock, ChevronDown, Search, Filter, Users, Repeat } from 'lucide-react';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  FloatingPortal,
  useDismiss,
  useInteractions,
} from '@floating-ui/react';
import {
  DistributionFilters as DistributionFiltersType,
  StatusDistribution,
  STATUS_DISTRIBUTION_LABELS,
  STATUS_DISTRIBUTION_COLORS,
} from '../../types/planning';
import { EquipeList } from '../../types/users';

interface DistributionFiltersProps {
  filters: DistributionFiltersType;
  onFiltersChange: (filters: DistributionFiltersType) => void;
  equipes?: EquipeList[];
  disabled?: boolean;
}

/**
 * Composant de filtres avancés pour les distributions de charges.
 * Permet de tester tous les filtres backend disponibles.
 */
const DistributionFiltersComponent: FC<DistributionFiltersProps> = ({
  filters,
  onFiltersChange,
  equipes = [],
  disabled = false,
}) => {
  const [isStatutOpen, setIsStatutOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Compte filtres actifs
  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.status_in && filters.status_in.length > 0) count++;
    if (filters.actif !== undefined) count++;
    if (filters.termine !== undefined) count++;
    if (filters.equipe) count++;
    if (filters.urgent !== undefined) count++;
    if (filters.est_report !== undefined) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeCount > 0;

  // Statuts disponibles (✅ SIMPLIFIÉ: Plus de EN_RETARD)
  const statutsOptions: StatusDistribution[] = [
    'NON_REALISEE',
    'EN_COURS',
    'REALISEE',
    'REPORTEE',
    'ANNULEE',
  ];

  // Floating UI pour popover Statut
  const {
    refs: statusRefs,
    floatingStyles: statusFloatingStyles,
    context: statusContext,
  } = useFloating({
    open: isStatutOpen,
    onOpenChange: setIsStatutOpen,
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
  });

  const statusDismiss = useDismiss(statusContext, { outsidePress: true, escapeKey: true });
  const { getReferenceProps: getStatusRefProps, getFloatingProps: getStatusFloatingProps } =
    useInteractions([statusDismiss]);

  // Floating UI pour popover "Plus de filtres"
  const {
    refs: moreRefs,
    floatingStyles: moreFloatingStyles,
    context: moreContext,
  } = useFloating({
    open: isMoreOpen,
    onOpenChange: setIsMoreOpen,
    placement: 'bottom-end',
    middleware: [offset(8), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
  });

  const moreDismiss = useDismiss(moreContext, { outsidePress: true, escapeKey: true });
  const { getReferenceProps: getMoreRefProps, getFloatingProps: getMoreFloatingProps } =
    useInteractions([moreDismiss]);

  // Handlers
  const handleStatutToggle = (statut: StatusDistribution) => {
    const currentStatuts = filters.status_in || [];
    const newStatuts = currentStatuts.includes(statut)
      ? currentStatuts.filter((s) => s !== statut)
      : [...currentStatuts, statut];

    onFiltersChange({
      ...filters,
      status_in: newStatuts.length > 0 ? newStatuts : undefined,
      // Clear actif/termine shortcuts when using manual selection
      actif: undefined,
      termine: undefined,
    });
  };

  const handleEquipeChange = (equipeId: number | undefined) => {
    onFiltersChange({ ...filters, equipe: equipeId });
  };

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search: search || undefined });
  };

  const handleShortcutChange = (
    shortcut: 'actif' | 'termine' | 'urgent' | 'est_report',
    value: boolean | undefined,
  ) => {
    onFiltersChange({
      ...filters,
      [shortcut]: value,
      // Clear status_in when using shortcuts
      ...(shortcut === 'actif' || shortcut === 'termine' ? { status_in: undefined } : {}),
    });
  };

  const handleReset = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 flex-wrap">
      {/* Recherche textuelle */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Rechercher..."
          disabled={disabled}
          className="pl-9 pr-4 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm w-40"
        />
      </div>

      {/* Statut (multi-select popover) */}
      <div className="shrink-0">
        <button
          ref={statusRefs.setReference}
          {...getStatusRefProps()}
          disabled={disabled}
          onClick={() => setIsStatutOpen(!isStatutOpen)}
          className={`
                        relative flex items-center gap-2 pl-9 pr-4 py-2 border-2 rounded-lg text-sm font-medium transition-all shadow-sm min-w-[120px]
                        ${
                          isStatutOpen || (filters.status_in && filters.status_in.length > 0)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }
                    `}
        >
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          Statut{' '}
          {filters.status_in && filters.status_in.length > 0 && `(${filters.status_in.length})`}
          <ChevronDown className="ml-auto w-4 h-4 text-slate-400" />
        </button>

        {isStatutOpen && (
          <FloatingPortal>
            <div
              ref={statusRefs.setFloating}
              style={statusFloatingStyles}
              {...getStatusFloatingProps()}
              className="z-[1000] w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 space-y-1 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Filtrer par statut
              </div>
              {statutsOptions.map((statut) => {
                const isSelected = filters.status_in?.includes(statut) || false;
                const colors = STATUS_DISTRIBUTION_COLORS[statut];
                return (
                  <label
                    key={statut}
                    className={`
                                            flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                                            ${isSelected ? `${colors.bg} ${colors.text}` : 'hover:bg-slate-50 text-slate-700'}
                                        `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleStatutToggle(statut)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold">
                      {STATUS_DISTRIBUTION_LABELS[statut]}
                    </span>
                  </label>
                );
              })}
            </div>
          </FloatingPortal>
        )}
      </div>

      {/* Équipe */}
      {equipes.length > 0 && (
        <div className="relative shrink-0">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={filters.equipe ?? ''}
            onChange={(e) =>
              handleEquipeChange(e.target.value ? Number(e.target.value) : undefined)
            }
            disabled={disabled}
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
      )}

      {/* Raccourcis rapides */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => handleShortcutChange('actif', filters.actif === true ? undefined : true)}
          disabled={disabled}
          className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-all border-2
                        ${
                          filters.actif === true
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }
                    `}
          title="NON_REALISEE, EN_COURS (distributions actives)"
        >
          Actif
        </button>

        <button
          onClick={() => handleShortcutChange('urgent', filters.urgent === true ? undefined : true)}
          disabled={disabled}
          className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-all border-2
                        ${
                          filters.urgent === true
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
            handleShortcutChange('est_report', filters.est_report === true ? undefined : true)
          }
          disabled={disabled}
          className={`
                        flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2
                        ${
                          filters.est_report === true
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

      {/* Plus de filtres */}
      <div className="shrink-0">
        <button
          ref={moreRefs.setReference}
          {...getMoreRefProps()}
          disabled={disabled}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`
                        flex items-center gap-2 px-3 py-2 border-2 rounded-lg text-sm font-medium transition-all shadow-sm
                        ${
                          isMoreOpen
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }
                    `}
        >
          <Filter className="w-4 h-4" />
          Plus
        </button>

        {isMoreOpen && (
          <FloatingPortal>
            <div
              ref={moreRefs.setFloating}
              style={moreFloatingStyles}
              {...getMoreFloatingProps()}
              className="z-[1000] w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 space-y-4 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Filtres avancés
              </div>

              {/* Terminé */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.termine === true}
                  onChange={(e) =>
                    handleShortcutChange('termine', e.target.checked ? true : undefined)
                  }
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">
                  Terminées (REALISEE, REPORTEE, ANNULEE)
                </span>
              </label>

              {/* Priorité minimum */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">Priorité minimum</label>
                <select
                  value={filters.priorite_min ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      priorite_min: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Toutes</option>
                  <option value="2">2+ (Basse et plus)</option>
                  <option value="3">3+ (Moyenne et plus)</option>
                  <option value="4">4+ (Haute et plus)</option>
                  <option value="5">5 (Urgente uniquement)</option>
                </select>
              </div>

              {/* Tri */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">Trier par</label>
                <select
                  value={filters.ordering ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      ordering: e.target.value || undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Par défaut (date)</option>
                  <option value="date">Date (croissant)</option>
                  <option value="-date">Date (décroissant)</option>
                  <option value="status">Statut</option>
                  <option value="-priorite">Priorité (haute d'abord)</option>
                  <option value="priorite">Priorité (basse d'abord)</option>
                </select>
              </div>
            </div>
          </FloatingPortal>
        )}
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <button
          onClick={handleReset}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
          title="Réinitialiser les filtres"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Indicateur filtres actifs */}
      {hasActiveFilters && (
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          {activeCount} filtre{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};

export default DistributionFiltersComponent;
