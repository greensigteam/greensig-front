import { FC, useMemo, useState } from 'react';
import { X, Building2, MapPin, Users, Clock, ChevronDown } from 'lucide-react';
import {
    useFloating, offset, flip, shift, autoUpdate,
    FloatingPortal, useDismiss, useInteractions
} from '@floating-ui/react';
import { PlanningFilters, STATUT_TACHE_LABELS, StatutTache } from '../../types/planning';
import { StructureClient, EquipeList } from '../../types/users';
import { SiteFrontend } from '../../services/api';

interface PlanningFiltersProps {
    filters: PlanningFilters;
    onFiltersChange: (filters: PlanningFilters) => void;
    structures: StructureClient[];
    sites: SiteFrontend[];
    equipes: EquipeList[];
    disabled?: boolean;
}

const PlanningFiltersComponent: FC<PlanningFiltersProps> = ({
    filters,
    onFiltersChange,
    structures,
    sites,
    equipes,
    disabled = false
}) => {
    const [isStatutOpen, setIsStatutOpen] = useState(false);

    // Compte filtres actifs
    const activeCount = useMemo(() => {
        let count = 0;
        if (filters.clientId !== null) count++;
        if (filters.siteId !== null) count++;
        if (filters.equipeId !== null) count++;
        if (filters.statuts.length > 0) count++;
        return count;
    }, [filters]);

    const hasActiveFilters = activeCount > 0;

    // Statuts disponibles
    const statutsOptions: StatutTache[] = ['PLANIFIEE', 'EN_RETARD', 'EXPIREE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

    // Floating UI pour popover Statut
    const { refs, floatingStyles, context } = useFloating({
        open: isStatutOpen,
        onOpenChange: setIsStatutOpen,
        placement: 'bottom-start',
        middleware: [offset(8), flip(), shift({ padding: 10 })],
        whileElementsMounted: autoUpdate
    });

    const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true });
    const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

    // Handlers
    const handleClientChange = (clientId: number | null) => {
        onFiltersChange({
            ...filters,
            clientId,
            siteId: null // Reset site quand client change
        });
    };

    const handleSiteChange = (siteId: number | null) => {
        onFiltersChange({ ...filters, siteId });
    };

    const handleEquipeChange = (equipeId: number | null) => {
        onFiltersChange({ ...filters, equipeId });
    };

    const handleStatutToggle = (statut: StatutTache) => {
        const newStatuts = filters.statuts.includes(statut)
            ? filters.statuts.filter(s => s !== statut)
            : [...filters.statuts, statut];
        onFiltersChange({ ...filters, statuts: newStatuts });
    };

    const handleReset = () => {
        onFiltersChange({
            ...filters,
            clientId: null,
            siteId: null,
            equipeId: null,
            statuts: []
        });
    };

    const filteredSites = useMemo(() => {
        if (!filters.clientId) return sites;
        // Si un client est sélectionné, on filtre les sites correspondants
        // Note: SiteFrontend.structure_client semble être l'ID numérique
        return sites.filter(s => s.structure_client === filters.clientId);
    }, [sites, filters.clientId]);

    return (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
            {/* Client (Structure) */}
            <div className="relative shrink-0">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                    value={filters.clientId ?? ''}
                    onChange={(e) => handleClientChange(e.target.value ? Number(e.target.value) : null)}
                    disabled={disabled}
                    className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[150px]"
                >
                    <option value="">Organisation</option>
                    {structures.map(s => (
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
                    value={filters.siteId ?? ''}
                    onChange={(e) => handleSiteChange(e.target.value ? Number(e.target.value) : null)}
                    disabled={disabled}
                    className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[130px]"
                >
                    <option value="">Site</option>
                    {filteredSites.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Équipe */}
            <div className="relative shrink-0">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                    value={filters.equipeId ?? ''}
                    onChange={(e) => handleEquipeChange(e.target.value ? Number(e.target.value) : null)}
                    disabled={disabled}
                    className="appearance-none pl-9 pr-8 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer min-w-[130px]"
                >
                    <option value="">Équipe</option>
                    {equipes.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.nomEquipe}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Statut (on garde le popover multi-select car plus puissant, mais on le style comme SuiviTaches) */}
            <div className="shrink-0">
                <button
                    ref={refs.setReference}
                    {...getReferenceProps()}
                    disabled={disabled}
                    onClick={() => setIsStatutOpen(!isStatutOpen)}
                    className={`
                        relative flex items-center gap-2 pl-9 pr-4 py-2 border-2 rounded-lg text-sm font-medium transition-all shadow-sm min-w-[120px]
                        ${isStatutOpen || filters.statuts.length > 0
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}
                    `}
                >
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    Statut {filters.statuts.length > 0 && `(${filters.statuts.length})`}
                    <ChevronDown className="ml-auto w-4 h-4 text-slate-400" />
                </button>

                {isStatutOpen && (
                    <FloatingPortal>
                        <div
                            ref={refs.setFloating}
                            style={floatingStyles}
                            {...getFloatingProps()}
                            className="z-[1000] w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 space-y-1 animate-in fade-in zoom-in-95 duration-200"
                        >
                            <div className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Filtrer par statut</div>
                            {statutsOptions.map(statut => {
                                const isSelected = filters.statuts.includes(statut);
                                return (
                                    <label
                                        key={statut}
                                        className={`
                                            flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                                            ${isSelected ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-700'}
                                        `}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleStatutToggle(statut)}
                                            className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                        />
                                        <span className="text-sm font-semibold">
                                            {STATUT_TACHE_LABELS[statut]}
                                        </span>
                                    </label>
                                );
                            })}
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
        </div>
    );
};

export default PlanningFiltersComponent;
