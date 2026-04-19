import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ClipboardList, Loader2, Settings, Eye } from 'lucide-react';
import { PRIORITE_LABELS, STATUT_TACHE_COLORS } from '../../types/planning';
import { getEquipeName, formatEquipesList } from '../../utils/equipeHelpers';
import PaginationControls from '../PaginationControls';
import type { Tache } from '../../types/planning';

interface ReclamationsTachesTabProps {
  taches: Tache[];
  loading: boolean;
  searchQuery: string;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const ReclamationsTachesTab: React.FC<ReclamationsTachesTabProps> = ({
  taches,
  loading,
  searchQuery,
  currentPage,
  itemsPerPage,
  onPageChange,
}) => {
  const navigate = useNavigate();

  const totalPages = Math.ceil(taches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTaches = taches.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </div>
    );
  }

  if (taches.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <ClipboardList className="w-12 h-12 mb-4 text-slate-300" />
          <p className="text-lg font-medium">Aucune tâche liée trouvée</p>
          <p className="text-sm">
            {searchQuery
              ? "Essayez avec d'autres termes de recherche"
              : 'Aucune tâche liée à une réclamation'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Type Tâche
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Réclamation
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Equipe
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Priorité
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Settings className="w-4 h-4 ml-auto text-slate-400" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedTaches.map((t) => {
              const statutColors = STATUT_TACHE_COLORS[t.statut] || {
                bg: 'bg-slate-100',
                text: 'text-slate-800',
              };
              return (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-800">
                      {t.type_tache_detail.nom_tache}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {t.reclamation_numero ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                        <AlertCircle className="w-3 h-3" />
                        {t.reclamation_numero}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {t.equipes_detail && t.equipes_detail.length > 0
                      ? formatEquipesList(t.equipes_detail)
                      : getEquipeName(t.equipe_detail)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-600">
                        {new Date(t.date_debut_planifiee).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-xs text-slate-400">
                        → {new Date(t.date_fin_planifiee).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        t.priorite >= 4
                          ? 'bg-red-50 text-red-700 border border-red-100'
                          : t.priorite === 3
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {PRIORITE_LABELS[t.priorite]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statutColors.bg} ${statutColors.text}`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          t.statut === 'PLANIFIEE'
                            ? 'bg-blue-500'
                            : t.statut === 'EN_COURS'
                              ? 'bg-amber-500'
                              : t.statut === 'TERMINEE'
                                ? 'bg-emerald-500'
                                : t.statut === 'ANNULEE'
                                  ? 'bg-red-500'
                                  : 'bg-slate-400'
                        }`}
                      />
                      {t.statut.toLowerCase().replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => navigate(`/suivi-taches?task_id=${t.id}`)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Voir le détail de la tâche"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        itemsPerPage={itemsPerPage}
        totalItems={taches.length}
        onPageChange={onPageChange}
      />
    </div>
  );
};

export default ReclamationsTachesTab;
