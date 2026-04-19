import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import type { Tache } from '../../types/planning';
import { StatusBadge } from '../StatusBadge';
import { DetailEmptyState } from '../DetailModal';
import LoadingWrapper from '../LoadingWrapper';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
}> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
    <div className="text-sm font-medium text-slate-500 mb-1">{title}</div>
    <div className="text-3xl font-bold text-slate-800">{value}</div>
    {icon && color && (
      <div
        className={`absolute top-4 right-4 w-10 h-10 rounded-lg flex items-center justify-center ${color}`}
      >
        {icon}
      </div>
    )}
  </div>
);

interface OngletInterventionsProps {
  taches: Tache[];
  isLoading: boolean;
}

const OngletInterventions: React.FC<OngletInterventionsProps> = ({ taches, isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (isLoading) {
    return (
      <LoadingWrapper isLoading={true}>
        <div />
      </LoadingWrapper>
    );
  }

  if (taches.length === 0) {
    return (
      <DetailEmptyState
        icon={<ClipboardList className="w-12 h-12" />}
        title="Aucune intervention"
        description="Aucune tache planifiee ou realisee pour cette structure."
      />
    );
  }

  const enCours = taches.filter((t) => !['TERMINEE', 'ANNULEE'].includes(t.statut)).length;
  const terminees = taches.filter((t) => t.statut === 'TERMINEE').length;

  const totalPages = Math.ceil(taches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTaches = taches.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total" value={taches.length} />
        <StatCard title="En cours" value={enCours} />
        <StatCard title="Terminées" value={terminees} />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Site
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentTaches.map((tache) => {
              const firstSite =
                tache.objets_detail && tache.objets_detail.length > 0
                  ? tache.objets_detail[0]?.site_nom
                  : null;

              return (
                <tr key={tache.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {tache.type_tache_detail?.nom_tache || 'Type non défini'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{firstSite || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {tache.date_debut_planifiee
                      ? new Date(tache.date_debut_planifiee).toLocaleDateString('fr-FR')
                      : 'Date non définie'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tache.statut} type="tache" size="xs" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {startIndex + 1} - {Math.min(endIndex, taches.length)} sur {taches.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OngletInterventions;
