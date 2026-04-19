import React from 'react';
import { MapPin, Activity, Sprout, Wrench, X } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import type { SiteFrontend } from '../../services/api';

export interface InventoryFilterValues {
  type: string;
  state: string;
  site: string;
  intervention: string;
  family: string;
  dateCreationFrom: string;
  dateCreationTo: string;
}

interface InventoryFiltersProps {
  filters: InventoryFilterValues;
  setFilters: (filters: InventoryFilterValues) => void;
  mainTab: 'tous' | 'vegetation' | 'hydraulique';
  sites: SiteFrontend[];
  families: string[];
  hasActiveFilters: boolean;
  onReset: () => void;
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filters,
  setFilters,
  mainTab,
  sites,
  families,
  hasActiveFilters,
  onReset,
}) => {
  return (
    <div className="mb-6 pb-4 border-b border-slate-200 bg-slate-50 p-4 rounded-lg flex-shrink-0 no-print">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomSelect
          value={filters.site}
          onChange={(val) => setFilters({ ...filters, site: val })}
          options={[
            { value: 'all', label: 'Site: Tous' },
            ...sites.map((s) => ({ value: s.id, label: s.name })),
          ]}
          icon={<MapPin className="w-4 h-4" />}
        />

        <CustomSelect
          value={filters.state}
          onChange={(val) => setFilters({ ...filters, state: val })}
          options={[
            { value: 'all', label: 'État: Tous' },
            { value: 'bon', label: 'Bon' },
            { value: 'moyen', label: 'Moyen' },
            { value: 'mauvais', label: 'Mauvais' },
            { value: 'critique', label: 'Critique' },
          ]}
          icon={<Activity className="w-4 h-4" />}
        />

        {mainTab !== 'hydraulique' && (
          <CustomSelect
            value={filters.family}
            onChange={(val) => setFilters({ ...filters, family: val })}
            options={[
              { value: 'all', label: 'Famille: Toutes' },
              ...families.map((f) => ({ value: f, label: f })),
            ]}
            icon={<Sprout className="w-4 h-4" />}
          />
        )}

        <CustomSelect
          value={filters.intervention}
          onChange={(val) => setFilters({ ...filters, intervention: val })}
          options={[
            { value: 'all', label: 'Maintenance: Tout' },
            { value: 'urgent', label: 'Urgente (> 6 mois)' },
            { value: 'never', label: 'Jamais intervenu' },
            { value: 'recent_30', label: 'Récente (< 30j)' },
          ]}
          icon={<Wrench className="w-4 h-4" />}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Date d'ajout :</span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Du</label>
          <input
            type="date"
            value={filters.dateCreationFrom}
            onChange={(e) => setFilters({ ...filters, dateCreationFrom: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Au</label>
          <input
            type="date"
            value={filters.dateCreationTo}
            onChange={(e) => setFilters({ ...filters, dateCreationTo: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
          />
        </div>
        {(filters.dateCreationFrom || filters.dateCreationTo) && (
          <button
            onClick={() => setFilters({ ...filters, dateCreationFrom: '', dateCreationTo: '' })}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            title="Effacer le filtre de date"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
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
