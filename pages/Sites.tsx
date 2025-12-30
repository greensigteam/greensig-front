import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    MapPin, RefreshCw, Edit2, Trash2,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    AlertCircle, CheckCircle, Loader2, Plus,
    Settings, MoreVertical, Users, Filter
} from 'lucide-react';
import { fetchAllSites, updateSite, deleteSite, SiteFrontend } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useSearch } from '../contexts/SearchContext';
import SiteEditModal from '../components/sites/SiteEditModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';

// Composant Dropdown pour les actions
const ActionDropdown = ({
    onEdit,
    onDelete,
    onToggleActive,
    isActive
}: {
    onEdit: () => void,
    onDelete: () => void,
    onToggleActive: () => void,
    isActive: boolean
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
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
                <MoreVertical className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                        <Edit2 className="w-4 h-4" />
                        Modifier
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleActive(); setIsOpen(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
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
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                    </button>
                </div>
            )}
        </div>
    );
};

export default function Sites() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { searchQuery, setPlaceholder } = useSearch();
    const [sites, setSites] = useState<SiteFrontend[]>([]);
    const [filteredSites, setFilteredSites] = useState<SiteFrontend[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filtre statut: 'all', 'active', 'inactive'
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Edit modal
    const [editingSite, setEditingSite] = useState<SiteFrontend | null>(null);

    // Delete confirmation
    const [deletingSite, setDeletingSite] = useState<SiteFrontend | null>(null);

    // Set search placeholder
    useEffect(() => {
        setPlaceholder('Rechercher un site par nom, code, adresse ou propriétaire...');
    }, [setPlaceholder]);

    // Load sites
    const loadSites = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchAllSites(true); // Force refresh
            setSites(data);
        } catch (error: any) {
            showToast(error.message || 'Erreur lors du chargement des sites', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadSites();
    }, [loadSites]);

    // Filter sites
    useEffect(() => {
        let filtered = sites;

        // Filter by search (from global context)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(site =>
                site.name?.toLowerCase().includes(query) ||
                site.code_site?.toLowerCase().includes(query) ||
                site.adresse?.toLowerCase().includes(query) ||
                site.client_nom?.toLowerCase().includes(query)
            );
        }

        // Filter by status
        if (statusFilter === 'active') {
            filtered = filtered.filter(site => site.actif !== false);
        } else if (statusFilter === 'inactive') {
            filtered = filtered.filter(site => site.actif === false);
        }

        setFilteredSites(filtered);
        setCurrentPage(1);
    }, [sites, searchQuery, statusFilter]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredSites.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedSites = filteredSites.slice(startIndex, startIndex + itemsPerPage);

    // Handle site update
    const handleSiteUpdated = (updatedSite: SiteFrontend) => {
        setSites(prev => prev.map(s => s.id === updatedSite.id ? updatedSite : s));
    };

    // Handle toggle active
    const handleToggleActive = async (site: SiteFrontend) => {
        try {
            const updated = await updateSite(parseInt(site.id), { actif: !site.actif });
            setSites(prev => prev.map(s => s.id === updated.id ? updated : s));
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
            setSites(prev => prev.filter(s => s.id !== deletingSite.id));
            showToast('Site supprimé avec succès', 'success');
            setDeletingSite(null);
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la suppression', 'error');
        }
    };

    const handleCreateSite = () => {
        showToast("Pour créer un site, veuillez le dessiner sur la carte.", "info");
        navigate('/map');
    };

    return (
        <div className="p-6 space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">

                {/* Left: Status Filters */}
                <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${statusFilter === 'all'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Tous
                    </button>
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${statusFilter === 'active'
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Actifs
                    </button>
                    <button
                        onClick={() => setStatusFilter('inactive')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${statusFilter === 'inactive'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Inactifs
                    </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 hidden sm:inline-block mr-2">
                        {filteredSites.length} site{filteredSites.length > 1 ? 's' : ''}
                    </span>

                    <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

                    <button
                        onClick={loadSites}
                        disabled={isLoading}
                        className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Actualiser"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={handleCreateSite}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau Site
                    </button>
                </div>
            </div>

            {/* Sites Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    </div>
                ) : paginatedSites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <MapPin className="w-12 h-12 mb-4 text-gray-300" />
                        <p className="text-lg font-medium">Aucun site trouvé</p>
                        <p className="text-sm">
                            {searchQuery ? 'Essayez avec d\'autres termes de recherche' : 'Aucun site ne correspond aux filtres'}
                        </p>
                    </div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[25%]">
                                        Site
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[20%]">
                                        Propriétaire
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[25%]">
                                        Adresse
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]">
                                        Superficie
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-[10%]">
                                        Statut
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-[5%]">
                                        <Settings className="w-4 h-4 ml-auto text-gray-400" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedSites.map((site) => (
                                    <tr key={site.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <Link to={`/sites/${site.id}`} className="flex items-center gap-3 group-hover:text-emerald-600 transition-colors">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors flex-shrink-0">
                                                    <MapPin className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <span className="font-medium text-gray-900 group-hover:text-emerald-700 truncate">
                                                    {site.name}
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Users className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm truncate max-w-[200px]" title={site.client_nom || 'Non assigné'}>
                                                    {site.client_nom || <span className="text-gray-400 italic">Non assigné</span>}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600 line-clamp-1" title={site.adresse}>
                                                {site.adresse || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600 font-mono font-medium bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                                {site.superficie_calculee || site.superficie_totale
                                                    ? `${(site.superficie_calculee || site.superficie_totale)!.toLocaleString()} m²`
                                                    : '-'
                                                }
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${site.actif !== false
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                    }`}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full ${site.actif !== false ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                {site.actif !== false ? 'Actif' : 'Inactif'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ActionDropdown
                                                onEdit={() => setEditingSite(site)}
                                                onDelete={() => setDeletingSite(site)}
                                                onToggleActive={() => handleToggleActive(site)}
                                                isActive={site.actif !== false}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Affichage {startIndex + 1} à {Math.min(startIndex + itemsPerPage, filteredSites.length)} sur {filteredSites.length}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronsLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-3 py-1 text-sm">Page {currentPage} sur {totalPages > 0 ? totalPages : 1}</span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronsRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
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
