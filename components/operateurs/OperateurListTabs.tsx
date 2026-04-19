import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Award,
  Loader2,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import type { Absence } from '../../types/users';
import type { Tache } from '../../types/planning';
import { StatusBadge } from '../StatusBadge';
import { DetailEmptyState } from '../DetailModal';

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className={`${color} rounded-xl p-4 text-white shadow-sm`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm opacity-90">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/20">
        {icon}
      </div>
    </div>
  </div>
);

function PaginationBar({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  label,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  label: string;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
      <div className="text-sm text-gray-600">
        Affichage de {startIndex + 1} à {Math.min(endIndex, totalItems)} sur {totalItems} {label}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                currentPage === page
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export const OngletAbsences: React.FC<{
  absences: Absence[];
  isLoading: boolean;
}> = ({ absences, isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (absences.length === 0) {
    return (
      <DetailEmptyState
        icon={<Calendar className="w-12 h-12" />}
        title="Aucune absence"
        description="Cet opérateur n'a pas d'absences enregistrées."
      />
    );
  }

  const enCours = absences.filter(
    (a) => a.statut === 'VALIDEE' && new Date(a.dateFin) >= new Date(),
  ).length;
  const enAttente = absences.filter((a) => a.statut === 'DEMANDEE').length;

  const totalPages = Math.ceil(absences.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAbsences = absences.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total"
          value={absences.length}
          icon={<Calendar className="w-6 h-6 text-white" />}
          color="bg-gradient-to-br from-gray-500 to-gray-600"
        />
        <StatCard
          title="En cours"
          value={enCours}
          icon={<Clock className="w-6 h-6 text-white" />}
          color="bg-gradient-to-br from-orange-500 to-amber-500"
        />
        <StatCard
          title="En attente"
          value={enAttente}
          icon={<AlertCircle className="w-6 h-6 text-white" />}
          color="bg-gradient-to-br from-blue-500 to-cyan-500"
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Période
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Durée
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentAbsences.map((absence) => (
              <tr key={absence.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <StatusBadge
                    variant="status"
                    type="absence"
                    value={absence.typeAbsence}
                    size="xs"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(absence.dateDebut).toLocaleDateString('fr-FR')} -{' '}
                  {new Date(absence.dateFin).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {absence.dureeJours} jour{absence.dureeJours > 1 ? 's' : ''}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge variant="status" type="absence" value={absence.statut} size="xs" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={absences.length}
          label="absences"
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export const OngletInterventions: React.FC<{
  taches: Tache[];
  isLoading: boolean;
}> = ({ taches, isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (taches.length === 0) {
    return (
      <DetailEmptyState
        icon={<ClipboardList className="w-12 h-12" />}
        title="Aucune intervention"
        description="Aucune tâche assignée pour cet opérateur."
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
        <StatCard
          title="Total"
          value={taches.length}
          icon={<ClipboardList className="w-6 h-6 text-white" />}
          color="bg-gradient-to-br from-gray-500 to-gray-600"
        />
        <StatCard
          title="En cours"
          value={enCours}
          icon={<Clock className="w-6 h-6 text-white" />}
          color="bg-gradient-to-br from-orange-500 to-amber-500"
        />
        <StatCard
          title="Terminées"
          value={terminees}
          icon={<Award className="w-6 h-6 text-white" />}
          color="bg-gradient-to-br from-green-500 to-emerald-500"
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Site
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentTaches.map((tache) => {
              const firstSite =
                tache.objets_detail && tache.objets_detail.length > 0
                  ? tache.objets_detail[0]?.site_nom
                  : null;

              return (
                <tr key={tache.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {tache.type_tache_detail?.nom_tache || 'Type non défini'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{firstSite || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
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

        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={taches.length}
          label="tâches"
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};
