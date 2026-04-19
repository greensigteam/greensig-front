import React, { useState, useMemo } from 'react';
import {
  Calendar,
  X,
  CheckSquare,
  Clock,
  Settings2,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { DayPicker, Matcher } from 'react-day-picker';
import { fr } from 'date-fns/locale/fr';
import { format } from 'date-fns';
import 'react-day-picker/style.css';

interface DaySelection {
  date: string; // YYYY-MM-DD
  dayName: string;
  dayOfWeek: number;
  selected: boolean;
  heure_debut: string;
  heure_fin: string;
}

interface ExistingDistribution {
  date: string;
  heure_debut: string;
  heure_fin: string;
}

interface SelectDaysModalProps {
  dateDebut: Date;
  dateFin: Date;
  onConfirm: (selectedDays: DaySelection[]) => void | Promise<void>;
  onCancel: () => void;
  initialSelection?: string[]; // Liste des dates déjà sélectionnées (YYYY-MM-DD)
  protectedDates?: string[]; // ✅ NOUVEAU: Dates qui ne peuvent pas être désélectionnées (réalisées)
  existingDistributions?: ExistingDistribution[]; // ✅ NOUVEAU: Distributions existantes avec leurs heures
}

const JOUR_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const SelectDaysModal: React.FC<SelectDaysModalProps> = ({
  dateDebut,
  dateFin,
  onConfirm,
  onCancel,
  initialSelection = [],
  protectedDates = [], // ✅ NOUVEAU: Dates protégées
  existingDistributions = [], // ✅ NOUVEAU: Distributions existantes avec heures
}) => {
  const { showToast } = useToast();
  const [defaultHeureDebut, setDefaultHeureDebut] = useState('08:00');
  const [defaultHeureFin, setDefaultHeureFin] = useState('17:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculerHeures = (debut: string, fin: string): number => {
    if (!debut || !fin) return 0;
    const [hDebut, mDebut] = debut.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);
    const minutesDebut = (hDebut ?? 0) * 60 + (mDebut ?? 0);
    const minutesFin = (hFin ?? 0) * 60 + (mFin ?? 0);
    const diffMinutes = minutesFin - minutesDebut;
    return Math.round((diffMinutes / 60) * 100) / 100;
  };

  const allDays = useMemo(() => {
    const days: DaySelection[] = [];
    const currentDate = new Date(dateDebut);
    const endDate = new Date(dateFin);

    // Créer un map des distributions existantes pour un accès rapide
    const existingDistMap = new Map(existingDistributions.map((d) => [d.date, d]));

    while (currentDate <= endDate) {
      const dateString = format(currentDate, 'yyyy-MM-dd');
      const dayOfWeek = currentDate.getDay();
      const existing = existingDistMap.get(dateString);

      days.push({
        date: dateString,
        dayName: JOUR_NAMES[dayOfWeek] ?? '',
        dayOfWeek,
        selected: initialSelection.includes(dateString),
        // Utiliser les heures de la distribution existante si disponible, sinon '08:00' et '17:00' par défaut
        // Les horaires par défaut configurables sont appliqués uniquement lors de la sélection (handleSelect)
        heure_debut: existing?.heure_debut ?? '08:00',
        heure_fin: existing?.heure_fin ?? '17:00',
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
  }, [dateDebut, dateFin, initialSelection, existingDistributions]);

  const [selectedDays, setSelectedDays] = useState<DaySelection[]>(allDays);

  // ✅ Fonction pour appliquer les horaires par défaut à tous les jours sélectionnés (sauf les protégées)
  const appliquerHorairesParDefaut = () => {
    setSelectedDays((prev) =>
      prev.map((day) => {
        // Ne pas modifier les dates protégées (distributions existantes)
        if (protectedDates.includes(day.date)) {
          return day;
        }
        // Appliquer les horaires par défaut uniquement aux nouvelles dates sélectionnées
        return day.selected
          ? { ...day, heure_debut: defaultHeureDebut, heure_fin: defaultHeureFin }
          : day;
      }),
    );
  };

  // ❌ SUPPRIMÉ: Application automatique des horaires par défaut
  // Les horaires par défaut s'appliquent UNIQUEMENT :
  // 1. Aux nouveaux jours lors de la sélection initiale (via handleSelect)
  // 2. Manuellement via le bouton "Appliquer à la sélection"

  const selectedDates = useMemo(() => {
    return selectedDays.filter((d) => d.selected).map((d) => new Date(d.date + 'T00:00:00'));
  }, [selectedDays]);

  const stats = useMemo(() => {
    const selected = selectedDays.filter((d) => d.selected);
    const totalHeures = selected.reduce((sum, day) => {
      return sum + calculerHeures(day.heure_debut, day.heure_fin);
    }, 0);

    return {
      count: selected.length,
      total: allDays.length,
      totalHeures: totalHeures.toFixed(2),
      moyenneHeures: selected.length > 0 ? (totalHeures / selected.length).toFixed(2) : '0',
    };
  }, [selectedDays, allDays]);

  const handleSelect = (days: Date[] | undefined) => {
    const selectedDatesList = days || [];
    const selectedDateStrings = selectedDatesList.map((d) => format(d, 'yyyy-MM-dd'));

    setSelectedDays((prev) =>
      prev.map((day) => {
        const wasSelected = day.selected;
        const isNowSelected = selectedDateStrings.includes(day.date);

        // Si le jour vient d'être sélectionné (transition false -> true), appliquer les horaires par défaut
        // Sinon, garder les horaires actuels
        if (!wasSelected && isNowSelected) {
          return {
            ...day,
            selected: true,
            heure_debut: defaultHeureDebut,
            heure_fin: defaultHeureFin,
          };
        }

        // Pour les autres cas (déjà sélectionné ou désélectionné), garder les horaires existants
        return {
          ...day,
          selected: isNowSelected,
        };
      }),
    );
  };

  const handleSelectJoursOuvres = () => {
    setSelectedDays((prev) =>
      prev.map((day) => {
        const shouldBeSelected = true; // Sélectionner tous les jours (y compris weekends)
        const wasSelected = day.selected;

        // Si le jour vient d'être sélectionné, appliquer les horaires par défaut
        if (!wasSelected && shouldBeSelected) {
          return {
            ...day,
            selected: true,
            heure_debut: defaultHeureDebut,
            heure_fin: defaultHeureFin,
          };
        }

        // Sinon, garder les horaires existants
        return {
          ...day,
          selected: shouldBeSelected,
        };
      }),
    );
  };

  const handleSelectAll = () => {
    setSelectedDays((prev) =>
      prev.map((day) => {
        const shouldBeSelected = true; // Sélectionner tous les jours (y compris weekends)
        const wasSelected = day.selected;

        // Si le jour vient d'être sélectionné, appliquer les horaires par défaut
        if (!wasSelected && shouldBeSelected) {
          return {
            ...day,
            selected: true,
            heure_debut: defaultHeureDebut,
            heure_fin: defaultHeureFin,
          };
        }

        // Sinon, garder les horaires existants
        return {
          ...day,
          selected: shouldBeSelected,
        };
      }),
    );
  };

  const handleDeselectAll = () => {
    setSelectedDays((prev) =>
      prev.map((day) => ({
        ...day,
        selected: false,
      })),
    );
  };

  const handleConfirm = async () => {
    const selected = selectedDays.filter((d) => d.selected);
    setIsSubmitting(true);
    try {
      await onConfirm(selected);
      // Le parent gère la fermeture du modal en cas de succès
    } catch (error) {
      // En cas d'erreur, on reste sur le modal et on réinitialise l'état
      showToast('Erreur lors de la confirmation des jours sélectionnés', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = (dateString: string) => {
    // ✅ NOUVEAU: Empêcher la désélection des dates protégées
    if (
      protectedDates.includes(dateString) &&
      selectedDays.find((d) => d.date === dateString)?.selected
    ) {
      return; // Ignore la désélection si la date est protégée
    }

    setSelectedDays((prev) =>
      prev.map((day) => (day.date === dateString ? { ...day, selected: !day.selected } : day)),
    );
  };

  const modifiers: Record<string, Matcher> = {
    // ✅ MODIFIÉ: Suppression des contraintes weekend (sunday/saturday)
    protected: (date: Date) => protectedDates.includes(format(date, 'yyyy-MM-dd')),
  };

  const modifiersClassNames = {
    protected: 'rdp-day-protected',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col mx-2 sm:mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-emerald-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Sélection des jours de travail</h2>
              <p className="text-sm text-gray-500 font-medium">
                Du {dateDebut.toLocaleDateString('fr-FR')} au {dateFin.toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-2 hover:bg-slate-100 rounded-full transition-all duration-200 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isSubmitting ? 'Ajout en cours...' : 'Fermer'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Config */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
              <span className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <strong className="text-emerald-900">{stats.count}</strong>
                <span className="text-emerald-700/70">jours sélectionnés</span>
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <strong className="text-emerald-900">{stats.totalHeures}h</strong>
                <span className="text-emerald-700/70">au total</span>
              </span>
              <span className="text-emerald-700/70">
                Moyenne: <strong className="text-emerald-900">{stats.moyenneHeures}h/jour</strong>
              </span>
            </div>

            {/* Config horaires par défaut */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
              <Settings2 className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600 font-medium">Horaires par défaut:</span>
              <input
                type="time"
                value={defaultHeureDebut}
                onChange={(e) => setDefaultHeureDebut(e.target.value)}
                disabled={isSubmitting}
                className="px-2 py-1 border border-emerald-200 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-slate-400">à</span>
              <input
                type="time"
                value={defaultHeureFin}
                onChange={(e) => setDefaultHeureFin(e.target.value)}
                disabled={isSubmitting}
                className="px-2 py-1 border border-emerald-200 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-emerald-700 font-bold ml-2">
                ({calculerHeures(defaultHeureDebut, defaultHeureFin).toFixed(2)}h)
              </span>
              {stats.count > 0 && (
                <button
                  type="button"
                  onClick={appliquerHorairesParDefaut}
                  disabled={isSubmitting}
                  className="ml-2 px-3 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Appliquer ces horaires à tous les jours sélectionnés"
                >
                  <RefreshCw className="w-3 h-3" />
                  Appliquer à la sélection
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSelectJoursOuvres}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckSquare className="w-4 h-4" />
              Jours ouvrés
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tous les jours
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Vider
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          <div
            className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto flex items-center justify-center ${isSubmitting ? 'pointer-events-none opacity-60' : ''}`}
          >
            <style>{`
              .rdp {
                --rdp-cell-size: 40px;
                --rdp-accent-color: #059669;
                --rdp-background-color: #ecfdf5;
                margin: 0;
                width: 100%;
                max-width: 650px;
              }

              @media (min-width: 640px) {
                .rdp {
                  --rdp-cell-size: 55px;
                }
              }

              @media (min-width: 1024px) {
                .rdp {
                  --rdp-cell-size: 75px;
                }
              }

              .rdp-selected,
              .rdp-day-selected {
                background-color: #059669 !important;
                color: white !important;
                font-weight: 600;
              }

              .rdp-selected:hover,
              .rdp-day-selected:hover {
                background-color: #047857 !important;
              }

              /* Suppression totale des cercles bleus (focus, today, selection) */
              .rdp-day_button,
              .rdp-day_button:focus,
              .rdp-day_button:focus-visible,
              .rdp-day_button:active,
              .rdp-day,
              .rdp-selected,
              .rdp-today {
                outline: none !important;
                border: none !important;
                box-shadow: none !important;
              }

              .rdp-day_button::after,
              .rdp-day_button::before,
              .rdp-day::after,
              .rdp-day::before {
                display: none !important;
              }

              /* Couleur pour "Aujourd'hui" quand non sélectionné */
              .rdp-today:not(.rdp-selected) {
                color: #059669 !important;
                font-weight: 700 !important;
              }

              /* Styles weekend supprimés - pas de contraintes sur les weekends */

              .rdp-day-outside {
                opacity: 0.3;
                background-color: transparent !important;
                pointer-events: none;
              }

              /* ✅ NOUVEAU: Style pour les dates protégées (réalisées) */
              .rdp-day-protected {
                background-color: #d1fae5 !important;
                border: 2px solid #10b981 !important;
                color: #065f46 !important;
                font-weight: 700 !important;
                cursor: not-allowed !important;
                position: relative;
              }

              .rdp-day-protected::after {
                content: '🔒';
                position: absolute;
                top: 2px;
                right: 2px;
                font-size: 10px;
              }

              .rdp-day:not(.rdp-day-outside) {
                cursor: pointer;
              }

              .rdp-day:not(.rdp-day-selected):not(.rdp-day-outside):hover {
                background-color: #ecfdf5;
                border: 2px solid #10b981;
                color: #065f46;
              }

              .rdp-caption {
                font-weight: 700;
                font-size: 1.5rem;
                color: #1f2937;
                margin-bottom: 1rem;
              }

              .rdp-head_cell {
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                font-size: 0.875rem;
                padding: 0.5rem;
              }

              .rdp-day {
                border-radius: 0.5rem;
                transition: all 0.2s;
                border: 2px solid transparent;
                font-size: 1rem;
                font-weight: 500;
              }

              .rdp-months { width: 100%; }
              .rdp-month { width: 100%; }
              .rdp-table { width: 100%; max-width: none; }
            `}</style>

            <div className="w-full flex flex-col items-center">
              <DayPicker
                mode="multiple"
                selected={selectedDates}
                onSelect={handleSelect}
                locale={fr}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                classNames={{
                  selected: 'rdp-selected rdp-day-selected',
                  today: 'rdp-today',
                }}
                disabled={(date) => {
                  // ✅ Normaliser les dates à minuit pour comparaison correcte
                  const normalizedDate = new Date(date);
                  normalizedDate.setHours(0, 0, 0, 0);

                  const normalizedDebut = new Date(dateDebut);
                  normalizedDebut.setHours(0, 0, 0, 0);

                  const normalizedFin = new Date(dateFin);
                  normalizedFin.setHours(0, 0, 0, 0);

                  return normalizedDate < normalizedDebut || normalizedDate > normalizedFin;
                }}
                fromDate={dateDebut}
                toDate={dateFin}
                defaultMonth={dateDebut}
                showOutsideDays={false}
              />

              {/* Légende */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-[13px] text-slate-500 bg-slate-50/80 px-6 py-3 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 bg-emerald-600 rounded-md shadow-sm shadow-emerald-100"></div>
                  <span className="font-semibold text-slate-700">Sélectionné</span>
                </div>
                {protectedDates.length > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 bg-emerald-200 border-2 border-emerald-500 rounded-md relative">
                      <span className="absolute -top-1 -right-1 text-[8px]">🔒</span>
                    </div>
                    <span className="font-semibold text-slate-700">Réalisée (protégée)</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 border-2 border-slate-300 rounded-md bg-white"></div>
                  <span className="font-semibold text-slate-700">Disponible</span>
                </div>
              </div>
            </div>
          </div>

          {/* PANNEAU LATÉRAL - Jours sélectionnés */}
          <div
            className={`w-full md:w-96 border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50 flex flex-col max-h-[40vh] md:max-h-none ${isSubmitting ? 'pointer-events-none opacity-60' : ''}`}
          >
            <div className="p-5 border-b border-slate-200 bg-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                </div>
                Jours sélectionnés ({stats.count})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedDays.filter((d) => d.selected).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8 px-4 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">Aucun jour sélectionné</p>
                  <p className="text-xs mt-1">Cliquez sur le calendrier pour ajouter des jours</p>
                </div>
              ) : (
                selectedDays
                  .filter((d) => d.selected)
                  .map((day) => {
                    const isProtected = protectedDates.includes(day.date);
                    return (
                      <div
                        key={day.date}
                        className={`p-4 rounded-xl border shadow-sm transition-shadow group ${
                          isProtected
                            ? 'bg-emerald-50/50 border-emerald-200 hover:shadow-none'
                            : 'bg-white border-slate-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              {new Date(day.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              })}
                              {isProtected && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                  🔒 Existante
                                </span>
                              )}
                            </div>
                          </div>
                          {!isProtected && (
                            <button
                              type="button"
                              onClick={() => handleToggle(day.date)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              title="Désélectionner"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div
                          className={`flex items-center gap-3 p-2 rounded-lg ${
                            isProtected ? 'bg-emerald-100/50' : 'bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              {day.heure_debut} - {day.heure_fin}
                            </span>
                          </div>
                          <div className="ml-auto flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">
                              Charge:
                            </span>
                            <span className="text-xs font-bold text-emerald-600">
                              {calculerHeures(day.heure_debut, day.heure_fin).toFixed(1)}h
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-6 border-t border-slate-200 bg-white">
          <div className="text-sm">
            {stats.count === 0 ? (
              <span className="text-amber-600 font-bold flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                <AlertTriangle className="w-4 h-4" />
                Aucun jour sélectionné
              </span>
            ) : (
              <span className="text-slate-500 font-medium">
                Période:{' '}
                <strong className="text-slate-800">{allDays.length} jours potentiels</strong>
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={stats.count === 0 || isSubmitting}
              className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg shadow-emerald-200 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                <>
                  <CheckSquare className="w-5 h-5" />
                  Confirmer ({stats.count})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectDaysModal;
