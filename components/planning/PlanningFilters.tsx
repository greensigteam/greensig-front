import { FC, useMemo, useState, useRef, useEffect } from 'react';
import {
  X,
  Building2,
  MapPin,
  Users,
  Clock,
  ChevronDown,
  Wrench,
  Search,
  Check,
} from 'lucide-react';
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
  PlanningFilters,
  STATUT_TACHE_LABELS,
  STATUT_TACHE_COLORS,
  StatutTache,
  TypeTache,
} from '../../types/planning';
import { StructureClient, EquipeList } from '../../types/users';
import { SiteFrontend } from '../../services/api';

interface PlanningFiltersProps {
  filters: PlanningFilters;
  onFiltersChange: (filters: PlanningFilters) => void;
  structures: StructureClient[];
  sites: SiteFrontend[];
  equipes: EquipeList[];
  typesTaches: TypeTache[];
  disabled?: boolean;
}

// ============================================================================
// COMPOSANT GÉNÉRIQUE : FilterPopover (single-select avec quicksearch)
// ============================================================================

interface FilterPopoverOption {
  id: number;
  label: string;
  badge?: { bg: string; text: string };
}

interface FilterPopoverProps {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  options: FilterPopoverOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
  minWidth?: string;
}

const FilterPopover: FC<FilterPopoverProps> = ({
  icon,
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  minWidth = '160px',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
  });
  const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  // Focus le champ de recherche à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  );

  const selectedLabel = value !== null ? options.find((o) => o.id === value)?.label : null;
  const isActive = value !== null;

  return (
    <div className="shrink-0">
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{ minWidth }}
        className={`relative flex items-center gap-2 pl-9 pr-3 py-2 border-2 rounded-lg text-sm font-medium transition-all shadow-sm
                    ${
                      isOpen || isActive
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
      >
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {icon}
        </span>
        <span className="truncate flex-1 text-left">{selectedLabel ?? label}</span>
        {isActive && (
          <span
            role="button"
            aria-label="Effacer"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="shrink-0 rounded-full hover:bg-emerald-200 p-0.5 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        {!isActive && <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-[1000] w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header label */}
            <div className="px-3 pt-3 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              {placeholder}
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-56 overflow-y-auto p-2 space-y-0.5">
              {/* Option "Tous" */}
              <button
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left
                                    ${value === null ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <span className="flex-1 italic">Tous</span>
                {value === null && <Check className="w-4 h-4 shrink-0" />}
              </button>

              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-400 text-center">Aucun résultat</p>
              ) : (
                filtered.map((option) => {
                  const isSelected = value === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        onChange(option.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left
                                                ${isSelected ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <span className="flex-1 truncate">{option.label}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-emerald-600" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

const PlanningFiltersComponent: FC<PlanningFiltersProps> = ({
  filters,
  onFiltersChange,
  structures,
  sites,
  equipes,
  typesTaches,
  disabled = false,
}) => {
  const [isStatutOpen, setIsStatutOpen] = useState(false);

  const hasActiveFilters = useMemo(
    () =>
      filters.clientId !== null ||
      filters.siteId !== null ||
      filters.equipeId !== null ||
      filters.statuts.length > 0 ||
      filters.typeTacheId !== null,
    [filters],
  );

  const statutsOptions: StatutTache[] = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

  // Floating UI pour Statut (multi-select → garde son propre popover)
  const {
    refs: statutRefs,
    floatingStyles: statutFloatingStyles,
    context: statutContext,
  } = useFloating({
    open: isStatutOpen,
    onOpenChange: setIsStatutOpen,
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
  });
  const statutDismiss = useDismiss(statutContext, { outsidePress: true, escapeKey: true });
  const { getReferenceProps: getStatutRefProps, getFloatingProps: getStatutFloatProps } =
    useInteractions([statutDismiss]);

  const handleStatutToggle = (statut: StatutTache) => {
    const newStatuts = filters.statuts.includes(statut)
      ? filters.statuts.filter((s) => s !== statut)
      : [...filters.statuts, statut];
    onFiltersChange({ ...filters, statuts: newStatuts });
  };

  const handleReset = () => {
    onFiltersChange({
      ...filters,
      clientId: null,
      siteId: null,
      equipeId: null,
      statuts: [],
      typeTacheId: null,
    });
  };

  // Options pour FilterPopover
  const structureOptions: FilterPopoverOption[] = useMemo(
    () => structures.map((s) => ({ id: s.id, label: s.nom })),
    [structures],
  );

  const siteOptions: FilterPopoverOption[] = useMemo(() => {
    const list = filters.clientId
      ? sites.filter((s) => s.structure_client === filters.clientId)
      : sites;
    return list.map((s) => ({ id: Number(s.id), label: s.name }));
  }, [sites, filters.clientId]);

  const equipeOptions: FilterPopoverOption[] = useMemo(
    () => equipes.map((e) => ({ id: e.id, label: e.nomEquipe })),
    [equipes],
  );

  const typeTacheOptions: FilterPopoverOption[] = useMemo(
    () => typesTaches.map((tt) => ({ id: tt.id, label: tt.nom_tache })),
    [typesTaches],
  );

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
      {/* Organisation */}
      <FilterPopover
        icon={<Building2 className="w-4 h-4" />}
        label="Organisation"
        placeholder="Filtrer par organisation"
        options={structureOptions}
        value={filters.clientId}
        onChange={(id) => onFiltersChange({ ...filters, clientId: id, siteId: null })}
        disabled={disabled}
        minWidth="160px"
      />

      {/* Site */}
      <FilterPopover
        icon={<MapPin className="w-4 h-4" />}
        label="Site"
        placeholder="Filtrer par site"
        options={siteOptions}
        value={filters.siteId}
        onChange={(id) => onFiltersChange({ ...filters, siteId: id })}
        disabled={disabled}
        minWidth="140px"
      />

      {/* Équipe */}
      <FilterPopover
        icon={<Users className="w-4 h-4" />}
        label="Équipe"
        placeholder="Filtrer par équipe"
        options={equipeOptions}
        value={filters.equipeId}
        onChange={(id) => onFiltersChange({ ...filters, equipeId: id })}
        disabled={disabled}
        minWidth="140px"
      />

      {/* Type de tâche */}
      <FilterPopover
        icon={<Wrench className="w-4 h-4" />}
        label="Type de tâche"
        placeholder="Filtrer par type de tâche"
        options={typeTacheOptions}
        value={filters.typeTacheId}
        onChange={(id) => onFiltersChange({ ...filters, typeTacheId: id })}
        disabled={disabled}
        minWidth="160px"
      />

      {/* Statut (multi-select) */}
      <div className="shrink-0">
        <button
          ref={statutRefs.setReference}
          {...getStatutRefProps()}
          disabled={disabled}
          onClick={() => setIsStatutOpen(!isStatutOpen)}
          className={`relative flex items-center gap-2 pl-9 pr-3 py-2 border-2 rounded-lg text-sm font-medium transition-all shadow-sm min-w-[130px]
                        ${
                          isStatutOpen || filters.statuts.length > 0
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
        >
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          Statut{' '}
          {filters.statuts.length > 0 && (
            <span className="ml-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
              {filters.statuts.length}
            </span>
          )}
          <ChevronDown className="ml-auto w-4 h-4 text-slate-400 shrink-0" />
        </button>

        {isStatutOpen && (
          <FloatingPortal>
            <div
              ref={statutRefs.setFloating}
              style={statutFloatingStyles}
              {...getStatutFloatProps()}
              className="z-[1000] w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="px-3 pt-3 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Filtrer par statut
              </div>
              <div className="p-2 space-y-0.5">
                {statutsOptions.map((statut) => {
                  const isSelected = filters.statuts.includes(statut);
                  const colors = STATUT_TACHE_COLORS[statut];
                  return (
                    <label
                      key={statut}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                                                ${isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleStatutToggle(statut)}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                      />
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
                      >
                        {STATUT_TACHE_LABELS[statut]}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </FloatingPortal>
        )}
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <button
          onClick={handleReset}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 shrink-0"
          title="Réinitialiser les filtres"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default PlanningFiltersComponent;
