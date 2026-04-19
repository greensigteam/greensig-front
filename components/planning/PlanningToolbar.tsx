import React, { FC, useMemo } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Calendar as CalendarIcon,
  List,
  Filter,
  X,
} from 'lucide-react';
import { PlanningFilters, TypeTache } from '../../types/planning';
import { StructureClient, EquipeList } from '../../types/users';
import { SiteFrontend } from '../../services/api';
import PlanningFiltersComponent from './PlanningFilters';

// ============================================================================
// TYPES
// ============================================================================

interface PlanningToolbarProps {
  // View state
  viewMode: 'calendar' | 'list';
  setViewMode: (mode: 'calendar' | 'list') => void;
  currentView: string;
  setCurrentView: (view: string) => void;
  currentDate: Date;

  // Navigation
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;

  // Filters
  filters: PlanningFilters;
  setFilters: React.Dispatch<React.SetStateAction<PlanningFilters>>;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  activeFiltersCount: number;
  structures: StructureClient[];
  sites: SiteFrontend[];
  equipes: EquipeList[];
  typesTaches: TypeTache[];

  // Export
  isExporting: boolean;
  onExportPDF: () => void;
}

// ============================================================================
// VIEW SELECTOR COMPONENT
// ============================================================================

interface ViewSelectorProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  showViewSelector: boolean;
  setShowViewSelector: (show: boolean) => void;
}

const ViewSelector: FC<ViewSelectorProps> = ({
  currentView,
  setCurrentView,
  showViewSelector,
  setShowViewSelector,
}) => {
  const views = [
    { id: 'month', label: 'Mois' },
    { id: 'week', label: 'Semaine' },
    { id: 'day', label: 'Jour' },
    { id: 'agenda', label: 'Agenda' },
  ];
  const currentLabel = views.find((v) => v.id === currentView)?.label;

  return (
    <div className="relative">
      <button
        onClick={() => setShowViewSelector(!showViewSelector)}
        className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors shadow-sm min-h-[44px]"
      >
        <span className="hidden sm:inline">{currentLabel}</span>
        <span className="sm:hidden">{currentLabel?.charAt(0)}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {showViewSelector && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowViewSelector(false)} />
          <div className="absolute right-0 mt-2 w-36 md:w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => {
                  setCurrentView(view.id);
                  setShowViewSelector(false);
                }}
                className={`w-full text-left px-4 py-3 md:py-2.5 text-sm hover:bg-gray-50 transition-colors ${currentView === view.id ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-gray-700'}`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PlanningToolbar: FC<PlanningToolbarProps> = ({
  viewMode,
  setViewMode,
  currentView,
  setCurrentView,
  currentDate,
  onNavigate,
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  activeFiltersCount,
  structures,
  sites,
  equipes,
  typesTaches,
  isExporting,
  onExportPDF,
}) => {
  const [showViewSelector, setShowViewSelector] = React.useState(false);

  // Date label based on current view
  const dateLabel = useMemo(() => {
    switch (currentView) {
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: fr });
      case 'week': {
        const start = startOfWeek(currentDate, { locale: fr, weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { locale: fr, weekStartsOn: 1 });
        return `${format(start, 'd MMM', { locale: fr })} - ${format(end, 'd MMM yyyy', { locale: fr })}`;
      }
      case 'day':
        return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr });
      case 'agenda':
        return `Agenda - ${format(currentDate, 'MMMM yyyy', { locale: fr })}`;
      default:
        return '';
    }
  }, [currentDate, currentView]);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center px-3 md:px-6 py-2 md:py-3 border-b border-gray-200 gap-2 md:gap-4 bg-white z-20">
      {/* LEFT: Navigation calendrier + Filtres */}
      <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto overflow-x-auto scrollbar-hide py-1">
        {viewMode === 'calendar' && (
          <>
            <button
              onClick={() => onNavigate('TODAY')}
              className="px-3 md:px-5 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors shadow-sm shrink-0 min-h-[44px]"
            >
              <span className="hidden sm:inline">Aujourd'hui</span>
              <span className="sm:hidden">Ajd</span>
            </button>
            <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
              <button
                onClick={() => onNavigate('PREV')}
                className="p-2.5 md:p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => onNavigate('NEXT')}
                className="p-2.5 md:p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <span className="text-sm md:text-xl font-normal text-gray-800 capitalize min-w-0 shrink truncate">
              {dateLabel}
            </span>
          </>
        )}
        {viewMode === 'list' && (
          <h2 className="text-sm md:text-xl font-normal text-gray-800 shrink-0">
            Agenda des tâches
          </h2>
        )}
      </div>

      {/* Spacer flexible pour pousser le reste à droite */}
      <div className="hidden sm:block flex-1" />

      {/* RIGHT: View controls */}
      <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-between sm:justify-end">
        {/* Toggle Filtres */}
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2.5 rounded-xl transition-all duration-200 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${
              showFilters || activeFiltersCount > 0
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 ring-2 ring-emerald-500/20'
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
            title="Filtres"
          >
            <Filter className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-md border-2 border-white">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {showFilters && (
            <>
              {/* Mobile: Full-screen overlay */}
              <div
                className="md:hidden fixed inset-0 bg-black/50 z-[99]"
                onClick={() => setShowFilters(false)}
              />
              <div className="fixed md:absolute inset-x-2 top-16 md:inset-x-auto md:top-full md:right-0 md:mt-3 z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 max-h-[80vh] md:max-h-none overflow-y-auto md:min-w-[700px]">
                  <div className="flex justify-between items-center mb-3 px-1">
                    <h3 className="text-sm font-semibold text-slate-800">Filtres avancés</h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <PlanningFiltersComponent
                    filters={filters}
                    onFiltersChange={setFilters}
                    structures={structures}
                    sites={sites}
                    equipes={equipes}
                    typesTaches={typesTaches}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-8 w-px bg-gray-200 hidden md:block shrink-0 mx-1" />

        {viewMode === 'calendar' && (
          <ViewSelector
            currentView={currentView}
            setCurrentView={setCurrentView}
            showViewSelector={showViewSelector}
            setShowViewSelector={setShowViewSelector}
          />
        )}

        <div className="flex bg-gray-100 p-1 rounded-full">
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-2.5 md:p-2 rounded-full transition-all duration-200 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center ${viewMode === 'calendar' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            title="Vue Calendrier"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2.5 md:p-2 rounded-full transition-all duration-200 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center ${viewMode === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            title="Vue Liste"
          >
            <List className="w-5 h-5" />
          </button>
        </div>

        {viewMode === 'calendar' && (
          <button
            onClick={onExportPDF}
            disabled={isExporting}
            className="p-2.5 md:p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Exporter en PDF"
          >
            {isExporting ? (
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default PlanningToolbar;
