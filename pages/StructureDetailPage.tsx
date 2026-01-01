import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Building2, User, Mail, Phone, MapPin, Shield, Calendar,
    Package, MapPin as MapPinIcon, ClipboardList, Edit, Loader2, AlertCircle,
    Plus, X as XIcon, Search, Users, UserPlus,
    MoreVertical, UserX, UserCheck
} from 'lucide-react';
import { fetchStructureById, fetchStructureUtilisateurs, addUserToStructure, updateStructure, deleteClient } from '../services/usersApi';
import { fetchAllSites, SiteFrontend, updateSite } from '../services/api';
import { planningService } from '../services/planningService';
import { fetchClientInventoryStats } from '../services/clientInventoryService';
import type { StructureClientDetail, ClientUser } from '../types/users';
import type { Tache } from '../types/planning';
import { useToast } from '../contexts/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { DetailRow, DetailGrid, DetailCard, DetailEmptyState } from '../components/DetailModal';
import LoadingWrapper from '../components/LoadingWrapper';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'general' | 'utilisateurs' | 'sites' | 'inventaire' | 'interventions';

interface InventoryStats {
    totalObjets: number;
    vegetation: {
        total: number;
        byType: Record<string, number>;
    };
    hydraulique: {
        total: number;
        byType: Record<string, number>;
    };
    bySite?: Array<{
        siteId: number;
        siteName: string;
        total: number;
        vegetation: number;
        hydraulique: number;
    }>;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// Menu d'actions avec portail pour éviter les problèmes d'overflow
const ActionMenu: React.FC<{
    isOpen: boolean;
    isActive: boolean;
    onToggle: () => void;
    onClose: () => void;
    onEdit: () => void;
    onToggleActive: () => void;
}> = ({ isOpen, isActive, onToggle, onClose, onEdit, onToggleActive }) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + 4,
                left: rect.right - 176 // 176px = w-44 (11rem)
            });
        }
    }, [isOpen]);

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Actions"
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {isOpen && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={onClose}
                    />
                    <div
                        className="fixed w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-[9999]"
                        style={{ top: menuPosition.top, left: menuPosition.left }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                        >
                            <Edit className="w-4 h-4 text-slate-500" />
                            Modifier
                        </button>
                        <hr className="my-1 border-slate-100" />
                        {isActive ? (
                            <button
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleActive();
                                }}
                            >
                                <UserX className="w-4 h-4" />
                                Désactiver
                            </button>
                        ) : (
                            <button
                                className="w-full px-3 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleActive();
                                }}
                            >
                                <UserCheck className="w-4 h-4" />
                                Activer
                            </button>
                        )}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

const LoadingScreen: React.FC = () => (
    <div className="fixed inset-0 z-50">
        <LoadingWrapper isLoading={true} />
    </div>
);

const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    badge?: number;
}> = ({ active, onClick, icon, label, badge }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
            active
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
        }`}
    >
        {icon}
        <span className="font-medium text-sm">{label}</span>
        {badge !== undefined && badge > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                {badge}
            </span>
        )}
    </button>
);

const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: string;
}> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        <div className="text-sm font-medium text-slate-500 mb-1">{title}</div>
        <div className="text-3xl font-bold text-slate-800">{value}</div>
        {icon && color && (
            <div className={`absolute top-4 right-4 w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                {icon}
            </div>
        )}
    </div>
);

// ============================================================================
// ONGLET GENERAL
// ============================================================================

const OngletGeneral: React.FC<{ structure: StructureClientDetail }> = ({ structure }) => {
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'Non disponible';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return 'Date invalide';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLONNE GAUCHE - Informations principales */}
            <div className="lg:col-span-2 space-y-6">
                {/* ORGANISATION */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h2 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                        Organisation
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-1">Nom de la structure</p>
                            <p className="text-sm font-bold text-slate-800">{structure.nom}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-1">Contact principal</p>
                            <p className="text-sm font-bold text-slate-800">{structure.contactPrincipal || '—'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-1">Téléphone</p>
                            <p className="text-sm font-bold text-slate-800">{structure.telephone || '—'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-1">Email facturation</p>
                            <p className="text-sm font-bold text-slate-800 truncate">{structure.emailFacturation || '—'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 sm:col-span-2">
                            <p className="text-xs font-medium text-slate-500 mb-1">Adresse</p>
                            <p className="text-sm font-bold text-slate-800">{structure.adresse || '—'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* COLONNE DROITE - Stats, Statut, Logo */}
            <div className="space-y-6">
                {/* STATISTIQUES - Style Dashboard */}
                <div className="grid grid-cols-2 gap-4">
                    <StatCard title="Utilisateurs" value={structure.utilisateursCount} />
                    <StatCard title="Sites" value={structure.sitesCount} />
                </div>

                {/* STATUT */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h2 className="font-bold text-lg text-slate-800 mb-4">Statut</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-sm text-slate-500">Structure</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                structure.actif
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-700'
                            }`}>
                                {structure.actif ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-sm text-slate-500">Créée le</span>
                            <span className="text-sm font-bold text-slate-800">
                                {formatDate(structure.dateCreation)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* LOGO */}
                {structure.logo && (
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-800 mb-4">Logo de l'organisation</h2>
                        <div className="flex items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <img
                                src={structure.logo}
                                alt={structure.nom}
                                className="max-w-full max-h-32 object-contain"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// ONGLET UTILISATEURS
// ============================================================================

const OngletUtilisateurs: React.FC<{
    utilisateurs: ClientUser[];
    structureId: number;
    onRefresh: () => void;
    isLoading: boolean;
    showAddModal: boolean;
    setShowAddModal: (show: boolean) => void;
}> = ({ utilisateurs, structureId, onRefresh, isLoading, showAddModal, setShowAddModal }) => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [togglingUser, setTogglingUser] = useState<ClientUser | null>(null);
    const [editingUser, setEditingUser] = useState<ClientUser | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

    // Form state for adding user
    const [formData, setFormData] = useState({
        email: '',
        nom: '',
        prenom: '',
        password: ''
    });

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !formData.nom || !formData.prenom || !formData.password) {
            showToast('Veuillez remplir tous les champs', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await addUserToStructure(structureId, formData);
            showToast('Utilisateur ajoute avec succes', 'success');
            setShowAddModal(false);
            setFormData({ email: '', nom: '', prenom: '', password: '' });
            onRefresh();
        } catch (error: any) {
            // Extraire tous les messages d'erreur de validation
            let errorMessage = 'Erreur lors de l\'ajout';
            if (error.data) {
                const errorMessages: string[] = [];
                if (error.data.email) errorMessages.push(`Email: ${error.data.email[0]}`);
                if (error.data.password) errorMessages.push(`Mot de passe: ${error.data.password[0]}`);
                if (error.data.nom) errorMessages.push(`Nom: ${error.data.nom[0]}`);
                if (error.data.prenom) errorMessages.push(`Prénom: ${error.data.prenom[0]}`);
                if (error.data.detail) errorMessages.push(error.data.detail);
                if (error.data.non_field_errors) errorMessages.push(error.data.non_field_errors[0]);
                if (errorMessages.length > 0) {
                    errorMessage = errorMessages.join(' | ');
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            showToast(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleUserActive = async () => {
        if (!togglingUser) return;
        try {
            // Toggle the active status using updateUtilisateur
            const { updateUtilisateur } = await import('../services/usersApi');
            await updateUtilisateur(togglingUser.utilisateur, { actif: !togglingUser.actif });
            showToast(
                togglingUser.actif ? 'Utilisateur désactivé' : 'Utilisateur activé',
                'success'
            );
            setTogglingUser(null);
            onRefresh();
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la modification', 'error');
        }
    };

    const handleEditUser = async (data: { nom: string; prenom: string; email: string }) => {
        if (!editingUser) return;
        try {
            // Update user info using updateUtilisateur
            const { updateUtilisateur } = await import('../services/usersApi');
            await updateUtilisateur(editingUser.utilisateur, data);
            showToast('Utilisateur modifié avec succès', 'success');
            setEditingUser(null);
            onRefresh();
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la modification', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-100 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Liste des utilisateurs */}
            {utilisateurs.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12">
                    <div className="text-center text-slate-500 flex flex-col items-center">
                        <Users className="w-12 h-12 text-slate-200 mb-3" />
                        <p className="font-medium text-slate-800">Aucun utilisateur</p>
                        <p className="text-sm text-slate-500 mt-1">Cette structure n'a pas encore d'utilisateurs.</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-600" />
                            Utilisateurs ({utilisateurs.length})
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {utilisateurs.map((user) => (
                            <div
                                key={user.utilisateur}
                                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
                                onClick={() => navigate(`/structures/${structureId}/utilisateurs/${user.utilisateur}`)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <User className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{user.prenom} {user.nom}</p>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                        user.actif
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-red-100 text-red-700'
                                    }`}>
                                        {user.actif ? 'Actif' : 'Inactif'}
                                    </span>
                                    <ActionMenu
                                        isOpen={openActionMenu === user.utilisateur}
                                        isActive={user.actif}
                                        onToggle={() => setOpenActionMenu(openActionMenu === user.utilisateur ? null : user.utilisateur)}
                                        onClose={() => setOpenActionMenu(null)}
                                        onEdit={() => {
                                            setEditingUser(user);
                                            setOpenActionMenu(null);
                                        }}
                                        onToggleActive={() => {
                                            setTogglingUser(user);
                                            setOpenActionMenu(null);
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Ajouter Utilisateur */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Ajouter un utilisateur</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Prénom *
                                </label>
                                <input
                                    type="text"
                                    value={formData.prenom}
                                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                                    placeholder="Jean"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nom *
                                </label>
                                <input
                                    type="text"
                                    value={formData.nom}
                                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                                    placeholder="Dupont"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Email (identifiant) *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                                    placeholder="jean.dupont@exemple.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Mot de passe *
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                                    placeholder="********"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Ajouter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Confirmation Activation/Désactivation */}
            {togglingUser && (
                <ConfirmDeleteModal
                    title={togglingUser.actif
                        ? `Désactiver ${togglingUser.prenom} ${togglingUser.nom} ?`
                        : `Activer ${togglingUser.prenom} ${togglingUser.nom} ?`
                    }
                    message={togglingUser.actif
                        ? "Cet utilisateur ne pourra plus se connecter à cette structure."
                        : "Cet utilisateur pourra à nouveau se connecter à cette structure."
                    }
                    onConfirm={handleToggleUserActive}
                    onCancel={() => setTogglingUser(null)}
                    confirmText={togglingUser.actif ? "Désactiver" : "Activer"}
                    cancelText="Annuler"
                />
            )}

            {/* Modal Modifier Utilisateur */}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleEditUser}
                />
            )}
        </div>
    );
};

// Modal d'édition utilisateur
const EditUserModal: React.FC<{
    user: ClientUser;
    onClose: () => void;
    onSave: (data: { nom: string; prenom: string; email: string }) => Promise<void>;
}> = ({ user, onClose, onSave }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        prenom: user.prenom,
        nom: user.nom,
        email: user.email
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.prenom || !formData.nom || !formData.email) {
            return;
        }
        setIsSubmitting(true);
        try {
            await onSave(formData);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">Modifier l'utilisateur</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Prénom *
                        </label>
                        <input
                            type="text"
                            value={formData.prenom}
                            onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                            placeholder="Jean"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nom *
                        </label>
                        <input
                            type="text"
                            value={formData.nom}
                            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                            placeholder="Dupont"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                            placeholder="jean.dupont@exemple.com"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ============================================================================
// ONGLET SITES
// ============================================================================

const OngletSites: React.FC<{
    sites: SiteFrontend[];
    isLoading: boolean;
    structureId: number;
    onRefresh: () => void;
    showAssignModal: boolean;
    setShowAssignModal: (show: boolean) => void;
}> = ({ sites, isLoading, structureId, onRefresh, showAssignModal, setShowAssignModal }) => {
    const { showToast } = useToast();
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [allSites, setAllSites] = useState<SiteFrontend[]>([]);
    const [isLoadingAllSites, setIsLoadingAllSites] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (showAssignModal && allSites.length === 0) {
            loadAllSites();
        }
    }, [showAssignModal]);

    const loadAllSites = async () => {
        setIsLoadingAllSites(true);
        try {
            const sites = await fetchAllSites();
            setAllSites(sites);
        } catch (error: any) {
            showToast('Erreur lors du chargement des sites', 'error');
        } finally {
            setIsLoadingAllSites(false);
        }
    };

    // Sites non assignes (structure_client null)
    const unassignedSites = useMemo(() => {
        return allSites.filter(s => !s.structure_client).filter(s =>
            s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.code_site?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [allSites, searchQuery]);

    const handleAssignSite = async (siteId: string) => {
        try {
            await updateSite(Number(siteId), { structure_client: structureId });
            showToast('Site assigne avec succes', 'success');
            onRefresh();
            loadAllSites();
        } catch (error: any) {
            showToast('Erreur lors de l\'assignation du site', 'error');
        }
    };

    const handleUnassignSite = async (siteId: string) => {
        try {
            await updateSite(Number(siteId), { structure_client: undefined });
            showToast('Site desassigne avec succes', 'success');
            onRefresh();
        } catch (error: any) {
            showToast('Erreur lors de la desassignation du site', 'error');
        }
    };

    const filteredSites = useMemo(() => {
        if (statusFilter === 'all') return sites;
        if (statusFilter === 'active') return sites.filter(s => s.actif !== false);
        return sites.filter(s => s.actif === false);
    }, [sites, statusFilter]);

    if (isLoading) {
        return <LoadingWrapper isLoading={true}><div /></LoadingWrapper>;
    }

    const isContractExpired = (dateFin: string | null) => {
        if (!dateFin) return false;
        try {
            return new Date(dateFin) < new Date();
        } catch {
            return false;
        }
    };

    return (
        <div className="space-y-6">
            {sites.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
                    <MapPinIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Aucun site</h3>
                    <p className="text-sm text-slate-500">
                        Cette structure ne possède pas encore de sites. Utilisez le bouton "Assigner un site" ci-dessus.
                    </p>
                </div>
            ) : (
                <>
                    {/* Filtres */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                                    statusFilter === 'all'
                                        ? 'bg-white shadow-sm text-slate-800 font-medium'
                                        : 'text-slate-600 hover:text-slate-800'
                                }`}
                            >
                                Tous ({sites.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('active')}
                                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                                    statusFilter === 'active'
                                        ? 'bg-white shadow-sm text-slate-800 font-medium'
                                        : 'text-slate-600 hover:text-slate-800'
                                }`}
                            >
                                Actifs ({sites.filter(s => s.actif !== false).length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('inactive')}
                                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                                    statusFilter === 'inactive'
                                        ? 'bg-white shadow-sm text-slate-800 font-medium'
                                        : 'text-slate-600 hover:text-slate-800'
                                }`}
                            >
                                Inactifs ({sites.filter(s => s.actif === false).length})
                            </button>
                        </div>
                    </div>

                    {/* Grille de cartes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSites.map(site => (
                            <div
                                key={site.id}
                                className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                to={`/sites/${site.id}`}
                                                className="text-base font-bold text-slate-800 hover:text-emerald-600 block truncate transition-colors"
                                            >
                                                {site.name || 'Site sans nom'}
                                            </Link>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Code: {site.code_site || 'N/A'}
                                            </p>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                            site.actif !== false
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {site.actif !== false ? 'Actif' : 'Inactif'}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {site.adresse && (
                                            <div className="flex items-start gap-2 text-slate-500">
                                                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                <span className="text-xs">{site.adresse}</span>
                                            </div>
                                        )}
                                        {(site.superficie_calculee || site.superficie_totale) && (
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Package className="w-4 h-4" />
                                                <span className="text-xs">{(site.superficie_calculee || site.superficie_totale)!.toLocaleString()} m²</span>
                                            </div>
                                        )}
                                    </div>

                                    {(site.date_debut_contrat || site.date_fin_contrat) && (
                                        <div className="pt-3 border-t border-slate-100">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500">Contrat</span>
                                                {site.date_fin_contrat && isContractExpired(site.date_fin_contrat) && (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">
                                                        Expiré
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                {site.date_debut_contrat ? new Date(site.date_debut_contrat).toLocaleDateString('fr-FR') : '?'} -
                                                {site.date_fin_contrat ? new Date(site.date_fin_contrat).toLocaleDateString('fr-FR') : '?'}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-3 border-t border-slate-100">
                                        <button
                                            onClick={() => handleUnassignSite(site.id)}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                                        >
                                            <XIcon className="w-4 h-4" />
                                            Désassigner ce site
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Modal d'assignation */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Assigner des sites</h2>
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSearchQuery('');
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher un site..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoadingAllSites ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                                </div>
                            ) : unassignedSites.length === 0 ? (
                                <div className="text-center py-12">
                                    <MapPinIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-500">
                                        {searchQuery
                                            ? 'Aucun site trouvé pour cette recherche'
                                            : 'Tous les sites sont déjà assignés'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {unassignedSites.map((site) => (
                                        <button
                                            key={site.id}
                                            onClick={() => {
                                                handleAssignSite(site.id);
                                                setShowAssignModal(false);
                                                setSearchQuery('');
                                            }}
                                            className="w-full p-4 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium text-slate-800 group-hover:text-emerald-700">
                                                        {site.name || 'Site sans nom'}
                                                    </div>
                                                    <div className="text-sm text-slate-500 mt-1">
                                                        {site.code_site && <span>Code: {site.code_site}</span>}
                                                        {site.adresse && (
                                                            <span className="ml-2">• {site.adresse}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Plus className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSearchQuery('');
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// ONGLET INVENTAIRE
// ============================================================================

const OngletInventaire: React.FC<{
    stats: InventoryStats | null;
    isLoading: boolean;
}> = ({ stats, isLoading }) => {
    if (isLoading) {
        return <LoadingWrapper isLoading={true}><div /></LoadingWrapper>;
    }

    if (!stats || stats.totalObjets === 0) {
        return (
            <DetailEmptyState
                icon={<Package className="w-12 h-12" />}
                title="Aucun objet inventorie"
                description="Cette structure ne possede pas encore d'objets dans l'inventaire."
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Objets" value={stats.totalObjets} />
                <StatCard title="Végétation" value={stats.vegetation.total} />
                <StatCard title="Hydraulique" value={stats.hydraulique.total} />
            </div>

            {stats.bySite && stats.bySite.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-bold text-lg text-slate-800">Répartition par Site</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Site</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Total</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Végétation</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Hydraulique</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {stats.bySite.map((site) => (
                                    <tr key={site.siteId} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <MapPinIcon className="w-4 h-4 text-emerald-600 mr-2" />
                                                <span className="text-sm font-medium text-slate-800">{site.siteName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                                {site.total}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-slate-800">{site.vegetation}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-slate-800">{site.hydraulique}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stats.vegetation.total > 0 && (
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-bold text-lg text-slate-800 mb-4">Répartition Végétation</h3>
                        <div className="space-y-3">
                            {Object.entries(stats.vegetation.byType).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-sm text-slate-700 capitalize">{type}</span>
                                    <span className="text-sm font-bold text-slate-800">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {stats.hydraulique.total > 0 && (
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-bold text-lg text-slate-800 mb-4">Répartition Hydraulique</h3>
                        <div className="space-y-3">
                            {Object.entries(stats.hydraulique.byType).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-sm text-slate-700 capitalize">{type}</span>
                                    <span className="text-sm font-bold text-slate-800">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// ONGLET INTERVENTIONS
// ============================================================================

const OngletInterventions: React.FC<{
    taches: Tache[];
    isLoading: boolean;
}> = ({ taches, isLoading }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    if (isLoading) {
        return <LoadingWrapper isLoading={true}><div /></LoadingWrapper>;
    }

    if (taches.length === 0) {
        return (
            <DetailEmptyState
                icon={<ClipboardList className="w-12 h-12" />}
                title="Aucune intervention"
                description="Aucune tache planifiee ou realisee pour cette structure."
            />
        );
    }

    const enCours = taches.filter(t => !['TERMINEE', 'ANNULEE'].includes(t.statut)).length;
    const terminees = taches.filter(t => t.statut === 'TERMINEE').length;

    const totalPages = Math.ceil(taches.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentTaches = taches.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total" value={taches.length} />
                <StatCard title="En cours" value={enCours} />
                <StatCard title="Terminées" value={terminees} />
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Site</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentTaches.map((tache) => {
                            const firstSite = tache.objets_detail && tache.objets_detail.length > 0
                                ? tache.objets_detail[0].site_nom
                                : null;

                            return (
                                <tr key={tache.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                                        {tache.type_tache_detail?.nom_tache || 'Type non défini'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {firstSite || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {tache.date_debut_planifiee
                                            ? new Date(tache.date_debut_planifiee).toLocaleDateString('fr-FR')
                                            : 'Date non définie'
                                        }
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge
                                            status={tache.statut}
                                            type="tache"
                                            size="xs"
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                            {startIndex + 1} - {Math.min(endIndex, taches.length)} sur {taches.length}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StructureDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { showToast } = useToast();

    // Lire l'onglet depuis l'URL, défaut à 'general'
    const tabFromUrl = searchParams.get('tab') as TabType | null;
    const validTabs: TabType[] = ['general', 'utilisateurs', 'sites', 'inventaire', 'interventions'];
    const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'general';

    const [structure, setStructure] = useState<StructureClientDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTabState] = useState<TabType>(initialTab);
    const [showAssignSiteModal, setShowAssignSiteModal] = useState(false);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Fonction pour changer d'onglet et mettre à jour l'URL
    const setActiveTab = useCallback((tab: TabType) => {
        setActiveTabState(tab);
        setSearchParams({ tab }, { replace: true });
    }, [setSearchParams]);

    // Synchroniser l'onglet avec l'URL quand on utilise retour/avancer du navigateur
    useEffect(() => {
        const tabParam = searchParams.get('tab') as TabType | null;
        if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
            setActiveTabState(tabParam);
        }
    }, [searchParams]);

    // Data per tab
    const [utilisateurs, setUtilisateurs] = useState<ClientUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [sites, setSites] = useState<SiteFrontend[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(false);
    const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [taches, setTaches] = useState<Tache[]>([]);
    const [isLoadingTaches, setIsLoadingTaches] = useState(false);

    // Load structure
    useEffect(() => {
        loadStructure();
    }, [id]);

    // Lazy load tab data
    useEffect(() => {
        if (!structure) return;

        if (activeTab === 'utilisateurs' && utilisateurs.length === 0 && !isLoadingUsers) {
            loadUtilisateurs();
        }
        if (activeTab === 'sites' && sites.length === 0 && !isLoadingSites) {
            loadSites();
        }
        if (activeTab === 'inventaire' && !inventoryStats && !isLoadingInventory) {
            loadInventoryStats();
        }
        if (activeTab === 'interventions' && taches.length === 0 && !isLoadingTaches) {
            loadTaches();
        }
    }, [activeTab, structure]);

    const loadStructure = async () => {
        if (!id) {
            showToast('ID structure manquant', 'error');
            navigate('/clients');
            return;
        }

        setIsLoading(true);
        try {
            const data = await fetchStructureById(Number(id));
            setStructure(data);
            // Pre-load utilisateurs from structure detail
            if (data.utilisateurs) {
                setUtilisateurs(data.utilisateurs);
            }
        } catch (error: any) {
            showToast(error.message || 'Structure non trouvee', 'error');
            navigate('/clients');
        } finally {
            setIsLoading(false);
        }
    };

    const loadUtilisateurs = async () => {
        setIsLoadingUsers(true);
        try {
            const users = await fetchStructureUtilisateurs(Number(id));
            setUtilisateurs(users);
        } catch (error: any) {
            showToast('Erreur lors du chargement des utilisateurs', 'error');
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const loadSites = async () => {
        setIsLoadingSites(true);
        try {
            // Force refresh pour obtenir les donnees a jour avec structure_client
            const allSites = await fetchAllSites(true);
            const structureId = Number(id);
            const structureSites = allSites.filter(s => s.structure_client === structureId);
            setSites(structureSites);
        } catch (error: any) {
            showToast('Erreur lors du chargement des sites', 'error');
        } finally {
            setIsLoadingSites(false);
        }
    };

    const loadInventoryStats = async () => {
        setIsLoadingInventory(true);
        try {
            // Note: On utilise l'ancienne API qui filtre par client, a adapter si necessaire
            const stats = await fetchClientInventoryStats(Number(id));
            setInventoryStats(stats);
        } catch (error: any) {
            setInventoryStats({
                totalObjets: 0,
                vegetation: { total: 0, byType: {} },
                hydraulique: { total: 0, byType: {} }
            });
        } finally {
            setIsLoadingInventory(false);
        }
    };

    const loadTaches = async () => {
        setIsLoadingTaches(true);
        try {
            const response = await planningService.getTaches();
            const allTaches = response.results || [];
            // Filtrer par structure_client
            const structureTaches = allTaches.filter(t => t.structure_client_detail?.id === Number(id));
            setTaches(structureTaches);
        } catch (error: any) {
            showToast('Erreur lors du chargement des taches', 'error');
        } finally {
            setIsLoadingTaches(false);
        }
    };

    if (isLoading) return <LoadingScreen />;
    if (!structure) return null;

    return (
        <div className="h-full bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="flex-shrink-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link to="/clients" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <div className="flex items-center gap-3">
                        {structure.logo ? (
                            <img
                                src={structure.logo}
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-200"
                                alt={structure.nom}
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-emerald-600" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">{structure.nom}</h1>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Users className="w-4 h-4" />
                                <span>{structure.utilisateursCount} utilisateur{structure.utilisateursCount > 1 ? 's' : ''}</span>
                                <span className="text-slate-300">•</span>
                                <MapPinIcon className="w-4 h-4" />
                                <span>{structure.sitesCount} site{structure.sitesCount > 1 ? 's' : ''}</span>
                                <span className="text-slate-300">•</span>
                                <StatusBadge
                                    variant="boolean"
                                    value={structure.actif}
                                    labels={{ true: 'Active', false: 'Inactive' }}
                                    size="xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 font-medium"
                    >
                        <Edit className="w-4 h-4" />
                        Modifier
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex-shrink-0 bg-white border-b border-slate-100 px-6">
                <div className="flex items-center justify-between gap-4 py-1">
                    <div className="flex gap-4">
                        <TabButton
                            active={activeTab === 'general'}
                            onClick={() => setActiveTab('general')}
                            icon={<Building2 className="w-4 h-4" />}
                            label="General"
                        />
                        <TabButton
                            active={activeTab === 'utilisateurs'}
                            onClick={() => setActiveTab('utilisateurs')}
                            icon={<Users className="w-4 h-4" />}
                            label="Utilisateurs"
                            badge={utilisateurs.length}
                        />
                        <TabButton
                            active={activeTab === 'sites'}
                            onClick={() => setActiveTab('sites')}
                            icon={<MapPinIcon className="w-4 h-4" />}
                            label="Sites"
                            badge={sites.length}
                        />
                        <TabButton
                            active={activeTab === 'inventaire'}
                            onClick={() => setActiveTab('inventaire')}
                            icon={<Package className="w-4 h-4" />}
                            label="Inventaire"
                            badge={inventoryStats?.totalObjets}
                        />
                        <TabButton
                            active={activeTab === 'interventions'}
                            onClick={() => setActiveTab('interventions')}
                            icon={<ClipboardList className="w-4 h-4" />}
                            label="Interventions"
                            badge={taches.filter(t => !['TERMINEE', 'ANNULEE'].includes(t.statut)).length}
                        />
                    </div>

                    {activeTab === 'utilisateurs' && (
                        <button
                            onClick={() => setShowAddUserModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
                        >
                            <UserPlus className="w-4 h-4" />
                            Ajouter un utilisateur
                        </button>
                    )}

                    {activeTab === 'sites' && (
                        <button
                            onClick={() => setShowAssignSiteModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Assigner un site
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6">
                {activeTab === 'general' && <OngletGeneral structure={structure} />}
                {activeTab === 'utilisateurs' && (
                    <OngletUtilisateurs
                        utilisateurs={utilisateurs}
                        structureId={Number(id)}
                        onRefresh={() => { loadStructure(); loadUtilisateurs(); }}
                        isLoading={isLoadingUsers}
                        showAddModal={showAddUserModal}
                        setShowAddModal={setShowAddUserModal}
                    />
                )}
                {activeTab === 'sites' && (
                    <OngletSites
                        sites={sites}
                        isLoading={isLoadingSites}
                        structureId={Number(id)}
                        onRefresh={loadSites}
                        showAssignModal={showAssignSiteModal}
                        setShowAssignModal={setShowAssignSiteModal}
                    />
                )}
                {activeTab === 'inventaire' && <OngletInventaire stats={inventoryStats} isLoading={isLoadingInventory} />}
                {activeTab === 'interventions' && <OngletInterventions taches={taches} isLoading={isLoadingTaches} />}
            </main>

            {/* Modal Edition Structure */}
            {showEditModal && structure && (
                <EditStructureModal
                    structure={structure}
                    onClose={() => setShowEditModal(false)}
                    onSaved={() => {
                        setShowEditModal(false);
                        loadStructure();
                    }}
                />
            )}
        </div>
    );
}

// ============================================================================
// MODAL EDITION STRUCTURE
// ============================================================================

const EditStructureModal: React.FC<{
    structure: StructureClientDetail;
    onClose: () => void;
    onSaved: () => void;
}> = ({ structure, onClose, onSaved }) => {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        nom: structure.nom,
        adresse: structure.adresse || '',
        telephone: structure.telephone || '',
        contactPrincipal: structure.contactPrincipal || '',
        emailFacturation: structure.emailFacturation || '',
        logo: structure.logo || '',
        actif: structure.actif
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nom.trim()) {
            showToast('Le nom de la structure est requis', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await updateStructure(structure.id, formData);
            showToast('Structure mise à jour', 'success');
            onSaved();
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la mise à jour', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">Modifier la structure</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nom de la structure *
                        </label>
                        <input
                            type="text"
                            value={formData.nom}
                            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Adresse
                        </label>
                        <textarea
                            value={formData.adresse}
                            onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                            rows={2}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Téléphone
                            </label>
                            <input
                                type="tel"
                                value={formData.telephone}
                                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Contact principal
                            </label>
                            <input
                                type="text"
                                value={formData.contactPrincipal}
                                onChange={(e) => setFormData({ ...formData, contactPrincipal: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Email de facturation
                        </label>
                        <input
                            type="email"
                            value={formData.emailFacturation}
                            onChange={(e) => setFormData({ ...formData, emailFacturation: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            URL du logo
                        </label>
                        <input
                            type="url"
                            value={formData.logo}
                            onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                        />
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <input
                            type="checkbox"
                            id="actif"
                            checked={formData.actif}
                            onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                        />
                        <label htmlFor="actif" className="text-sm text-slate-700 font-medium">
                            Structure active
                        </label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
