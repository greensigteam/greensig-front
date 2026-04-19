import React from 'react';
import { MapPin, Calendar, Clock, AlertOctagon, X } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';

interface SiteOption {
  id: string;
  name: string;
}

interface ReclamationsFiltersPanelProps {
  filterStatut: string;
  setFilterStatut: (val: string) => void;
  filterSite: string;
  setFilterSite: (val: string) => void;
  filterPeriod: string;
  onPeriodChange: (val: string) => void;
  filterDateDebut: string;
  setFilterDateDebut: (val: string) => void;
  filterDateFin: string;
  setFilterDateFin: (val: string) => void;
  filterAutoCloturee: boolean;
  setFilterAutoCloturee: React.Dispatch<React.SetStateAction<boolean>>;
  sites: SiteOption[];
  hasActiveFilters: boolean;
  onReset: () => void;
}

const ReclamationsFiltersPanel: React.FC<ReclamationsFiltersPanelProps> = ({
  filterStatut,
  setFilterStatut,
  filterSite,
  setFilterSite,
  filterPeriod,
  onPeriodChange,
  filterDateDebut,
  setFilterDateDebut,
  filterDateFin,
  setFilterDateFin,
  filterAutoCloturee,
  setFilterAutoCloturee,
  sites,
  hasActiveFilters,
  onReset,
}) => {
  return (
    <div className="mb-6 pb-4 border-b border-slate-200 bg-slate-50 p-4 rounded-lg">
      <div
        className={`grid grid-cols-1 ${filterPeriod === 'custom' ? 'md:grid-cols-5' : 'md:grid-cols-3'} gap-4`}
      >
        <CustomSelect
          value={filterStatut}
          onChange={(val) => setFilterStatut(val)}
          options={[
            { value: '', label: 'Statut: Tous' },
            { value: 'NOUVELLE', label: 'En attente de lecture' },
            { value: 'EN_COURS', label: 'En attente de réalisation' },
            { value: 'EN_ATTENTE_VALIDATION_CLOTURE', label: 'En attente validation clôture' },
            { value: 'CLOTUREE', label: 'Clôturée' },
            { value: 'REJETEE', label: 'Rejetée' },
          ]}
          icon={<AlertOctagon className="w-4 h-4" />}
        />

        <CustomSelect
          value={filterSite}
          onChange={(val) => setFilterSite(val)}
          options={[
            { value: '', label: 'Site: Tous' },
            ...sites.map((s) => ({ value: s.id, label: s.name })),
          ]}
          icon={<MapPin className="w-4 h-4" />}
        />

        <CustomSelect
          value={filterPeriod}
          onChange={(val) => onPeriodChange(val)}
          options={[
            { value: 'all', label: "Tout l'historique" },
            { value: 'last_7', label: '7 derniers jours' },
            { value: 'last_30', label: '30 derniers jours' },
            { value: 'this_month', label: 'Ce mois-ci' },
            { value: 'custom', label: 'Période personnalisée' },
          ]}
          icon={<Clock className="w-4 h-4" />}
        />

        {filterPeriod === 'custom' && (
          <>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <input
                type="date"
                value={filterDateDebut}
                onChange={(e) => setFilterDateDebut(e.target.value)}
                placeholder="Date création (début)"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm hover:border-slate-400"
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <input
                type="date"
                value={filterDateFin}
                onChange={(e) => setFilterDateFin(e.target.value)}
                placeholder="Date création (fin)"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm hover:border-slate-400"
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-3">
        <button
          onClick={() => setFilterAutoCloturee((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
            filterAutoCloturee
              ? 'border-amber-500 bg-amber-50 text-amber-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${filterAutoCloturee ? 'bg-amber-500' : 'bg-slate-300'}`}
          />
          Clôturées automatiquement (48h sans réponse)
        </button>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
};

export default ReclamationsFiltersPanel;
