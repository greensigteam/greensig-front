import React, { useState, useEffect } from 'react';
import { Plus, Search, Package, Edit2, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { ProduitList, ProduitCreate } from '../types/suiviTaches';
import {
    fetchProduits,
    createProduit,
    updateProduit,
    softDeleteProduit
} from '../services/suiviTachesApi';
import ConfirmModal from '../components/ConfirmModal';
import CreateProduitModal from '../components/CreateProduitModal';
import EditProduitModal from '../components/EditProduitModal';

const Produits: React.FC = () => {
    const [produits, setProduits] = useState<ProduitList[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedProduit, setSelectedProduit] = useState<ProduitList | null>(null);

    // Notification/Confirm state
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: 'info' | 'success' | 'danger' | 'warning';
        confirmLabel?: string;
        onConfirm?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        variant: 'info'
    });

    useEffect(() => {
        loadProduits();
    }, []);

    const loadProduits = async () => {
        setLoading(true);
        try {
            const data = await fetchProduits();
            setProduits(data);
        } catch (error) {
            console.error(error);
            showNotification('Erreur', 'Impossible de charger les produits.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (title: string, message: string, variant: 'info' | 'success' | 'danger' | 'warning', onConfirm?: () => void) => {
        setModalConfig({
            isOpen: true,
            title,
            message,
            variant,
            onConfirm: onConfirm ? () => {
                onConfirm();
                setModalConfig(prev => ({ ...prev, isOpen: false }));
            } : undefined
        });
    };

    const handleCreate = async (data: ProduitCreate) => {
        try {
            await createProduit(data);
            showNotification('Succès', 'Produit créé avec succès.', 'success');
            loadProduits();
        } catch (error: any) {
            console.error(error);
            throw new Error(error.message || "Erreur lors de la création");
        }
    };

    const handleUpdate = async (id: number, data: Partial<ProduitCreate>) => {
        try {
            await updateProduit(id, data);
            showNotification('Succès', 'Produit mis à jour avec succès.', 'success');
            loadProduits();
        } catch (error: any) {
            console.error(error);
            throw new Error(error.message || "Erreur lors de la modification");
        }
    };

    const handleDelete = (id: number) => {
        showNotification(
            'Supprimer le produit ?',
            'Êtes-vous sûr de vouloir supprimer ce produit ? Il sera désactivé mais restera dans l\'historique.',
            'danger',
            async () => {
                try {
                    await softDeleteProduit(id);
                    await loadProduits();
                    showNotification('Succès', 'Produit supprimé avec succès.', 'success');
                } catch (error) {
                    console.error(error);
                    showNotification('Erreur', 'Erreur lors de la suppression.', 'danger');
                }
            }
        );
    };

    const openEditModal = (produit: ProduitList) => {
        setSelectedProduit(produit);
        setIsEditModalOpen(true);
    };

    const filteredProduits = produits.filter(p =>
        p.nom_produit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numero_homologation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cible?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">
                    Cette page est en cours de développement. Certaines fonctionnalités peuvent être limitées ou instables.
                </p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="w-8 h-8 text-emerald-600" />
                        Gestion des Produits
                    </h1>
                    <p className="text-gray-500 mt-1">Gérez le catalogue des produits phytosanitaires et engrais.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto mt-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un produit..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">Nouveau Produit</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 py-3 font-semibold text-sm text-gray-600">Nom du produit</th>
                                <th className="p-4 py-3 font-semibold text-sm text-gray-600">N° Homologation</th>
                                <th className="p-4 py-3 font-semibold text-sm text-gray-600">Validité</th>
                                <th className="p-4 py-3 font-semibold text-sm text-gray-600">Cible</th>
                                <th className="p-4 py-3 font-semibold text-sm text-gray-600">Statut</th>
                                <th className="p-4 py-3 font-semibold text-sm text-gray-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="animate-spin w-4 h-4 text-emerald-500" />
                                            Chargement...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProduits.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 bg-gray-50/30">
                                        Aucun produit trouvé.
                                    </td>
                                </tr>
                            ) : (
                                filteredProduits.map(produit => (
                                    <tr key={produit.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 font-medium text-slate-700">{produit.nom_produit}</td>
                                        <td className="p-4 text-sm text-slate-600">{produit.numero_homologation || '-'}</td>
                                        <td className="p-4 text-sm text-slate-600">
                                            {produit.date_validite ? new Date(produit.date_validite).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">{produit.cible || '-'}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${produit.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {produit.actif ? 'Actif' : 'Inactif'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(produit)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Modifier"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(produit.id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateProduitModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreate}
            />

            <EditProduitModal
                isOpen={isEditModalOpen}
                produit={selectedProduit}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleUpdate}
            />

            {modalConfig.isOpen && (
                <ConfirmModal
                    isOpen={modalConfig.isOpen}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    variant={modalConfig.variant}
                    confirmLabel={modalConfig.confirmLabel || 'OK'}
                    onConfirm={modalConfig.onConfirm || (() => setModalConfig(prev => ({ ...prev, isOpen: false })))}
                    onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                />
            )}
        </div>
    );
};

export default Produits;
