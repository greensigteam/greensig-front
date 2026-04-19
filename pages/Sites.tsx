import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  RefreshCw,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
  MoreVertical,
  Users,
  Lock,
} from 'lucide-react';
import { fetchAllSites, updateSite, deleteSite, SiteFrontend } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useSearch } from '../contexts/SearchContext';
import SiteEditModal from '../components/sites/SiteEditModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import { fetchCurrentUser } from '../services/usersApi';
import { usePermissions } from '../hooks/usePermissions';
import type { User, Role } from '../types';
import { queryKeys } from '../lib/queryKeys';

// Composant Dropdown pour les actions
const ActionDropdown = ({
  onEdit,
  onDelete,
  onToggleActive,
  isActive,
}: {
  onEdit: () => void;
  onDelete?: () => void; // Optional - only ADMIN can delete
  onToggleActive: () => void;
  isActive: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Modifier
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            {isActive ? (
              <>
                <AlertCircle className="w-4 h-4 text-orange-500" />
                Désactiver
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Activer
              </>
            )}
          </button>
          {onDelete && (
            <>
              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default function Sites() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filtre statut persisté dans l'URL
  const statusFilter = (searchParams.get('status') as 'all' | 'active' | 'inactive') || 'active';
  const setStatusFilter = (value: 'all' | 'active' | 'inactive') => {
    setSearchParams((prev) => {
      prev.set('status', value);
      prev.set('page', '1');
      return prev;
    });
  };

  // Pagination persistée dans l'URL
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const setCurrentPage = (page: number) => {
    setSearchParams((prev) => {
      prev.set('page', String(page));
      return prev;
    });
  };
  const itemsPerPage = 10;

  // Edit / Delete modals (état local — éphémère, pas besoin de persister)
  const [editingSite, setEditingSite] = useState<SiteFrontend | null>(null);
  const [deletingSite, setDeletingSite] = useState<SiteFrontend | null>(null);

  // Données utilisateur courant via React Query
  const { data: currentUser } = useQuery({
    queryKey: queryKeys.user.current,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  // Convert Utilisateur to User format for usePermissions
  const userForPermissions = useMemo((): User | null => {
    if (!currentUser) return null;
    // Determine primary role with priority: ADMIN > SUPERVISEUR > CLIENT
    let role: Role = 'CLIENT';
    if (currentUser.roles?.includes('ADMIN')) role = 'ADMIN';
    else if (currentUser.roles?.includes('SUPERVISEUR')) role = 'SUPERVISEUR';
    else if (currentUser.roles?.includes('CLIENT')) role = 'CLIENT';

    return {
      id: currentUser.id.toString(),
      name: currentUser.fullName || `${currentUser.prenom} ${currentUser.nom}`,
      email: currentUser.email,
      role,
    };
  }, [currentUser]);

  // Get permissions with extended info for superviseur_id
  const permissions = usePermissions(userForPermissions, {
    superviseur_id: currentUser?.superviseur_id ?? undefined,
    client_structure_id: currentUser?.client_structure_id ?? undefined,
  });

  // Helper to check if current user can edit a specific site
  const canEditSite = useCallback(
    (site: SiteFrontend): boolean => {
      if (permissions.isAdmin) return true;
      if (permissions.isSuperviseur) {
        // SUPERVISEUR can only edit sites they supervise
        const superviseurId = currentUser?.superviseur_id;
        return superviseurId ? site.superviseur === superviseurId : false;
      }
      return false;
    },
    [permissions, currentUser],
  );

  // Helper to check if current user can delete a specific site
  const canDeleteSite = useCallback(
    (_site: SiteFrontend): boolean => {
      // Only ADMIN can delete sites
      return permissions.isAdmin;
    },
    [permissions],
  );

  // Set search placeholder and cleanup on unmount
  React.useEffect(() => {
    setPlaceholder('Rechercher un site par nom, code, adresse ou propriétaire...');
    return () => {
      setPlaceholder('Rechercher...');
      setSearchQuery('');
    };
  }, [setPlaceholder, setSearchQuery]);

  // Données sites via React Query (cache 2 min, pas de refetch inutile)
  const {
    data: sites = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.sites.list(),
    queryFn: fetchAllSites,
    staleTime: 2 * 60 * 1000,
  });

  // Filtrage dérivé (pas de useState+useEffect — calculé à chaque render)
  const filteredSites = useMemo(() => {
    let filtered = sites;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (site) =>
          site.name?.toLowerCase().includes(query) ||
          site.code_site?.toLowerCase().includes(query) ||
          site.adresse?.toLowerCase().includes(query) ||
          site.client_nom?.toLowerCase().includes(query),
      );
    }
    if (statusFilter === 'active') filtered = filtered.filter((s) => s.actif !== false);
    else if (statusFilter === 'inactive') filtered = filtered.filter((s) => s.actif === false);
    return filtered;
  }, [sites, searchQuery, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSites.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSites = filteredSites.slice(startIndex, startIndex + itemsPerPage);

  const invalidateSites = () => queryClient.invalidateQueries({ queryKey: queryKeys.sites.list() });

  // Handle site update
  const handleSiteUpdated = (_updatedSite: SiteFrontend) => {
    invalidateSites();
  };

  // Handle toggle active
  const handleToggleActive = async (site: SiteFrontend) => {
    try {
      const updated = await updateSite(parseInt(site.id), { actif: !site.actif });
      invalidateSites();
      showToast(`Site ${updated.actif ? 'activé' : 'désactivé'}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la mise à jour', 'error');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingSite) return;
    try {
      await deleteSite(parseInt(deletingSite.id));
      invalidateSites();
      showToast('Site supprimé avec succès', 'success');
      setDeletingSite(null);
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la suppression', 'error');
    }
  };

  return (
    <div className="flex flex-col">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          {/* Left: Status Filters */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                statusFilter === 'active'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Actifs
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Inactifs
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:inline-block mr-2">
              {filteredSites.length} site{filteredSites.length > 1 ? 's' : ''}
            </span>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sites Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : paginatedSites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <MapPin className="w-12 h-12 mb-4 text-slate-300" />
              <p className="text-lg font-medium">Aucun site trouvé</p>
              <p className="text-sm">
                {searchQuery
                  ? "Essayez avec d'autres termes de recherche"
                  : 'Aucun site ne correspond aux filtres'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Site
                      </th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Propriétaire
                      </th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                        Adresse
                      </th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                        Superficie
                      </th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-center text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-right text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <Settings className="w-4 h-4 ml-auto text-slate-400" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedSites.map((site) => (
                      <tr key={site.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <Link
                            to={`/sites/${site.id}`}
                            className="flex items-center gap-2 md:gap-3 group-hover:text-emerald-600 transition-colors"
                          >
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors flex-shrink-0">
                              <MapPin className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                            </div>
                            <span className="font-medium text-xs md:text-sm text-slate-800 group-hover:text-emerald-700 truncate max-w-[120px] md:max-w-none">
                              {site.name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Users className="w-4 h-4 text-slate-400 hidden md:block" />
                            <span
                              className="text-xs md:text-sm truncate max-w-[120px] md:max-w-[200px]"
                              title={site.client_nom || 'Non assigné'}
                            >
                              {site.client_nom || (
                                <span className="text-slate-400 italic">Non assigné</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 hidden md:table-cell">
                          <span
                            className="text-sm text-slate-600 line-clamp-1"
                            title={site.adresse}
                          >
                            {site.adresse || '-'}
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 hidden sm:table-cell">
                          <span className="text-xs md:text-sm text-slate-600 font-mono font-medium bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            {site.superficie_calculee || site.superficie_totale
                              ? `${(site.superficie_calculee || site.superficie_totale)!.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`
                              : '-'}
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              site.actif !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${site.actif !== false ? 'bg-emerald-500' : 'bg-slate-400'}`}
                            />
                            {site.actif !== false ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                          {canEditSite(site) ? (
                            <ActionDropdown
                              onEdit={() => setEditingSite(site)}
                              onDelete={
                                canDeleteSite(site) ? () => setDeletingSite(site) : undefined
                              }
                              onToggleActive={() => handleToggleActive(site)}
                              isActive={site.actif !== false}
                            />
                          ) : (
                            <div
                              className="flex items-center justify-end text-slate-400"
                              title="Vous n'avez pas les permissions pour modifier ce site"
                            >
                              <Lock className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 md:px-6 py-2 md:py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] md:text-sm text-slate-600 whitespace-nowrap">
                    <span className="hidden sm:inline">Affichage </span>
                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredSites.length)}
                    <span className="hidden sm:inline"> sur</span>
                    <span className="sm:hidden">/</span> {filteredSites.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 text-sm text-slate-600">
                      Page {currentPage} sur {totalPages > 0 ? totalPages : 1}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingSite && (
        <SiteEditModal
          site={editingSite}
          isOpen={!!editingSite}
          onClose={() => setEditingSite(null)}
          onSaved={handleSiteUpdated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingSite && (
        <ConfirmDeleteModal
          title="Supprimer le site"
          message={`Êtes-vous sûr de vouloir supprimer le site "${deletingSite.name}" ? Cette action est irréversible. Tous les objets associés à ce site seront également supprimés.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingSite(null)}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}
    </div>
  );
}
