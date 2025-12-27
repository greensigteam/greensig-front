import { useState, useEffect, useRef, type FC } from 'react';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { Repeat, ChevronDown, X } from 'lucide-react';
import { FrequenceRecurrence } from '../../types/planning';

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
                className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-300 rounded-lg hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-left"
            >
                <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{summary}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
                <div className="absolute z-[150] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl py-1 max-h-64 overflow-y-auto">
                    {RECURRENCE_PRESETS.map((preset) => (
                        <button
                            key={preset.id || 'none'}
                            type="button"
                            onClick={() => handlePresetClick(preset.id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
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
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Récurrence personnalisée</h3>
                            <button
                                onClick={() => setShowCustomModal(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-4">
                            {/* Interval + Frequency */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Se répète tous les</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        value={customParams.interval}
                                        onChange={(e) => setCustomParams({ ...customParams, interval: Number(e.target.value) })}
                                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                    <select
                                        value={customParams.frequence}
                                        onChange={(e) => setCustomParams({ ...customParams, frequence: e.target.value as FrequenceRecurrence })}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="daily">Jours</option>
                                        <option value="weekly">Semaines</option>
                                        <option value="monthly">Mois</option>
                                    </select>
                                </div>
                            </div>

                            {/* Days of Week (for weekly) */}
                            {customParams.frequence === 'weekly' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Se répète le</label>
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
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                        isSelected
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Se termine</label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            id="end-after"
                                            name="end-type"
                                            checked={!!customParams.nombre_occurrences}
                                            onChange={() => setCustomParams({ ...customParams, nombre_occurrences: 5, date_fin: undefined })}
                                            className="w-4 h-4 text-emerald-600"
                                        />
                                        <label htmlFor="end-after" className="text-sm text-gray-700">Après</label>
                                        <input
                                            type="number"
                                            min="1"
                                            disabled={!customParams.nombre_occurrences}
                                            value={customParams.nombre_occurrences || ''}
                                            onChange={(e) => setCustomParams({ ...customParams, nombre_occurrences: Number(e.target.value) })}
                                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                                        />
                                        <span className="text-sm text-gray-600">occurrence(s)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            id="end-on"
                                            name="end-type"
                                            checked={!!customParams.date_fin}
                                            onChange={() => {
                                                const defaultEndDate = addDays(new Date(startDate), 7).toISOString().slice(0, 10);
                                                setCustomParams({ ...customParams, date_fin: defaultEndDate, nombre_occurrences: undefined });
                                            }}
                                            className="w-4 h-4 text-emerald-600"
                                        />
                                        <label htmlFor="end-on" className="text-sm text-gray-700">Le</label>
                                        <input
                                            type="date"
                                            disabled={!customParams.date_fin}
                                            value={customParams.date_fin?.slice(0, 10) || ''}
                                            onChange={(e) => setCustomParams({ ...customParams, date_fin: e.target.value })}
                                            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Summary Preview */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                <p className="text-sm text-emerald-800 font-medium">
                                    {getRecurrenceSummary(customParams, startDate)}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-4 border-t">
                            <button
                                type="button"
                                onClick={() => setShowCustomModal(false)}
                                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleCustomSave}
                                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecurrenceSelector;
