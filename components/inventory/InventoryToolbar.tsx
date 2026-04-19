import React from 'react';
import { Filter, FileText, Leaf, Droplet } from 'lucide-react';
import { ExportDropdown } from './ExportDropdown';
import type { InventoryFilterValues } from './InventoryFilters';

interface InventoryToolbarProps {
  mainTab: 'tous' | 'vegetation' | 'hydraulique';
  onMainTabChange: (tab: 'tous' | 'vegetation' | 'hydraulique') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  filters: InventoryFilterValues;
  canExport: boolean;
  onExportExcel: () => void;
  onPrint: () => void;
}

export const InventoryToolbar: React.FC<InventoryToolbarProps> = ({
  mainTab,
  onMainTabChange,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  filters,
  canExport,
  onExportExcel,
  onPrint,
}) => {
  const activeFilterCount =
    [filters.type, filters.state, filters.site, filters.intervention, filters.family].filter(
      (v) => v !== 'all',
    ).length +
    (filters.dateCreationFrom ? 1 : 0) +
    (filters.dateCreationTo ? 1 : 0);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-shrink-0 no-print">
      <div className="flex items-center bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => onMainTabChange('tous')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            mainTab === 'tous'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Tous
        </button>
        <button
          onClick={() => onMainTabChange('vegetation')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            mainTab === 'vegetation'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Leaf className="w-4 h-4" />
          Végétation
        </button>
        <button
          onClick={() => onMainTabChange('hydraulique')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            mainTab === 'hydraulique'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Droplet className="w-4 h-4" />
          Hydraulique
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            showFilters || hasActiveFilters
              ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filtres</span>
          {hasActiveFilters && (
            <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {canExport && <ExportDropdown onExportExcel={onExportExcel} onPrint={onPrint} />}
      </div>
    </div>
  );
};

interface TypeFilterTabsProps {
  currentType: string;
  types: string[];
  onTypeChange: (type: string) => void;
}

export const TypeFilterTabs: React.FC<TypeFilterTabsProps> = ({
  currentType,
  types,
  onTypeChange,
}) => (
  <div className="mb-6 flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 flex-shrink-0 no-print">
    <button
      onClick={() => onTypeChange('all')}
      className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
        currentType === 'all'
          ? 'bg-emerald-600 text-white shadow-md'
          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
      }`}
    >
      Tous
    </button>
    {types.map((type) => (
      <button
        key={type}
        onClick={() => onTypeChange(type)}
        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
          currentType === type
            ? 'bg-emerald-600 text-white shadow-md'
            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        }`}
      >
        {type}
      </button>
    ))}
  </div>
);
