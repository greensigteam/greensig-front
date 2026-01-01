import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Users, RefreshCw, Edit2, Trash2, MoreVertical, Plus, Building2,
    Mail, Phone, MapPin, ChevronLeft, ChevronRight,
    AlertCircle, CheckCircle, Loader2, Download
} from 'lucide-react';
import { fetchStructures, updateStructure, deleteStructure, createStructure } from '../services/usersApi';
import type { StructureClient, StructureClientCreate, StructureClientUpdate } from '../types/users';
import { useToast } from '../contexts/ToastContext';
import { useSearch } from '../contexts/SearchContext';
import { StatusBadge } from '../components/StatusBadge';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import LoadingScreen from '../components/LoadingScreen';

// ============================================================================
// ACTION DROPDOWN COMPONENT
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
                                Desactiver
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
// CREATE/EDIT STRUCTURE MODAL
// ============================================================================

interface StructureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    structure?: StructureClient | null;
}

const StructureModal: React.FC<StructureModalProps> = ({ isOpen, onClose, onSave, structure }) => {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<StructureClientCreate>({
        nom: '',
        adresse: '',
        telephone: '',
        contactPrincipal: '',
        emailFacturation: '',
        logo: ''
    });

    useEffect(() => {
        if (structure) {
            setFormData({
                nom: structure.nom,
                adresse: structure.adresse || '',
                telephone: structure.telephone || '',
                contactPrincipal: structure.contactPrincipal || '',
                emailFacturation: structure.emailFacturation || '',
                logo: structure.logo || ''
            });
        } else {
            setFormData({
                nom: '',
                adresse: '',
                telephone: '',
                contactPrincipal: '',
                emailFacturation: '',
                logo: ''
            });
        }
    }, [structure, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nom.trim()) {
            showToast('Le nom de la structure est requis', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            if (structure) {
                await updateStructure(structure.id, formData as StructureClientUpdate);
                showToast('Structure mise a jour', 'success');
            } else {
                await createStructure(formData);
                showToast('Structure creee', 'success');
            }
            onSave();
            onClose();
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">
                        {structure ? 'Modifier la structure' : 'Nouvelle structure client'}
                    </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nom de la structure *
                        </label>
                        <input
                            type="text"
                            value={formData.nom}
                            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Nom de l'organisation"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Adresse
                        </label>
                        <textarea
                            value={formData.adresse}
                            onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            rows={2}
                            placeholder="Adresse complete"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Telephone
                            </label>
                            <input
                                type="tel"
                                value={formData.telephone}
                                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="+212 6 00 00 00 00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contact principal
                            </label>
                            <input
                                type="text"
                                value={formData.contactPrincipal}
                                onChange={(e) => setFormData({ ...formData, contactPrincipal: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Nom du contact"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email de facturation
                        </label>
                        <input
                            type="email"
                            value={formData.emailFacturation}
                            onChange={(e) => setFormData({ ...formData, emailFacturation: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="facturation@exemple.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            URL du logo
                        </label>
                        <input
                            type="url"
                            value={formData.logo || ''}
                            onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="https://exemple.com/logo.png"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {structure ? 'Mettre a jour' : 'Creer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Clients() {
    const { showToast } = useToast();
    const { searchQuery, setPlaceholder } = useSearch();

    // State management
    const [structures, setStructures] = useState<StructureClient[]>([]);
    const [filteredStructures, setFilteredStructures] = useState<StructureClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filtre statut
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modals
    const [editingStructure, setEditingStructure] = useState<StructureClient | null>(null);
    const [deletingStructure, setDeletingStructure] = useState<StructureClient | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Set search placeholder
    useEffect(() => {
        setPlaceholder('Rechercher une structure par nom, telephone, contact...');
    }, [setPlaceholder]);

    // Load structures
    const loadStructures = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchStructures({}, true);
            setStructures(data.results || []);
        } catch (error: any) {
            showToast(error.message || 'Erreur lors du chargement des structures', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadStructures();
    }, [loadStructures]);

    // Filter structures
    useEffect(() => {
        let filtered = structures;

        // Filter by status
        if (statusFilter === 'active') {
            filtered = filtered.filter(s => s.actif);
        } else if (statusFilter === 'inactive') {
            filtered = filtered.filter(s => !s.actif);
        }

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                s.nom.toLowerCase().includes(query) ||
                (s.telephone && s.telephone.toLowerCase().includes(query)) ||
                (s.contactPrincipal && s.contactPrincipal.toLowerCase().includes(query)) ||
                (s.adresse && s.adresse.toLowerCase().includes(query)) ||
                (s.emailFacturation && s.emailFacturation.toLowerCase().includes(query))
            );
        }

        setFilteredStructures(filtered);
        setCurrentPage(1);
    }, [structures, searchQuery, statusFilter]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredStructures.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStructures = useMemo(() => {
        return filteredStructures.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredStructures, startIndex, itemsPerPage]);

    // Handle toggle active
    const handleToggleActive = async (structure: StructureClient) => {
        try {
            await updateStructure(structure.id, { actif: !structure.actif });
            showToast(`Structure ${!structure.actif ? 'activee' : 'desactivee'}`, 'success');
            loadStructures();
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la mise a jour', 'error');
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deletingStructure) return;

        try {
            await deleteStructure(deletingStructure.id);
            showToast('Structure supprimee avec succes', 'success');
            setDeletingStructure(null);
            loadStructures();
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la suppression', 'error');
            throw error;
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Toolbar */}
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
                            Toutes ({structures.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-4 py-2 text-sm rounded-md transition-colors ${
                                statusFilter === 'active'
                                    ? 'bg-white shadow-sm text-gray-900 font-medium'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Actives ({structures.filter(s => s.actif).length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-4 py-2 text-sm rounded-md transition-colors ${
                                statusFilter === 'inactive'
                                    ? 'bg-white shadow-sm text-gray-900 font-medium'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Inactives ({structures.filter(s => !s.actif).length})
                        </button>
                    </div>

                    <span className="text-sm text-gray-500">
                        {filteredStructures.length} structure{filteredStructures.length > 1 ? 's' : ''}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadStructures}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Actualiser"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Nouvelle Structure
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {isLoading ? (
                    <div className="fixed inset-0 z-50">
                        <LoadingScreen isLoading={true} loop={true} minDuration={0} />
                    </div>
                ) : paginatedStructures.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">Aucune structure trouvee</p>
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
                                        Structure
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Utilisateurs
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Sites
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
                                {paginatedStructures.map(structure => (
                                    <tr
                                        key={structure.id}
                                        className="hover:bg-gray-50 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            {structure.logo ? (
                                                <img
                                                    src={structure.logo}
                                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                                                    alt={structure.nom}
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                    <Building2 className="w-5 h-5 text-emerald-600" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                to={`/structures/${structure.id}`}
                                                className="block group-hover:text-emerald-600 transition-colors"
                                            >
                                                <div className="font-medium text-gray-900 group-hover:text-emerald-600">
                                                    {structure.nom}
                                                </div>
                                                {structure.adresse && (
                                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate max-w-xs">
                                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                                        {structure.adresse}
                                                    </div>
                                                )}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {structure.contactPrincipal || '-'}
                                            </div>
                                            {structure.telephone && (
                                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Phone className="w-3 h-3" />
                                                    {structure.telephone}
                                                </div>
                                            )}
                                            {structure.emailFacturation && (
                                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Mail className="w-3 h-3" />
                                                    {structure.emailFacturation}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                                <Users className="w-4 h-4" />
                                                {structure.utilisateursCount}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                                                <MapPin className="w-4 h-4" />
                                                {structure.sitesCount}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusBadge
                                                variant="boolean"
                                                value={structure.actif}
                                                labels={{ true: 'Active', false: 'Inactive' }}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ActionDropdown
                                                onEdit={() => setEditingStructure(structure)}
                                                onDelete={() => setDeletingStructure(structure)}
                                                onToggleActive={() => handleToggleActive(structure)}
                                                isActive={structure.actif}
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
                                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredStructures.length)} sur {filteredStructures.length}
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
            <StructureModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSave={loadStructures}
            />

            {/* Edit Modal */}
            <StructureModal
                isOpen={!!editingStructure}
                onClose={() => setEditingStructure(null)}
                onSave={loadStructures}
                structure={editingStructure}
            />

            {/* Delete Confirmation Modal */}
            {deletingStructure && (
                <ConfirmDeleteModal
                    title={`Supprimer ${deletingStructure.nom} ?`}
                    message="Cette action supprimera la structure et tous ses utilisateurs associes."
                    onConfirm={handleDelete}
                    onCancel={() => setDeletingStructure(null)}
                />
            )}
        </div>
    );
}
