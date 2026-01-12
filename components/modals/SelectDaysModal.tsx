import React, { useState, useMemo } from 'react';
import { Calendar, X, CheckSquare, Clock, Settings2 } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { fr } from 'date-fns/locale';
import { isSunday, isSaturday, isWithinInterval, format, startOfDay } from 'date-fns';
import 'react-day-picker/dist/style.css';

interface DaySelection {
  date: string; // YYYY-MM-DD
  dayName: string;
  dayOfWeek: number;
  isWeekend: boolean;
  isSunday: boolean;
  selected: boolean;
  heure_debut: string;
  heure_fin: string;
}

interface SelectDaysModalProps {
  dateDebut: Date;
  dateFin: Date;
  onConfirm: (selectedDays: DaySelection[]) => void;
  onCancel: () => void;
  initialSelection?: string[]; // Liste des dates déjà sélectionnées (YYYY-MM-DD)
}

const JOUR_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/**
 * 🎨 Modal de sélection des jours avec react-day-picker
 *
 * Features:
 * - Calendrier mensuel interactif (react-day-picker)
 * - Panneau latéral avec détails des jours sélectionnés
 * - Configuration horaires par défaut globale
 * - Raccourcis intelligents
 * - Stats en temps réel
 */
const SelectDaysModal: React.FC<SelectDaysModalProps> = ({
  dateDebut,
  dateFin,
  onConfirm,
  onCancel,
  initialSelection = []
}) => {
  // Configuration horaires par défaut
  const [defaultHeureDebut, setDefaultHeureDebut] = useState('08:00');
  const [defaultHeureFin, setDefaultHeureFin] = useState('17:00');

  // Fonction pour calculer les heures entre deux horaires
  const calculerHeures = (debut: string, fin: string): number => {
    if (!debut || !fin) return 0;

    const [hDebut, mDebut] = debut.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);

    const minutesDebut = (hDebut ?? 0) * 60 + (mDebut ?? 0);
    const minutesFin = (hFin ?? 0) * 60 + (mFin ?? 0);

    const diffMinutes = minutesFin - minutesDebut;
    return Math.round((diffMinutes / 60) * 100) / 100;
  };

  // Générer tous les jours de l'intervalle
  const allDays = useMemo(() => {
    const days: DaySelection[] = [];
    const currentDate = new Date(dateDebut);
    const endDate = new Date(dateFin);

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      const isDimanche = dayOfWeek === 0;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      days.push({
        date: dateString,
        dayName: JOUR_NAMES[dayOfWeek] ?? '',
        dayOfWeek,
        isWeekend,
        isSunday: isDimanche,
        selected: initialSelection.includes(dateString),
        heure_debut: defaultHeureDebut ?? '',
        heure_fin: defaultHeureFin ?? ''
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }, [dateDebut, dateFin, initialSelection, defaultHeureDebut, defaultHeureFin]);

  const [selectedDays, setSelectedDays] = useState<DaySelection[]>(allDays);

  // Calculer les jours sélectionnés pour react-day-picker
  const selectedDates = useMemo(() => {
    return selectedDays
      .filter(d => d.selected)
      .map(d => new Date(d.date + 'T00:00:00'));
  }, [selectedDays]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const selected = selectedDays.filter(d => d.selected);
    const totalHeures = selected.reduce((sum, day) => {
      return sum + calculerHeures(day.heure_debut, day.heure_fin);
    }, 0);

    return {
      count: selected.length,
      total: allDays.length,
      totalHeures: totalHeures.toFixed(2),
      moyenneHeures: selected.length > 0 ? (totalHeures / selected.length).toFixed(2) : '0'
    };
  }, [selectedDays, allDays]);

  // Handlers
  const handleDayClick = (day: Date) => {
    const dateString = format(day, 'yyyy-MM-dd');
    const dayInfo = selectedDays.find(d => d.date === dateString);

    // Ne pas permettre de sélectionner les dimanches
    if (dayInfo?.isSunday) return;

    // Vérifier si le jour est dans l'intervalle
    if (!isWithinInterval(day, { start: dateDebut, end: dateFin })) return;

    setSelectedDays(prev =>
      prev.map(d =>
        d.date === dateString ? { ...d, selected: !d.selected } : d
      )
    );
  };

  const handleSelectJoursOuvres = () => {
    setSelectedDays(prev =>
      prev.map(day => ({
        ...day,
        selected: !day.isSunday,
        heure_debut: defaultHeureDebut,
        heure_fin: defaultHeureFin
      }))
    );
  };

  const handleSelectAll = () => {
    setSelectedDays(prev =>
      prev.map(day => ({
        ...day,
        selected: !day.isSunday,
        heure_debut: defaultHeureDebut,
        heure_fin: defaultHeureFin
      }))
    );
  };

  const handleDeselectAll = () => {
    setSelectedDays(prev =>
      prev.map(day => ({
        ...day,
        selected: false
      }))
    );
  };

  const handleConfirm = () => {
    const selected = selectedDays.filter(d => d.selected);
    onConfirm(selected);
  };

  const handleToggle = (dateString: string) => {
    setSelectedDays(prev =>
      prev.map(day =>
        day.date === dateString ? { ...day, selected: !day.selected } : day
      )
    );
  };

  // Modifiers pour react-day-picker
  const modifiers = {
    selected: selectedDates,
    sunday: (date: Date) => isSunday(date),
    saturday: (date: Date) => isSaturday(date),
    outside: (date: Date) => !isWithinInterval(date, { start: dateDebut, end: dateFin })
  };

  const modifiersClassNames = {
    selected: 'rdp-day-selected',
    sunday: 'rdp-day-sunday',
    saturday: 'rdp-day-saturday',
    outside: 'rdp-day-outside'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Sélection des jours de travail</h2>
              <p className="text-sm text-gray-500">
                Du {dateDebut.toLocaleDateString('fr-FR')} au {dateFin.toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Stats & Config */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <strong className="text-blue-900">{stats.count}</strong>
                <span className="text-gray-600">jours sélectionnés</span>
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <strong className="text-blue-900">{stats.totalHeures}h</strong>
                <span className="text-gray-600">au total</span>
              </span>
              <span className="text-gray-600">
                Moyenne: <strong className="text-blue-900">{stats.moyenneHeures}h/jour</strong>
              </span>
            </div>

            {/* Config horaires par défaut */}
            <div className="flex items-center gap-3 text-sm">
              <Settings2 className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Horaires par défaut:</span>
              <input
                type="time"
                value={defaultHeureDebut}
                onChange={(e) => setDefaultHeureDebut(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span className="text-gray-400">-</span>
              <input
                type="time"
                value={defaultHeureFin}
                onChange={(e) => setDefaultHeureFin(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span className="text-gray-600 ml-2">
                ({calculerHeures(defaultHeureDebut, defaultHeureFin).toFixed(2)}h)
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSelectJoursOuvres}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Jours ouvrés uniquement
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              Tous les jours
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Aucun jour
            </button>
          </div>
        </div>

        {/* Main Content: Calendar + Sidebar */}
        <div className="flex-1 overflow-hidden flex">
          {/* CALENDRIER */}
          <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
            <style>{`
              .rdp {
                --rdp-cell-size: 75px;
                --rdp-accent-color: #2563eb;
                --rdp-background-color: #dbeafe;
                margin: 0;
                width: 100%;
                max-width: 650px;
              }

              .rdp-day-selected:not(.rdp-day-sunday) {
                background-color: #2563eb !important;
                color: white !important;
                font-weight: 600;
              }

              .rdp-day-selected:not(.rdp-day-sunday):hover {
                background-color: #1d4ed8 !important;
              }

              .rdp-day-saturday:not(.rdp-day-selected):not(.rdp-day-outside) {
                background-color: #fef3c7;
                color: #92400e;
                border: 2px solid #fcd34d;
              }

              .rdp-day-sunday {
                background-color: #fee2e2 !important;
                color: #dc2626 !important;
                cursor: not-allowed !important;
                opacity: 0.5;
              }

              .rdp-day-outside {
                background-color: #f9fafb !important;
                color: #d1d5db !important;
                cursor: not-allowed !important;
              }

              .rdp-day:not(.rdp-day-sunday):not(.rdp-day-outside) {
                cursor: pointer;
              }

              .rdp-day:not(.rdp-day-selected):not(.rdp-day-sunday):not(.rdp-day-outside):not(.rdp-day-saturday):hover {
                background-color: #dbeafe;
                border: 2px solid #3b82f6;
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

              .rdp-months {
                width: 100%;
              }

              .rdp-month {
                width: 100%;
              }

              .rdp-table {
                width: 100%;
                max-width: none;
              }
            `}</style>

            <div className="w-full flex flex-col items-center">
              <DayPicker
                mode="multiple"
                selected={selectedDates}
                onDayClick={handleDayClick}
                locale={fr}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                disabled={(date) =>
                  isSunday(date) ||
                  !isWithinInterval(date, { start: dateDebut, end: dateFin })
                }
                fromDate={dateDebut}
                toDate={dateFin}
                defaultMonth={dateDebut}
                showOutsideDays
              />

              {/* Légende */}
              <div className="mt-8 flex items-center gap-6 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-600 rounded"></div>
                <span className="font-medium">Sélectionné</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-yellow-50 border-2 border-yellow-300 rounded"></div>
                <span className="font-medium">Weekend (Samedi)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-red-100 rounded"></div>
                <span className="font-medium">Dimanche (Repos)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                <span className="font-medium">Disponible</span>
              </div>
              </div>
            </div>
          </div>

          {/* PANNEAU LATÉRAL - Jours sélectionnés */}
          <div className="w-96 border-l border-gray-200 bg-gray-50 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                Jours sélectionnés ({stats.count})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {selectedDays.filter(d => d.selected).length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun jour sélectionné</p>
                </div>
              ) : (
                selectedDays.filter(d => d.selected).map((day) => (
                  <div
                    key={day.date}
                    className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(day.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })}
                        </div>
                        {day.isWeekend && !day.isSunday && (
                          <span className="text-xs text-yellow-600">Weekend</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggle(day.date)}
                        className="p-1 hover:bg-red-50 rounded text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>{day.heure_debut} - {day.heure_fin}</span>
                      <span className="ml-auto font-medium text-blue-600">
                        {calculerHeures(day.heure_debut, day.heure_fin).toFixed(2)}h
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {stats.count === 0 && (
              <span className="text-orange-600 font-medium">
                ⚠️ Aucun jour sélectionné
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={stats.count === 0}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
            >
              Confirmer ({stats.count} jour{stats.count > 1 ? 's' : ''})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectDaysModal;
