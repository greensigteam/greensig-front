import React from 'react';
import { Edit2, Trash2, Eye, Star } from 'lucide-react';
import { DataTable, Column } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { OperateurList } from '../../types/users';
import { usePermissions } from '../../hooks/usePermissions';

interface OperateursTabProps {
  filteredOperateurs: OperateurList[];
  operateursTotal: number;
  operateursPage: number;
  onPageChange: (page: number) => void;
  onRowClick: (operateur: OperateurList) => void;
  onEdit: (operateur: OperateurList) => void;
  onDelete: (id: number) => void;
  onView: (id: number) => void;
  permissions: ReturnType<typeof usePermissions>;
}

const OperateursTab: React.FC<OperateursTabProps> = ({
  filteredOperateurs,
  operateursTotal,
  operateursPage,
  onPageChange,
  onRowClick,
  onEdit,
  onDelete,
  onView,
  permissions
}) => {
  const columns: Column<OperateurList>[] = [
    { key: 'numeroImmatriculation', label: 'Matricule' },
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'equipeNom', label: 'Équipe', render: (o) => o.equipeNom || '-' },
    {
      key: 'estChefEquipe',
      label: 'Chef',
      render: (o) => o.estChefEquipe ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
          <Star className="w-3 h-3" />
          Chef
        </span>
      ) : null,
      sortable: false
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (o) => <StatusBadge variant="status" type="operateur" value={o.statut || ''} />,
      sortable: false
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (o) => (
        <div className="flex gap-1">
          {permissions.canEditOperateur(o) && (
            <button
              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
              title="Modifier"
              onClick={(ev) => { ev.stopPropagation(); onEdit(o); }}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {permissions.canDeleteOperateur(o) && (
            <button
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title="Supprimer"
              onClick={(ev) => { ev.stopPropagation(); onDelete(o.id); }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {!permissions.canEditOperateur(o) && !permissions.canDeleteOperateur(o) && (
            <button
              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
              title="Voir détails"
              onClick={(ev) => { ev.stopPropagation(); onView(o.id); }}
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
      sortable: false
    }
  ];

  return (
    <DataTable
      data={filteredOperateurs}
      columns={columns}
      serverSide={true}
      totalItems={operateursTotal}
      currentPage={operateursPage}
      onPageChange={onPageChange}
      itemsPerPage={50}
      onRowClick={(op) => onRowClick(op)}
    />
  );
};

export default OperateursTab;
