import { Utilisateur, NomRole, NOM_ROLE_LABELS } from '../types/users';
import {
  CreateAdminModal,
  CreateClientModal,
  CreateChefEquipeModal,
  UserTypeMenu,
} from '../components/users/CreateUserModals';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import { UserDetailModalSelector } from '../components/users/UserDetailModals';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { Users as UsersIcon, UserCheck, Shield, Building2, Award, Check } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import LoadingScreen from '../components/LoadingScreen';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';
import { useUtilisateursQuery, useClientsQuery } from '../hooks/queries/useUsersQueries';
import { useUpdateUtilisateur, useDeleteUtilisateur } from '../hooks/mutations/useUsersMutations';
import EditUserModal from '../components/users/EditUserModal';
import UserActionDropdown from '../components/users/UserActionDropdown';

// ============================================================================
// COMPOSANT - Carte Statistiques
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
    <div className="text-sm font-medium text-slate-500 mb-1">{label}</div>
    <div className="text-3xl font-bold text-slate-800">{value}</div>
    <div className={`absolute top-4 right-4 p-2 rounded-lg ${color}`}>{icon}</div>
  </div>
);

// ============================================================================
// COMPOSANT PRINCIPAL - Users
// ============================================================================

interface UsersProps {
  triggerCreate?: number;
}

const Users: React.FC<UsersProps> = ({ triggerCreate }) => {
  const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Data (React Query)
  const utilisateursQuery = useUtilisateursQuery();
  const clientsQuery = useClientsQuery();
  const utilisateurs = utilisateursQuery.data?.results ?? [];
  const clients = clientsQuery.data?.results ?? [];
  const loading = utilisateursQuery.isLoading || clientsQuery.isLoading;

  // Mutations
  const updateUserMutation = useUpdateUtilisateur();
  const deleteUserMutation = useDeleteUtilisateur();

  // Force-refresh helper for child modal callbacks
  const refreshUsers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.utilisateurs.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
  }, [queryClient]);

  // Stats derived from utilisateurs list
  const stats = useMemo(() => {
    if (!utilisateursQuery.data) return null;
    const total = utilisateurs.length;
    const actifs = utilisateurs.filter((u) => u.actif).length;
    const parRoleCounts: Record<string, number> = {};
    Object.keys(NOM_ROLE_LABELS).forEach((r) => {
      parRoleCounts[r] = 0;
    });
    utilisateurs.forEach((u) => {
      (u.roles || []).forEach((r) => {
        parRoleCounts[r] = (parRoleCounts[r] || 0) + 1;
      });
    });
    return {
      total,
      actifs,
      admins: parRoleCounts['ADMIN'] || 0,
      clients: parRoleCounts['CLIENT'] || 0,
      superviseurs: parRoleCounts['SUPERVISEUR'] || 0,
    };
  }, [utilisateurs, utilisateursQuery.data]);

  // Modals
  const [showUserTypeMenu, setShowUserTypeMenu] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateChefEquipe, setShowCreateChefEquipe] = useState(false);
  const [selectedAdminUser, setSelectedAdminUser] = useState<Utilisateur | null>(null);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  // Handler pour la sélection du type d'utilisateur
  const handleUserTypeSelect = (type: NomRole) => {
    setShowUserTypeMenu(false);
    switch (type) {
      case 'ADMIN':
        setShowCreateAdmin(true);
        break;
      case 'CLIENT':
        setShowCreateClient(true);
        break;
      case 'SUPERVISEUR':
        setShowCreateChefEquipe(true);
        break;
    }
  };

  // Set search placeholder and cleanup on unmount
  useEffect(() => {
    setPlaceholder('Rechercher un utilisateur (nom, prénom, email)...');
    return () => {
      setPlaceholder('Rechercher...');
      setSearchQuery('');
    };
  }, [setPlaceholder, setSearchQuery]);

  // Handle external trigger to open create modal
  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) {
      setShowUserTypeMenu(true);
    }
  }, [triggerCreate]);

  // Handlers
  const handleToggleActive = async (id: number, actif: boolean) => {
    try {
      if (actif) {
        await updateUserMutation.mutateAsync({ id, data: { actif: true } });
      } else {
        await deleteUserMutation.mutateAsync(id);
      }
      setSelectedAdminUser(null);
    } catch (error) {
      showToast('Erreur lors de la modification du statut', 'error');
    }
  };

  const handleRowClick = (user: Utilisateur) => {
    // Show detail modal for all user types
    // UserDetailModalSelector will choose the appropriate modal based on role
    setSelectedAdminUser(user);
  };

  // Filtre par rôle
  const [roleFilter, setRoleFilter] = useState<NomRole | null>(null);
  const filteredUsers = utilisateurs.filter((u) => {
    // Filter by role
    if (roleFilter && !(u.roles && u.roles.includes(roleFilter))) return false;

    // Filter by search (from header)
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        u.nom.toLowerCase().includes(search) ||
        u.prenom.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        (u.fullName && u.fullName.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Columns - Mêmes colonnes pour tous les onglets (affichage des infos utilisateur)
  const columns = [
    {
      key: 'prenom',
      label: 'Prénom',
      render: (u: Utilisateur) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              u.roles.includes('ADMIN')
                ? 'bg-purple-100'
                : u.roles.includes('SUPERVISEUR')
                  ? 'bg-blue-100'
                  : u.roles.includes('CLIENT')
                    ? 'bg-green-100'
                    : 'bg-gray-100'
            }`}
          >
            {u.roles.includes('ADMIN') ? (
              <Shield className="w-4 h-4 text-purple-600" />
            ) : u.roles.includes('SUPERVISEUR') ? (
              <UserCheck className="w-4 h-4 text-blue-600" />
            ) : (
              <Building2 className="w-4 h-4 text-green-600" />
            )}
          </div>
          <span className="font-medium text-gray-900">{u.prenom}</span>
        </div>
      ),
    },
    {
      key: 'nom',
      label: 'Nom',
      render: (u: Utilisateur) => (
        <div>
          <p className="font-medium text-gray-900">{u.nom}</p>
          <p className="text-xs text-gray-500">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (u: Utilisateur) =>
        u.roles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {u.roles.slice(0, 5).map((role: NomRole) => (
              <StatusBadge key={role} variant="role" value={role} />
            ))}
            {u.roles.length > 5 && (
              <span className="text-xs text-gray-500">+{u.roles.length - 5}</span>
            )}
          </div>
        ) : (
          '-'
        ),
      sortable: false,
    },
    {
      key: 'dateCreation',
      label: 'Cree le',
      render: (u: Utilisateur) => new Date(u.dateCreation).toLocaleDateString('fr-FR'),
    },
    {
      key: 'actif',
      label: 'Statut',
      render: (u: Utilisateur) => (
        <StatusBadge
          variant="boolean"
          value={u.actif}
          labels={{ true: 'Actif', false: 'Inactif' }}
        />
      ),
      sortable: false,
    },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50">
        <LoadingScreen isLoading={true} loop={true} minDuration={0} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex flex-col">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 flex-shrink-0">
          <StatCard
            icon={<UsersIcon className="w-5 h-5 text-gray-600" />}
            label="Total"
            value={stats.total}
            color="bg-gray-100"
          />
          <StatCard
            icon={<Check className="w-5 h-5 text-green-600" />}
            label="Actifs"
            value={stats.actifs}
            color="bg-green-100"
          />
          <StatCard
            icon={<Shield className="w-5 h-5 text-purple-600" />}
            label="Admins"
            value={stats.admins}
            color="bg-purple-100"
          />
          <StatCard
            icon={<Award className="w-5 h-5 text-yellow-600" />}
            label="Superviseurs"
            value={stats.superviseurs}
            color="bg-yellow-100"
          />
          <StatCard
            icon={<Building2 className="w-5 h-5 text-green-600" />}
            label="Clients"
            value={stats.clients}
            color="bg-green-100"
          />
        </div>
      )}

      {/* Filtres */}
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Filtrer par rôle :</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setRoleFilter(null)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                !roleFilter
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setRoleFilter('ADMIN')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                roleFilter === 'ADMIN'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
            <button
              onClick={() => setRoleFilter('SUPERVISEUR')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                roleFilter === 'SUPERVISEUR'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Superviseur
            </button>
            <button
              onClick={() => setRoleFilter('CLIENT')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                roleFilter === 'CLIENT'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Client
            </button>
          </div>
        </div>

        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{filteredUsers.length}</span> utilisateur
          {filteredUsers.length > 1 ? 's' : ''}
          {(searchQuery || roleFilter) && <span className="text-emerald-600 ml-1">(filtrés)</span>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-lg border border-gray-200">
        <DataTable
          data={filteredUsers}
          columns={[
            ...columns,
            {
              key: 'actions',
              label: 'Actions',
              render: (user: Utilisateur) => (
                <UserActionDropdown
                  user={user}
                  onView={() => handleRowClick(user)}
                  onEdit={() => setEditingUser(user)}
                  onDelete={() => setDeleteUserId(Number(user.id))}
                />
              ),
              sortable: false,
            },
          ]}
          itemsPerPage={10}
          onRowClick={handleRowClick}
        />
      </div>

      {/* Modals */}
      {showUserTypeMenu && (
        <UserTypeMenu onSelect={handleUserTypeSelect} onClose={() => setShowUserTypeMenu(false)} />
      )}

      {showCreateAdmin && (
        <CreateAdminModal onClose={() => setShowCreateAdmin(false)} onCreated={refreshUsers} />
      )}

      {showCreateClient && (
        <CreateClientModal onClose={() => setShowCreateClient(false)} onCreated={refreshUsers} />
      )}

      {showCreateChefEquipe && (
        <CreateChefEquipeModal
          onClose={() => setShowCreateChefEquipe(false)}
          onCreated={refreshUsers}
        />
      )}

      {selectedAdminUser && (
        <UserDetailModalSelector
          user={selectedAdminUser}
          clients={clients}
          onClose={() => setSelectedAdminUser(null)}
          onEdit={(user) => {
            setSelectedAdminUser(null);
            setEditingUser(user);
          }}
          onToggleActive={handleToggleActive}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          clients={clients}
          onClose={() => setEditingUser(null)}
          onUpdated={refreshUsers}
        />
      )}

      {deleteUserId && (
        <ConfirmDeleteModal
          title="Désactiver l'utilisateur ?"
          message="Êtes-vous sûr de vouloir désactiver cet utilisateur ? Son compte ne sera plus accessible."
          onConfirm={async () => {
            await deleteUserMutation.mutateAsync(deleteUserId);
          }}
          onCancel={() => setDeleteUserId(null)}
          confirmText="Désactiver"
          cancelText="Annuler"
        />
      )}
    </div>
  );
};

export default Users;
