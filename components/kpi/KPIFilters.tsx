import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, MapPin, Calendar } from 'lucide-react';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PremiumSearchableSelect } from '../modals/PremiumFormComponents';
import { useSites } from '../../hooks/queries';
import type { KPIFiltersState } from '../../types/kpi';

interface KPIFiltersProps {
    filters: KPIFiltersState;
    onChange: (filters: KPIFiltersState) => void;
}

function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function KPIFilters({ filters, onChange }: KPIFiltersProps) {
    const { data: sites } = useSites();

    const siteOptions = useMemo(() => {
        const opts: Array<{ value: string | number; label: string }> = [
            { value: '', label: 'Tous les sites' },
        ];
        if (sites) {
            for (const s of sites) {
                opts.push({ value: s.id, label: s.name });
            }
        }
        return opts;
    }, [sites]);

    const navigateMonth = (delta: number) => {
        const [y, m] = filters.mois.split('-').map(Number);
        if (y == null || m == null) return;
        const d = new Date(y, m - 1 + delta, 1);
        const newMois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        onChange({ ...filters, mois: newMois });
    };

    const isCurrentMonth = filters.mois === getCurrentMonth();

    const formattedMonth = useMemo(() => {
        try {
            const date = parse(filters.mois, 'yyyy-MM', new Date());
            const formatted = format(date, 'MMMM yyyy', { locale: fr });
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        } catch {
            return filters.mois;
        }
    }, [filters.mois]);

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Site selector — Premium */}
            <div className="w-64">
                <PremiumSearchableSelect
                    value={filters.siteId ?? ''}
                    onChange={(val) =>
                        onChange({
                            ...filters,
                            siteId: val === '' ? null : Number(val),
                        })
                    }
                    options={siteOptions}
                    placeholder="Tous les sites"
                    icon={<MapPin className="w-4 h-4" />}
                    size="sm"
                    variant="outlined"
                    searchPlaceholder="Rechercher un site..."
                    emptyMessage="Aucun site trouvé"
                />
            </div>

            {/* Month navigation — formatted display */}
            <div className="flex items-center gap-0 bg-white border-2 border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors border-r border-slate-100"
                    title="Mois précédent"
                >
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <div className="flex items-center gap-2 px-4 py-2 min-w-[180px] justify-center select-none">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-slate-700">{formattedMonth}</span>
                </div>
                <button
                    onClick={() => navigateMonth(1)}
                    className="p-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors border-l border-slate-100"
                    title="Mois suivant"
                >
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
            </div>

            {/* Reset to current month */}
            {!isCurrentMonth && (
                <button
                    onClick={() => onChange({ ...filters, mois: getCurrentMonth() })}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-sm"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Aujourd&apos;hui
                </button>
            )}
        </div>
    );
}
