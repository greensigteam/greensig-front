import { useState, useEffect, useMemo, type FC } from 'react';
import { format, addDays, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    RefreshCw, Calendar, Clock, AlertTriangle, CheckCircle2, X, Plus, Info
} from 'lucide-react';
import { PremiumInput, PremiumSelect } from '../modals/PremiumFormComponents';

// ============================================================================
// TYPES
// ============================================================================

export interface RecurrenceConfig {
    enabled: boolean;
    mode: 'frequency' | 'custom' | 'dates';
    // Mode fréquence
    frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    // Mode custom
    decalage_jours?: number;
    // Mode dates
    dates_cibles?: string[];
    // Paramètres communs
    nombre_occurrences?: number;
    date_fin_recurrence?: string;
    conserver_equipes: boolean;
    conserver_objets: boolean;
}

interface RecurrenceSelectorProps {
    dateDebut: string; // Format YYYY-MM-DD
    dateFin: string;   // Format YYYY-MM-DD
    onChange: (config: RecurrenceConfig) => void;
    value?: RecurrenceConfig;
    disabled?: boolean; // Désactive le composant (mode édition)
}

// Mapping fréquence -> décalage en jours
const FREQUENCE_MAPPING = {
    'DAILY': { label: 'Quotidien (tous les jours)', decalage: 1 },
    'WEEKLY': { label: 'Hebdomadaire (toutes les semaines)', decalage: 7 },
    'MONTHLY': { label: 'Mensuel (tous les mois)', decalage: 30 },
    'YEARLY': { label: 'Annuel (tous les ans)', decalage: 365 }
};

// ============================================================================
// COMPONENT
// ============================================================================

export const RecurrenceSelector: FC<RecurrenceSelectorProps> = ({
    dateDebut,
    dateFin,
    onChange,
    value,
    disabled = false
}) => {
    const [enabled, setEnabled] = useState(value?.enabled ?? false);
    const [mode, setMode] = useState<'frequency' | 'custom' | 'dates'>(value?.mode ?? 'frequency');
    const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>(
        value?.frequency ?? 'WEEKLY'
    );
    const [decalageJours, setDecalageJours] = useState<number>(value?.decalage_jours ?? 7);
    const [datesCibles, setDatesCibles] = useState<string[]>(value?.dates_cibles ?? []);
    const [newDate, setNewDate] = useState('');

    // Choix : nombre d'occurrences OU date de fin
    const [limitMode, setLimitMode] = useState<'occurrences' | 'date' | 'none'>(
        value?.nombre_occurrences ? 'occurrences' :
        value?.date_fin_recurrence ? 'date' :
        'none'
    );
    const [nombreOccurrences, setNombreOccurrences] = useState<number>(value?.nombre_occurrences ?? 10);
    const [dateFinRecurrence, setDateFinRecurrence] = useState<string>(
        value?.date_fin_recurrence ?? format(addMonths(new Date(), 6), 'yyyy-MM-dd')
    );

    const [conserverEquipes, setConserverEquipes] = useState(value?.conserver_equipes ?? true);
    const [conserverObjets, setConserverObjets] = useState(value?.conserver_objets ?? true);

    // Calculer la durée de la tâche en jours
    const dureeTache = useMemo(() => {
        const debut = new Date(dateDebut);
        const fin = new Date(dateFin);
        const diffTime = Math.abs(fin.getTime() - debut.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure les deux jours
        return diffDays;
    }, [dateDebut, dateFin]);

    // Obtenir le décalage selon le mode
    const decalageEffectif = useMemo(() => {
        if (mode === 'custom') return decalageJours;
        if (mode === 'frequency') return FREQUENCE_MAPPING[frequency].decalage;
        return 0;
    }, [mode, frequency, decalageJours]);

    // Vérifier la compatibilité
    const compatibilite = useMemo(() => {
        if (mode === 'dates') return { valide: true, message: null };

        if (decalageEffectif < dureeTache) {
            return {
                valide: false,
                message: `Le décalage (${decalageEffectif} jour${decalageEffectif > 1 ? 's' : ''}) doit être supérieur ou égal à la durée de la tâche (${dureeTache} jour${dureeTache > 1 ? 's' : ''}) pour éviter le chevauchement des occurrences.`
            };
        }

        return { valide: true, message: null };
    }, [decalageEffectif, dureeTache, mode]);

    // Calculer l'aperçu des occurrences
    const apercuOccurrences = useMemo(() => {
        if (!enabled || mode === 'dates') return null;

        const debut = new Date(dateDebut);
        const occurrences: string[] = [];
        let occurrence = 1;
        const maxOccurrences = limitMode === 'occurrences' ? nombreOccurrences : 100;
        const dateLimite = limitMode === 'date' ? new Date(dateFinRecurrence) : addMonths(new Date(), 12);

        while (occurrence <= maxOccurrences && occurrences.length < 5) { // Montrer max 5 exemples
            const nouvelleDate = addDays(debut, decalageEffectif * occurrence);

            if (nouvelleDate > dateLimite) break;

            occurrences.push(format(nouvelleDate, 'dd/MM/yyyy', { locale: fr }));
            occurrence++;
        }

        return occurrences;
    }, [enabled, mode, dateDebut, decalageEffectif, limitMode, nombreOccurrences, dateFinRecurrence]);

    // Mettre à jour le parent à chaque changement
    useEffect(() => {
        if (!enabled) {
            onChange({
                enabled: false,
                mode,
                conserver_equipes: conserverEquipes,
                conserver_objets: conserverObjets
            });
            return;
        }

        const config: RecurrenceConfig = {
            enabled: true,
            mode,
            conserver_equipes: conserverEquipes,
            conserver_objets: conserverObjets
        };

        if (mode === 'frequency') {
            config.frequency = frequency;
        } else if (mode === 'custom') {
            config.decalage_jours = decalageJours;
        } else if (mode === 'dates') {
            config.dates_cibles = datesCibles;
        }

        if (limitMode === 'occurrences') {
            config.nombre_occurrences = nombreOccurrences;
        } else if (limitMode === 'date') {
            config.date_fin_recurrence = dateFinRecurrence;
        }

        onChange(config);
    }, [enabled, mode, frequency, decalageJours, datesCibles, limitMode, nombreOccurrences, dateFinRecurrence, conserverEquipes, conserverObjets]);

    if (!enabled) {
        return (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${disabled ? 'bg-gray-200' : 'bg-emerald-100'} rounded-lg flex items-center justify-center`}>
                            <RefreshCw className={`w-5 h-5 ${disabled ? 'text-gray-400' : 'text-emerald-600'}`} />
                        </div>
                        <div>
                            <h4 className={`font-semibold ${disabled ? 'text-gray-500' : 'text-gray-900'}`}>Récurrence</h4>
                            <p className="text-sm text-gray-500">
                                {disabled ? 'Non disponible en mode modification' : 'Créer plusieurs tâches automatiquement'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setEnabled(true)}
                        disabled={disabled}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                            disabled
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                    >
                        Activer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="border-2 border-emerald-200 rounded-xl p-5 bg-gradient-to-br from-emerald-50 to-teal-50">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">Récurrence activée</h4>
                        <p className="text-xs text-gray-600">Plusieurs tâches seront créées automatiquement</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setEnabled(false)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Désactiver la récurrence"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4">
                {/* Mode de récurrence */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mode de récurrence
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setMode('frequency')}
                            className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                                mode === 'frequency'
                                    ? 'border-emerald-500 bg-white text-emerald-700 shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            <Clock className="w-4 h-4 mx-auto mb-1" />
                            Fréquence
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('custom')}
                            className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                                mode === 'custom'
                                    ? 'border-emerald-500 bg-white text-emerald-700 shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            <RefreshCw className="w-4 h-4 mx-auto mb-1" />
                            Personnalisé
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('dates')}
                            className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                                mode === 'dates'
                                    ? 'border-emerald-500 bg-white text-emerald-700 shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            <Calendar className="w-4 h-4 mx-auto mb-1" />
                            Dates
                        </button>
                    </div>
                </div>

                {/* Configuration selon le mode */}
                <div className="bg-white rounded-lg p-4 border border-emerald-100">
                    {mode === 'frequency' && (
                        <PremiumSelect
                            value={frequency}
                            onChange={(val) => setFrequency(val as typeof frequency)}
                            options={Object.entries(FREQUENCE_MAPPING).map(([key, data]) => ({
                                value: key,
                                label: data.label
                            }))}
                            label="Fréquence"
                            icon={<Clock className="w-4 h-4" />}
                            variant="outlined"
                            size="md"
                        />
                    )}

                    {mode === 'custom' && (
                        <PremiumInput
                            type="number"
                            value={decalageJours.toString()}
                            onChange={(val) => setDecalageJours(parseInt(val) || 1)}
                            label="Décalage en jours"
                            icon={<RefreshCw className="w-4 h-4" />}
                            variant="outlined"
                            size="md"
                            hint={`La tâche sera répétée tous les ${decalageJours} jour${decalageJours > 1 ? 's' : ''}`}
                        />
                    )}

                    {mode === 'dates' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <PremiumInput
                                    type="date"
                                    value={newDate}
                                    onChange={setNewDate}
                                    label="Ajouter une date"
                                    icon={<Calendar className="w-4 h-4" />}
                                    variant="outlined"
                                    size="md"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (newDate && !datesCibles.includes(newDate)) {
                                            setDatesCibles([...datesCibles, newDate].sort());
                                            setNewDate('');
                                        }
                                    }}
                                    disabled={!newDate || datesCibles.includes(newDate)}
                                    className="mt-7 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            {datesCibles.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-600">
                                        Dates sélectionnées ({datesCibles.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {datesCibles.map(date => (
                                            <span
                                                key={date}
                                                className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full"
                                            >
                                                {format(new Date(date), 'dd/MM/yyyy')}
                                                <button
                                                    type="button"
                                                    onClick={() => setDatesCibles(datesCibles.filter(d => d !== date))}
                                                    className="hover:text-red-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Limite (nombre d'occurrences ou date de fin) - Seulement pour frequency et custom */}
                {mode !== 'dates' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Générer jusqu'à
                        </label>
                        <div className="space-y-3">
                            {/* Choix du mode */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setLimitMode('occurrences')}
                                    className={`flex-1 p-2 rounded-lg border-2 transition-all text-sm font-medium ${
                                        limitMode === 'occurrences'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    Nombre fixe
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLimitMode('date')}
                                    className={`flex-1 p-2 rounded-lg border-2 transition-all text-sm font-medium ${
                                        limitMode === 'date'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    Date limite
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLimitMode('none')}
                                    className={`flex-1 p-2 rounded-lg border-2 transition-all text-sm font-medium ${
                                        limitMode === 'none'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    Fin d'année
                                </button>
                            </div>

                            {/* Configuration selon le mode */}
                            <div className="bg-white rounded-lg p-3 border border-emerald-100">
                                {limitMode === 'occurrences' && (
                                    <PremiumInput
                                        type="number"
                                        value={nombreOccurrences.toString()}
                                        onChange={(val) => setNombreOccurrences(parseInt(val) || 1)}
                                        label="Nombre d'occurrences"
                                        icon={<RefreshCw className="w-4 h-4" />}
                                        variant="outlined"
                                        size="sm"
                                        hint="Nombre de tâches à créer (max: 100)"
                                    />
                                )}

                                {limitMode === 'date' && (
                                    <PremiumInput
                                        type="date"
                                        value={dateFinRecurrence}
                                        onChange={setDateFinRecurrence}
                                        label="Date de fin de récurrence"
                                        icon={<Calendar className="w-4 h-4" />}
                                        variant="outlined"
                                        size="sm"
                                        hint="Générer des tâches jusqu'à cette date"
                                    />
                                )}

                                {limitMode === 'none' && (
                                    <div className="flex items-start gap-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
                                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <p>
                                            Les tâches seront générées jusqu'au <strong>31 décembre {new Date().getFullYear()}</strong> (par défaut).
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Validation */}
                {!compatibilite.valide && (
                    <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium mb-1">Incompatibilité détectée</p>
                            <p>{compatibilite.message}</p>
                        </div>
                    </div>
                )}

                {/* Aperçu des occurrences */}
                {compatibilite.valide && apercuOccurrences && apercuOccurrences.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-medium text-blue-900">
                                Aperçu des prochaines occurrences
                            </p>
                        </div>
                        <div className="space-y-1">
                            {apercuOccurrences.map((date, idx) => (
                                <div key={idx} className="text-xs text-blue-700 flex items-center gap-2">
                                    <span className="w-4 text-right font-medium">#{idx + 1}</span>
                                    <Calendar className="w-3 h-3" />
                                    <span>{date}</span>
                                </div>
                            ))}
                            {limitMode === 'none' && (
                                <p className="text-xs text-blue-600 italic mt-2">
                                    ... et toutes les occurrences jusqu'au 31/12/{new Date().getFullYear()}
                                </p>
                            )}
                            {limitMode === 'date' && (
                                <p className="text-xs text-blue-600 italic mt-2">
                                    ... et toutes les occurrences jusqu'au {format(new Date(dateFinRecurrence), 'dd/MM/yyyy')}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Options */}
                <div className="border-t border-emerald-200 pt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Options</p>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={conserverEquipes}
                            onChange={(e) => setConserverEquipes(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">Conserver les équipes assignées</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={conserverObjets}
                            onChange={(e) => setConserverObjets(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">Conserver les objets liés</span>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default RecurrenceSelector;
