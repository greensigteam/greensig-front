import React, { useState, useEffect, useCallback } from 'react';
import {
    MapPin, Search, RefreshCw, Edit2, Trash2, ToggleLeft, ToggleRight,
    ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Loader2, Plus
} from 'lucide-react';
import { fetchAllSites, updateSite, deleteSite, SiteFrontend } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import SiteEditModal from '../components/sites/SiteEditModal';

export default function Sites() {
    const { showToast } = useToast();
    const [sites, setSites] = useState<SiteFrontend[]>([]);
    const [filteredSites, setFilteredSites] = useState<SiteFrontend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Edit modal
    const [editingSite, setEditingSite] = useState<SiteFrontend | null>(null);

    // Delete confirmation
    const [deletingSite, setDeletingSite] = useState<SiteFrontend | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(site =>
                site.name?.toLowerCase().includes(query) ||
                site.code_site?.toLowerCase().includes(query) ||
                site.adresse?.toLowerCase().includes(query)
            );
        }

        // Filter by active status
        if (!showInactive) {
            filtered = filtered.filter(site => site.actif !== false);
        }

        setFilteredSites(filtered);
        setCurrentPage(1);
    }, [sites, searchQuery, showInactive]);

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

        setIsDeleting(true);
        try {
            await deleteSite(parseInt(deletingSite.id));
            setSites(prev => prev.filter(s => s.id !== deletingSite.id));
            showToast('Site supprimé avec succès', 'success');
            setDeletingSite(null);
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la suppression', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestion des Sites</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {filteredSites.length} site{filteredSites.length > 1 ? 's' : ''}
                        {!showInactive && sites.filter(s => s.actif === false).length > 0 &&
                            ` (${sites.filter(s => s.actif === false).length} inactif${sites.filter(s => s.actif === false).length > 1 ? 's' : ''} masqué${sites.filter(s => s.actif === false).length > 1 ? 's' : ''})`
                        }
                    </p>
                </div>
                <button
                    onClick={loadSites}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Actualiser
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
                {/* Search */}
                <div className="flex-1 min-w-[250px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher par nom, code ou adresse..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                </div>

                {/* Show inactive toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${showInactive ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 mt-1 ml-1 bg-white rounded-full transition-transform ${showInactive ? 'translate-x-4' : ''}`} />
                    </div>
                    <span className="text-sm text-gray-700">Afficher les inactifs</span>
                </label>
            </div>

            {/* Sites Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    </div>
                ) : paginatedSites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <MapPin className="w-12 h-12 mb-4 text-gray-300" />
                        <p className="text-lg font-medium">Aucun site trouvé</p>
                        <p className="text-sm">
                            {searchQuery ? 'Essayez avec d\'autres termes de recherche' : 'Importez des sites pour commencer'}
                        </p>
                    </div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Site
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Code
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Adresse
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Superficie
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Statut
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedSites.map((site) => (
                                    <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                    <MapPin className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{site.name}</p>
                                                    <p className="text-xs text-gray-500">ID: {site.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-mono text-gray-600">
                                                {site.code_site || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-600 line-clamp-2">
                                                {site.adresse || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-600">
                                                {site.superficie_totale
                                                    ? `${site.superficie_totale.toLocaleString()} m²`
                                                    : '-'
                                                }
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleToggleActive(site)}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                                    site.actif !== false
                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {site.actif !== false ? (
                                                    <>
                                                        <CheckCircle className="w-3 h-3" />
                                                        Actif
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertCircle className="w-3 h-3" />
                                                        Inactif
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingSite(site)}
                                                    className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title="Modifier"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeletingSite(site)}
                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                                <p className="text-sm text-gray-600">
                                    {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredSites.length)} sur {filteredSites.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm text-gray-600">
                                        Page {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
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
                <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto">
                    <div className="absolute inset-0 bg-black/50" onClick={() => !isDeleting && setDeletingSite(null)} />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Supprimer le site</h3>
                                <p className="text-sm text-gray-500">{deletingSite.name}</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Cette action est irréversible. Tous les objets associés à ce site seront également supprimés.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeletingSite(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Suppression...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Supprimer
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
