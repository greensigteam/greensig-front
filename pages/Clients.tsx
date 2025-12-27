import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Users, RefreshCw, Edit2, Trash2, MoreVertical, Plus, Building2,
    Mail, Phone, User, Shield, ChevronLeft, ChevronRight,
    AlertCircle, CheckCircle, Loader2, Download
} from 'lucide-react';
import { fetchClients, updateClient, deleteClient } from '../services/usersApi';
import type { Client, ClientUpdate } from '../types/users';
import { useToast } from '../contexts/ToastContext';
import { useSearch } from '../contexts/SearchContext';
import { StatusBadge } from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { CreateClientModal, EditClientModal } from '../components/clients/ClientModals';
import { exportClientsToCSV, exportClientsToExcel } from '../services/exportHelpers';

// ============================================================================
// ACTION DROPDOWN COMPONENT (Réutilisé de Sites.tsx)
// ============================================================================

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Clients() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { searchQuery, setPlaceholder } = useSearch();

    // State management
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filtre statut: 'all', 'active', 'inactive'
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Edit modal (sera implémenté en Phase 2)
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // Delete confirmation
    const [deletingClient, setDeletingClient] = useState<Client | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Create modal (sera implémenté en Phase 2)
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Set search placeholder
    useEffect(() => {
        setPlaceholder('Rechercher un client par nom, structure, email...');
    }, [setPlaceholder]);

    // Load clients
    const loadClients = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchClients(true); // Force refresh
            setClients(data.results || []);
        } catch (error: any) {
            showToast(error.message || 'Erreur lors du chargement des clients', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadClients();
    }, [loadClients]);

    // Filter clients
    useEffect(() => {
        let filtered = clients;

        // Filter by status
        if (statusFilter === 'active') {
            filtered = filtered.filter(c => c.actif);
        } else if (statusFilter === 'inactive') {
            filtered = filtered.filter(c => !c.actif);
        }

        // Filter by search (from global context)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(c =>
                c.nomStructure.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                `${c.nom} ${c.prenom}`.toLowerCase().includes(query) ||
                (c.telephone && c.telephone.toLowerCase().includes(query)) ||
                (c.adresse && c.adresse.toLowerCase().includes(query))
            );
        }

        setFilteredClients(filtered);
        setCurrentPage(1);
    }, [clients, searchQuery, statusFilter]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedClients = useMemo(() => {
        return filteredClients.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredClients, startIndex, itemsPerPage]);

    // Handle toggle active
    const handleToggleActive = async (client: Client) => {
        try {
            const updateData: ClientUpdate = {};
            await updateClient(client.utilisateur, { actif: !client.actif } as any);
            showToast(`Client ${!client.actif ? 'activé' : 'désactivé'}`, 'success');
            loadClients();
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la mise à jour', 'error');
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deletingClient) return;

        setIsDeleting(true);
        try {
            await deleteClient(deletingClient.utilisateur);
            showToast('Client supprimé avec succès', 'success');
            setDeletingClient(null);
            loadClients();
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la suppression', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    // Export handlers
    const handleExportCSV = () => {
        try {
            exportClientsToCSV(filteredClients);
            showToast(`Export CSV réussi (${filteredClients.length} clients)`, 'success');
        } catch (error) {
            showToast('Erreur lors de l\'export CSV', 'error');
        }
    };

    const handleExportExcel = async () => {
        try {
            await exportClientsToExcel(filteredClients);
            showToast(`Export Excel réussi (${filteredClients.length} clients)`, 'success');
        } catch (error) {
            showToast('Erreur lors de l\'export Excel', 'error');
        }
    };

    // Format date for display
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
            });
        } catch {
            return null;
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Toolbar avec filtres statut + actions */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                    {/* Status Filters */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-4 py-2 text-sm rounded-md transition-colors ${
                                statusFilter === 'all'
                                    ? 'bg-white shadow-sm text-gray-900 font-medium'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Tous ({clients.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-4 py-2 text-sm rounded-md transition-colors ${
                                statusFilter === 'active'
                                    ? 'bg-white shadow-sm text-gray-900 font-medium'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Actifs ({clients.filter(c => c.actif).length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-4 py-2 text-sm rounded-md transition-colors ${
                                statusFilter === 'inactive'
                                    ? 'bg-white shadow-sm text-gray-900 font-medium'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Inactifs ({clients.filter(c => !c.actif).length})
                        </button>
                    </div>

                    {/* Count badge */}
                    <span className="text-sm text-gray-500">
                        {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadClients}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Actualiser"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        CSV
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Excel
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Nouveau Client
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                        <p className="text-gray-500 mt-2">Chargement des clients...</p>
                    </div>
                ) : paginatedClients.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">Aucun client trouvé</p>
                        {searchQuery && (
                            <p className="text-sm mt-1">
                                Essayez d'ajuster votre recherche ou vos filtres
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Logo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Organisation / Contact
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Email (Identifiant)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Téléphone
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Connexion
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Statut
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedClients.map(client => (
                                    <tr
                                        key={client.utilisateur}
                                        className="hover:bg-gray-50 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            {client.logo ? (
                                                <img
                                                    src={client.logo}
                                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                                                    alt={client.nomStructure}
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                    <Building2 className="w-5 h-5 text-emerald-600" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                to={`/clients/${client.utilisateur}`}
                                                className="block group-hover:text-emerald-600 transition-colors"
                                            >
                                                <div className="font-medium text-gray-900 group-hover:text-emerald-600">
                                                    {client.nomStructure}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <User className="w-3 h-3" />
                                                    {client.prenom} {client.nom}
                                                </div>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{client.email}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                <Shield className="w-3 h-3" />
                                                Rôle CLIENT
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600">
                                                {client.telephone || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-xs text-gray-500">
                                                {client.utilisateurDetail?.derniereConnexion ? (
                                                    formatDate(client.utilisateurDetail.derniereConnexion)
                                                ) : (
                                                    <span className="text-amber-500 font-medium">Jamais</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusBadge
                                                variant="boolean"
                                                value={client.actif}
                                                labels={{ true: 'Actif', false: 'Inactif' }}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ActionDropdown
                                                onEdit={() => setEditingClient(client)}
                                                onDelete={() => setDeletingClient(client)}
                                                onToggleActive={() => handleToggleActive(client)}
                                                isActive={client.actif}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Afficher</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                                <span className="text-sm text-gray-600">par page</span>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-600">
                                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredClients.length)} sur {filteredClients.length}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateClientModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={loadClients}
                />
            )}

            {/* Edit Modal */}
            {editingClient && (
                <EditClientModal
                    isOpen={!!editingClient}
                    onClose={() => setEditingClient(null)}
                    client={editingClient}
                    onUpdated={loadClients}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingClient && (
                <ConfirmModal
                    isOpen={!!deletingClient}
                    onClose={() => setDeletingClient(null)}
                    onConfirm={handleDelete}
                    onCancel={() => setDeletingClient(null)}
                    title="Supprimer le client"
                    message={`Êtes-vous sûr de vouloir supprimer ${deletingClient.nomStructure} ? Cette action est irréversible.`}
                    confirmLabel="Supprimer"
                    variant="danger"
                    loading={isDeleting}
                />
            )}
        </div>
    );
}