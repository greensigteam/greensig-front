import React from 'react';
import {
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Tache, STATUT_TACHE_COLORS, STATUT_TACHE_LABELS } from '../../types/planning';

interface TaskListPanelProps {
  taches: Tache[];
  paginatedTaches: Tache[];
  filteredTachesCount: number;
  selectedTache: Tache | null;
  onSelectTache: (tache: Tache) => void;
  loading: boolean;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  isHidden?: boolean;
}

export const TaskListPanel: React.FC<TaskListPanelProps> = ({
  taches: _taches,
  paginatedTaches,
  filteredTachesCount,
  selectedTache,
  onSelectTache,
  loading,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  isHidden = false,
}) => {
  if (isHidden) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Zone scrollable isolée */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          // ⚡ OPTIMISATION: Skeleton loading au lieu d'un simple spinner
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredTachesCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Calendar className="w-12 h-12 mb-4 text-slate-300" />
            <p className="text-lg font-medium">Aucune tâche trouvée</p>
          </div>
        ) : (
          // Liste des tâches
          <div className="p-4 space-y-3">
            {paginatedTaches.map((tache) => (
              <TaskCard
                key={tache.id}
                tache={tache}
                isSelected={selectedTache?.id === tache.id}
                onClick={() => onSelectTache(tache)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls - fixée en bas */}
      {filteredTachesCount > 0 && (
        <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Affichage {(currentPage - 1) * itemsPerPage + 1} à{' '}
              {Math.min(currentPage * itemsPerPage, filteredTachesCount)} sur {filteredTachesCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm text-slate-600">
                Page {currentPage} sur {totalPages || 1}
              </span>
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for task card
interface TaskCardProps {
  tache: Tache;
  isSelected: boolean;
  onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ tache, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-semibold text-slate-800">
            {tache.type_tache_detail?.nom_tache || 'Tâche sans nom'}
          </h3>
          {tache.reference && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
              {tache.reference}
            </span>
          )}
        </div>
        {tache.statut && (
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUT_TACHE_COLORS[tache.statut]?.bg || 'bg-slate-100'} ${STATUT_TACHE_COLORS[tache.statut]?.text || 'text-slate-700'}`}
          >
            {STATUT_TACHE_LABELS[tache.statut] || tache.statut}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(tache.date_debut_planifiee).toLocaleDateString()}
        </span>
        <span
          className="flex items-center gap-1 truncate max-w-[200px]"
          title={
            tache.objets_detail?.length
              ? `${tache.objets_detail[0]?.site_nom || 'Site'} - ${tache.objets_detail.length} objet${tache.objets_detail.length > 1 ? 's' : ''}`
              : tache.site_nom
                ? `${tache.site_nom} (via réclamation)`
                : 'Aucune localisation'
          }
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {tache.objets_detail?.length
            ? `${tache.objets_detail[0]?.site_nom || 'Site'} (${tache.objets_detail.length} obj.)`
            : tache.site_nom || 'Non localisé'}
        </span>
      </div>
    </div>
  );
};

// ⚡ OPTIMISATION: Skeleton component for loading state
const TaskCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
    <div className="flex justify-between items-start mb-2">
      <div className="flex flex-col gap-1.5">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="h-4 w-20 bg-slate-100 rounded" />
      </div>
      <div className="h-6 w-20 bg-slate-200 rounded-full" />
    </div>
    <div className="flex items-center gap-4">
      <div className="h-4 w-24 bg-slate-100 rounded" />
      <div className="h-4 w-32 bg-slate-100 rounded" />
    </div>
  </div>
);

export default TaskListPanel;
