import React from 'react';
import { Edit2, Trash2, Eye } from 'lucide-react';
import { DataTable, Column } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { EquipeList } from '../../types/users';
import { usePermissions } from '../../hooks/usePermissions';

interface EquipesTabProps {
  filteredEquipes: EquipeList[];
  equipesTotal: number;
  equipesPage: number;
  onPageChange: (page: number) => void;
  onRowClick: (equipe: EquipeList) => void;
  onEdit: (equipe: EquipeList) => void;
  onDelete: (id: number) => void;
  onView: (id: number) => void;
  permissions: ReturnType<typeof usePermissions>;
}

const EquipesTab: React.FC<EquipesTabProps> = ({
  filteredEquipes,
  equipesTotal,
  equipesPage,
  onPageChange,
  onRowClick,
  onEdit,
  onDelete,
  onView,
  permissions
}) => {
  const columns: Column<EquipeList>[] = [
    { key: 'nomEquipe', label: 'Nom' },
    { key: 'chefEquipeNom', label: "Chef d'équipe", render: (e) => e.chefEquipeNom || '-' },
    { key: 'sitePrincipalNom', label: "Site principal", render: (e) => e.sitePrincipalNom || '-' },
    {
      key: 'nombreMembres',
      label: 'Membres',
      render: (e) => `${e.nombreMembres} membre${e.nombreMembres > 1 ? 's' : ''}`
    },
    {
      key: 'actif',
      label: 'Actif',
      render: (e) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          e.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {e.actif ? 'Actif' : 'Inactif'}
        </span>
      ),
      sortable: false
    },
    {
      key: 'statutOperationnel',
      label: 'Statut',
      render: (e) => <StatusBadge variant="status" type="equipe" value={e.statutOperationnel || ''} />,
      sortable: false
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (e) => (
        <div className="flex gap-1">
          {permissions.canEditTeam(e) && (
            <button
              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
              title="Modifier"
              onClick={(ev) => { ev.stopPropagation(); onEdit(e); }}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {permissions.canDeleteTeam(e) && (
            <button
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title="Supprimer"
              onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {!permissions.canEditTeam(e) && !permissions.canDeleteTeam(e) && (
            <button
              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
              title="Voir détails"
              onClick={(ev) => { ev.stopPropagation(); onView(e.id); }}
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
      data={filteredEquipes}
      columns={columns}
      serverSide={true}
      totalItems={equipesTotal}
      currentPage={equipesPage}
      onPageChange={onPageChange}
      itemsPerPage={50}
      onRowClick={(equipe) => onRowClick(equipe)}
    />
  );
};

export default EquipesTab;
