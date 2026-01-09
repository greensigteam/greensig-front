import { useState, useEffect, useRef, type FC } from 'react';
import { addDays, addWeeks, addMonths, format } from 'date-fns';
import { Repeat, ChevronDown, X, Hash, Calendar } from 'lucide-react';
import { FrequenceRecurrence } from '../../types/planning';
import { PremiumInput, PremiumSelect } from '../modals/PremiumFormComponents';

// ============================================================================
// TYPES
// ============================================================================

export interface RecurrenceParams {
    frequence: FrequenceRecurrence;
    interval: number;
    jours?: string[]; // Pour weekly: ['MO', 'TU', ...]
    nombre_occurrences?: number;
    date_fin?: string;
}

interface RecurrenceSelectorProps {
    value: RecurrenceParams | null;
    onChange: (value: RecurrenceParams | null) => void;
    startDate: string; // ISO datetime
}

// ============================================================================
// PRESETS (Google Calendar style)
// ============================================================================

const RECURRENCE_PRESETS = [
    { id: null, label: 'Ne se répète pas' },
    { id: 'daily', label: 'Quotidien' },
    { id: 'weekdays', label: 'Tous les jours ouvrables (lun-ven)' },
    { id: 'weekly', label: 'Hebdomadaire' },
    { id: 'monthly', label: 'Mensuel' },
    { id: 'custom', label: 'Personnalisé...' },
] as const;

const DAYS_OF_WEEK = [
    { id: 'MO', label: 'Lun', fullLabel: 'Lundi' },
    { id: 'TU', label: 'Mar', fullLabel: 'Mardi' },
    { id: 'WE', label: 'Mer', fullLabel: 'Mercredi' },
    { id: 'TH', label: 'Jeu', fullLabel: 'Jeudi' },
    { id: 'FR', label: 'Ven', fullLabel: 'Vendredi' },
    { id: 'SA', label: 'Sam', fullLabel: 'Samedi' },
    { id: 'SU', label: 'Dim', fullLabel: 'Dimanche' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRecurrenceSummary(params: RecurrenceParams | null, startDate: string): string {
    if (!params) return 'Ne se répète pas';

    const { frequence, interval, jours, nombre_occurrences, date_fin } = params;

    // Build frequency text
    let freqText = '';
    if (frequence === 'daily') {
        freqText = interval === 1 ? 'tous les jours' : `tous les ${interval} jours`;
    } else if (frequence === 'weekly') {
        if (interval === 1) {
            if (jours && jours.length > 0) {
                const dayLabels = jours.map(d => DAYS_OF_WEEK.find(day => day.id === d)?.label).join(', ');
                freqText = `toutes les semaines le ${dayLabels}`;
            } else {
                freqText = 'toutes les semaines';
            }
        } else {
            freqText = `toutes les ${interval} semaines`;
        }
    } else if (frequence === 'monthly') {
        freqText = interval === 1 ? 'tous les mois' : `tous les ${interval} mois`;
    }

    // Build end text
    let endText = '';
    if (nombre_occurrences) {
        endText = `, ${nombre_occurrences} fois`;
    } else if (date_fin) {
        const endDateObj = new Date(date_fin);
        endText = `, jusqu'au ${endDateObj.toLocaleDateString('fr-FR')}`;
    }

    return `Se répète ${freqText}${endText}`;
}

function applyPreset(presetId: string | null, startDate: string): RecurrenceParams | null {
    if (!presetId) return null;

    const start = new Date(startDate);
    const dayOfWeek = start.getDay(); // 0 = Sunday, 1 = Monday, ...
    const dayCode = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][dayOfWeek];

    switch (presetId) {
        case 'daily':
            return {
                frequence: 'daily',
                interval: 1,
                nombre_occurrences: 7,
            };
        case 'weekdays':
            return {
                frequence: 'weekly',
                interval: 1,
                jours: ['MO', 'TU', 'WE', 'TH', 'FR'],
                nombre_occurrences: 5,
            };
        case 'weekly':
            return {
                frequence: 'weekly',
                interval: 1,
                jours: [dayCode],
                nombre_occurrences: 4,
            };
        case 'monthly':
            return {
                frequence: 'monthly',
                interval: 1,
                nombre_occurrences: 3,
            };
        default:
            return null;
    }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const RecurrenceSelector: FC<RecurrenceSelectorProps> = ({
    value,
    onChange,
    startDate,
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customParams, setCustomParams] = useState<RecurrenceParams>(
        value || {
            frequence: 'weekly',
            interval: 1,
            jours: [],
            nombre_occurrences: 4,
        }
    );

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close dropdown
    useEffect(() => {
        if (!showDropdown) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

    const summary = getRecurrenceSummary(value, startDate);

    const handlePresetClick = (presetId: string | null) => {
        if (presetId === 'custom') {
            setShowCustomModal(true);
        } else {
            const preset = applyPreset(presetId, startDate);
            onChange(preset);
        }
        setShowDropdown(false);
    };

    const handleCustomSave = () => {
        onChange(customParams);
        setShowCustomModal(false);
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className={`w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-lg focus:outline-none transition-all text-left shadow-sm ${
                    showDropdown
                        ? 'border-emerald-500 ring-4 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                }`}
            >
                <div className="flex items-center gap-3">
                    <Repeat className={`w-4 h-4 transition-colors ${showDropdown ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-medium ${value ? 'text-slate-900' : 'text-slate-500'}`}>{summary}</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-all ${showDropdown ? 'rotate-180 text-emerald-600' : 'text-slate-400'}`} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
                <div className="absolute z-[150] mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {RECURRENCE_PRESETS.map((preset) => (
                        <button
                            key={preset.id || 'none'}
                            type="button"
                            onClick={() => handlePresetClick(preset.id)}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Custom Modal */}
            {showCustomModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <Repeat className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Récurrence personnalisée</h3>
                                    <p className="text-xs text-slate-500">Configurez la périodicité de la tâche</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCustomModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Interval + Frequency */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-800 mb-3">Se répète tous les</label>
                                <div className="grid grid-cols-[100px_1fr] gap-3">
                                    <PremiumInput
                                        type="number"
                                        value={customParams.interval}
                                        onChange={(value) => setCustomParams({ ...customParams, interval: Number(value) || 1 })}
                                        min={1}
                                        icon={<Hash className="w-4 h-4" />}
                                        variant="outlined"
                                        size="md"
                                    />
                                    <PremiumSelect
                                        value={customParams.frequence}
                                        onChange={(value) => setCustomParams({ ...customParams, frequence: value as FrequenceRecurrence })}
                                        options={[
                                            { value: 'daily', label: 'Jours' },
                                            { value: 'weekly', label: 'Semaines' },
                                            { value: 'monthly', label: 'Mois' }
                                        ]}
                                        variant="outlined"
                                        size="md"
                                    />
                                </div>
                            </div>

                            {/* Days of Week (for weekly) */}
                            {customParams.frequence === 'weekly' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-800 mb-3">Se répète le</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OF_WEEK.map((day) => {
                                            const isSelected = customParams.jours?.includes(day.id);
                                            return (
                                                <button
                                                    key={day.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const currentDays = customParams.jours || [];
                                                        const newDays = isSelected
                                                            ? currentDays.filter(d => d !== day.id)
                                                            : [...currentDays, day.id];
                                                        setCustomParams({ ...customParams, jours: newDays });
                                                    }}
                                                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                                        isSelected
                                                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                                                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                                                    }`}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* End condition */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-800 mb-3">Se termine</label>
                                <div className="space-y-3">
                                    {/* Option: Après X occurrences */}
                                    <div
                                        onClick={() => !customParams.nombre_occurrences && setCustomParams({ ...customParams, nombre_occurrences: 5, date_fin: undefined })}
                                        className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                            !!customParams.nombre_occurrences
                                                ? 'border-emerald-500 bg-emerald-50/50'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                                !!customParams.nombre_occurrences
                                                    ? 'border-emerald-600'
                                                    : 'border-slate-300'
                                            }`}>
                                                {!!customParams.nombre_occurrences && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">Après</span>
                                            <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                                                <PremiumInput
                                                    type="number"
                                                    min={1}
                                                    disabled={!customParams.nombre_occurrences}
                                                    value={customParams.nombre_occurrences || ''}
                                                    onChange={(value) => setCustomParams({ ...customParams, nombre_occurrences: Number(value) || undefined })}
                                                    icon={<Hash className="w-4 h-4" />}
                                                    variant="outlined"
                                                    size="md"
                                                />
                                            </div>
                                            <span className="text-sm text-slate-500 whitespace-nowrap">occurrence(s)</span>
                                        </div>
                                    </div>

                                    {/* Option: Jusqu'à une date */}
                                    <div
                                        onClick={() => {
                                            if (!customParams.date_fin) {
                                                const defaultEndDate = format(addDays(new Date(startDate), 7), 'yyyy-MM-dd');
                                                setCustomParams({ ...customParams, date_fin: defaultEndDate, nombre_occurrences: undefined });
                                            }
                                        }}
                                        className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                            !!customParams.date_fin
                                                ? 'border-emerald-500 bg-emerald-50/50'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                                !!customParams.date_fin
                                                    ? 'border-emerald-600'
                                                    : 'border-slate-300'
                                            }`}>
                                                {!!customParams.date_fin && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">Le</span>
                                            <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                                                <PremiumInput
                                                    type="date"
                                                    disabled={!customParams.date_fin}
                                                    value={customParams.date_fin?.slice(0, 10) || ''}
                                                    onChange={(value) => setCustomParams({ ...customParams, date_fin: value })}
                                                    icon={<Calendar className="w-4 h-4" />}
                                                    variant="outlined"
                                                    size="md"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Preview */}
                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <Repeat className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Aperçu</p>
                                        <p className="text-sm text-emerald-900 font-medium leading-relaxed">
                                            {getRecurrenceSummary(customParams, startDate)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => setShowCustomModal(false)}
                                className="flex-1 px-4 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleCustomSave}
                                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm"
                            >
                                Appliquer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecurrenceSelector;
