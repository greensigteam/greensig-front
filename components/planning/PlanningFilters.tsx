import { FC, useMemo, useState } from 'react';
import { X, Filter } from 'lucide-react';
import {
    useFloating, offset, flip, shift, autoUpdate,
    FloatingPortal, useDismiss, useInteractions
} from '@floating-ui/react';
import { PlanningFilters, STATUT_TACHE_LABELS, StatutTache } from '../../types/planning';
import { Client, EquipeList } from '../../types/users';
import { MODAL_DESIGN_TOKENS } from '../modals/designTokens';

interface PlanningFiltersProps {
    filters: PlanningFilters;
    onFiltersChange: (filters: PlanningFilters) => void;
    clients: Client[];
    sites: Array<{ id: number; name: string }>;
    equipes: EquipeList[];
    disabled?: boolean;
}

const PlanningFiltersComponent: FC<PlanningFiltersProps> = ({
    filters,
    onFiltersChange,
    clients,
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
    const statutsOptions: StatutTache[] = ['PLANIFIEE', 'NON_DEBUTEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

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
            clientId: null,
            siteId: null,
            equipeId: null,
            statuts: []
        });
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Client Dropdown */}
            <select
                value={filters.clientId ?? ''}
                onChange={(e) => handleClientChange(e.target.value ? Number(e.target.value) : null)}
                disabled={disabled || clients.length === 0}
                className={`${MODAL_DESIGN_TOKENS.inputs.select} min-w-[140px] sm:min-w-[180px] ${disabled || clients.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <option value="">Tous les clients</option>
                {clients.map(c => (
                    <option key={c.utilisateur} value={c.utilisateur}>
                        {c.nomStructure}
                    </option>
                ))}
            </select>

            {/* Site Dropdown (conditionnel - apparaît seulement si client sélectionné) */}
            {filters.clientId !== null && (
                <select
                    value={filters.siteId ?? ''}
                    onChange={(e) => handleSiteChange(e.target.value ? Number(e.target.value) : null)}
                    disabled={disabled || sites.length === 0}
                    className={`${MODAL_DESIGN_TOKENS.inputs.select} min-w-[140px] sm:min-w-[180px] ${disabled || sites.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <option value="">Tous les sites</option>
                    {sites.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            )}

            {/* Équipe Dropdown */}
            <select
                value={filters.equipeId ?? ''}
                onChange={(e) => handleEquipeChange(e.target.value ? Number(e.target.value) : null)}
                disabled={disabled || equipes.length === 0}
                className={`${MODAL_DESIGN_TOKENS.inputs.select} min-w-[140px] sm:min-w-[180px] ${disabled || equipes.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <option value="">Toutes les équipes</option>
                {equipes.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nom}</option>
                ))}
            </select>

            {/* Statut Multi-Select (Floating UI Popover) */}
            <div>
                <button
                    ref={refs.setReference}
                    {...getReferenceProps()}
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsStatutOpen(!isStatutOpen)}
                    className={`
                        flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
                        hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
                        transition-all outline-none
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                >
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">
                        Statut {filters.statuts.length > 0 && `(${filters.statuts.length})`}
                    </span>
                </button>

                {isStatutOpen && (
                    <FloatingPortal>
                        <div
                            ref={refs.setFloating}
                            style={floatingStyles}
                            {...getFloatingProps()}
                            className="z-[1000] w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3 space-y-2"
                        >
                            {statutsOptions.map(statut => {
                                const isSelected = filters.statuts.includes(statut);
                                return (
                                    <label
                                        key={statut}
                                        className={`
                                            flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
                                            ${isSelected ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-gray-50'}
                                        `}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleStatutToggle(statut)}
                                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">
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
                    type="button"
                    onClick={handleReset}
                    disabled={disabled}
                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                    title="Réinitialiser les filtres"
                >
                    <X className="w-4 h-4" />
                </button>
            )}

            {/* Active Filters Badge */}
            {activeCount > 0 && (
                <span className={MODAL_DESIGN_TOKENS.badges.emerald}>
                    {activeCount} filtre{activeCount > 1 ? 's' : ''}
                </span>
            )}
        </div>
    );
};

export default PlanningFiltersComponent;
