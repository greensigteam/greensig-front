import React from 'react';
import {
  Eye, Edit2, Trash2, Check, X, Clock, Ban,
  Umbrella, HeartPulse, GraduationCap, MoreHorizontal,
  CheckCircle2, XCircle, CalendarCheck, CalendarClock
} from 'lucide-react';
import { DataTable, Column } from '../DataTable';
import { Absence, TYPE_ABSENCE_LABELS, STATUT_ABSENCE_LABELS } from '../../types/users';
import { usePermissions } from '../../hooks/usePermissions';

interface AbsencesTabProps {
  filteredAbsences: Absence[];
  absencesTotal: number;
  absencesPage: number;
  onPageChange: (page: number) => void;
  onView: (absence: Absence) => void;
  onEdit: (absence: Absence) => void;
  onDelete: (id: number) => void;
  onValider: (id: number) => void;
  onRefuser: (id: number) => void;
  permissions: ReturnType<typeof usePermissions>;
}

const AbsencesTab: React.FC<AbsencesTabProps> = ({
  filteredAbsences,
  absencesTotal,
  absencesPage,
  onPageChange,
  onView,
  onEdit,
  onDelete,
  onValider,
  onRefuser,
  permissions
}) => {
  const columns: Column<Absence>[] = [
    {
      key: 'operateurNom',
      label: 'Opérateur',
      render: (a) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {a.operateurNom?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??'}
          </div>
          <span className="font-semibold text-gray-900">{a.operateurNom}</span>
        </div>
      )
    },
    {
      key: 'typeAbsence',
      label: 'Type',
      render: (a) => {
        const typeIcons = {
          CONGE: <Umbrella className="w-4 h-4" />,
          MALADIE: <HeartPulse className="w-4 h-4" />,
          FORMATION: <GraduationCap className="w-4 h-4" />,
          AUTRE: <MoreHorizontal className="w-4 h-4" />
        };
        const typeColors = {
          CONGE: 'bg-blue-100 text-blue-700 border-blue-300',
          MALADIE: 'bg-red-100 text-red-700 border-red-300',
          FORMATION: 'bg-purple-100 text-purple-700 border-purple-300',
          AUTRE: 'bg-gray-100 text-gray-700 border-gray-300'
        };
        const type = a.typeAbsence as keyof typeof typeIcons;
        return (
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg font-semibold border-2 ${typeColors[type] || typeColors.AUTRE}`}>
            {typeIcons[type] || typeIcons.AUTRE}
            <span>{TYPE_ABSENCE_LABELS[type]}</span>
          </span>
        );
      },
      sortable: false
    },
    {
      key: 'dateDebut',
      label: 'Début',
      render: (a) => (
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            {new Date(a.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )
    },
    {
      key: 'dateFin',
      label: 'Fin',
      render: (a) => (
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            {new Date(a.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )
    },
    {
      key: 'dureeJours',
      label: 'Durée',
      render: (a) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold border border-emerald-200">
          <Clock className="w-3.5 h-3.5" />
          {a.dureeJours} jour{a.dureeJours > 1 ? 's' : ''}
        </span>
      )
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (a) => {
        const statutIcons = {
          DEMANDEE: <Clock className="w-4 h-4" />,
          VALIDEE: <CheckCircle2 className="w-4 h-4" />,
          REFUSEE: <XCircle className="w-4 h-4" />,
          ANNULEE: <Ban className="w-4 h-4" />
        };
        const statutColors = {
          DEMANDEE: 'bg-orange-100 text-orange-700 border-orange-300',
          VALIDEE: 'bg-green-100 text-green-700 border-green-300',
          REFUSEE: 'bg-red-100 text-red-700 border-red-300',
          ANNULEE: 'bg-gray-100 text-gray-700 border-gray-300'
        };
        const statut = a.statut as keyof typeof statutIcons;
        return (
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg font-semibold border-2 ${statutColors[statut] || statutColors.DEMANDEE}`}>
            {statutIcons[statut] || statutIcons.DEMANDEE}
            <span>{STATUT_ABSENCE_LABELS[statut]}</span>
          </span>
        );
      },
      sortable: false
    },
    {
      key: 'id',
      label: 'Actions',
      render: (a) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onView(a); }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shadow-sm border border-gray-200"
            title="Voir détails"
          >
            <Eye className="w-4 h-4" />
          </button>

          {permissions.canValidateAbsence(a) && (a.statut === 'DEMANDEE' || a.statut === 'VALIDEE') && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(a); }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm border border-blue-200"
              title="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {permissions.canValidateAbsence(a) && a.statut === 'DEMANDEE' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onValider(a.id); }}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors shadow-sm border border-green-200"
                title="Valider"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRefuser(a.id); }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shadow-sm border border-red-200"
                title="Refuser"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}

          {permissions.canValidateAbsence(a) && (a.statut === 'DEMANDEE' || a.statut === 'VALIDEE') && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shadow-sm border border-red-200"
              title="Supprimer (annuler)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
      sortable: false
    }
  ];

  return (
    <DataTable
      data={filteredAbsences}
      columns={columns}
      serverSide={true}
      totalItems={absencesTotal}
      currentPage={absencesPage}
      onPageChange={onPageChange}
      itemsPerPage={50}
    />
  );
};

export default AbsencesTab;
