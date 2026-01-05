import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, User, Mail, Building2, Calendar, Clock,
    Edit, Activity, FileText, Shield, Loader2, X as XIcon
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { DetailEmptyState } from '../components/DetailModal';
import LoadingWrapper from '../components/LoadingWrapper';
import { fetchClientByUserId, fetchStructureById, updateUtilisateur } from '../services/usersApi';
import { fetchReclamations } from '../services/reclamationsApi';
import type { Client, StructureClient } from '../types/users';
import type { Reclamation } from '../types/reclamations';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'general' | 'reclamations';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

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

// ============================================================================
// ONGLET GENERAL
// ============================================================================

const OngletGeneral: React.FC<{ user: Client }> = ({ user }) => {
    const formatDate = (dateString: string | null | undefined, withTime = false) => {
        if (!dateString) return null;
        try {
            const options: Intl.DateTimeFormatOptions = {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                ...(withTime && { hour: '2-digit', minute: '2-digit' })
            };
            return new Date(dateString).toLocaleDateString('fr-FR', options);
        } catch {
            return null;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
                {/* Informations personnelles */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-6">
                        <User className="w-5 h-5 text-emerald-600" />
                        Informations personnelles
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-1">Prénom</p>
                            <p className="text-sm font-bold text-slate-800">{user.prenom}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-1">Nom</p>
                            <p className="text-sm font-bold text-slate-800">{user.nom}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
                            <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-1">Rôle</p>
                            <p className="text-sm font-bold text-slate-800">Client</p>
                        </div>
                    </div>
                </div>

                {/* Structure associée */}
                {user.structure && (
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-6">
                            <Building2 className="w-5 h-5 text-emerald-600" />
                            Organisation
                        </h3>
                        <Link
                            to={`/structures/${user.structureId}`}
                            className="block p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                                        {user.structure.nom}
                                    </p>
                                    {user.structure.adresse && (
                                        <p className="text-sm text-slate-500 mt-1">
                                            {user.structure.adresse}
                                        </p>
                                    )}
                                    {user.structure.telephone && (
                                        <p className="text-sm text-slate-500 mt-1">
                                            {user.structure.telephone}
                                        </p>
                                    )}
                                </div>
                                <div className="text-slate-300 group-hover:text-emerald-500 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}
            </div>

            {/* Colonne latérale */}
            <div className="space-y-6">
                {/* Statut du compte */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-bold text-lg text-slate-800 mb-4">Statut</h3>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${user.actif ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className={`text-sm font-bold ${user.actif ? 'text-emerald-600' : 'text-red-600'}`}>
                            {user.actif ? 'Compte actif' : 'Compte inactif'}
                        </span>
                    </div>
                </div>

                {/* Activité */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-emerald-600" />
                        Activité
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-500">Membre depuis</span>
                            </div>
                            <span className="text-sm font-bold text-slate-800">
                                {formatDate(user.utilisateurDetail?.dateCreation) || '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-500">Dernière connexion</span>
                            </div>
                            <span className="text-sm font-bold text-slate-800">
                                {formatDate(user.utilisateurDetail?.derniereConnexion, true) || 'Jamais'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// ONGLET RECLAMATIONS
// ============================================================================

const OngletReclamations: React.FC<{
    reclamations: Reclamation[];
    isLoading: boolean;
}> = ({ reclamations, isLoading }) => {
    const navigate = useNavigate();

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

    if (reclamations.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12">
                <div className="text-center text-slate-500 flex flex-col items-center">
                    <FileText className="w-12 h-12 text-slate-200 mb-3" />
                    <p className="font-medium text-slate-800">Aucune réclamation</p>
                    <p className="text-sm text-slate-500 mt-1">Cet utilisateur n'a pas encore créé de réclamation.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    Réclamations de l'utilisateur
                </h3>
                <button
                    onClick={() => navigate('/reclamations')}
                    className="text-sm text-emerald-600 font-medium hover:underline"
                >
                    Voir tout
                </button>
            </div>
            <div className="divide-y divide-slate-100">
                {reclamations.map((rec) => (
                    <div
                        key={rec.id}
                        className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/reclamations`)}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-800">{rec.numero_reclamation}</span>
                            <span className="text-xs text-slate-400">
                                {new Date(rec.date_creation).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600">{rec.type_reclamation_nom || '-'}</p>
                                {rec.site_nom && (
                                    <p className="text-xs text-slate-400 mt-1">{rec.site_nom}</p>
                                )}
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                rec.statut === 'RESOLUE' ? 'bg-emerald-100 text-emerald-700' :
                                rec.statut === 'NOUVELLE' ? 'bg-blue-100 text-blue-700' :
                                rec.statut === 'EN_COURS' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                                {rec.statut?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function ClientUserDetailPage() {
    const { structureId, userId } = useParams<{ structureId: string; userId: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [user, setUser] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [showEditModal, setShowEditModal] = useState(false);

    // Data per tab
    const [reclamations, setReclamations] = useState<Reclamation[]>([]);
    const [isLoadingReclamations, setIsLoadingReclamations] = useState(false);

    // Load user data
    useEffect(() => {
        loadUser();
    }, [userId]);

    // Lazy load reclamations when tab is active
    useEffect(() => {
        if (activeTab === 'reclamations' && reclamations.length === 0 && !isLoadingReclamations && user) {
            loadReclamations();
        }
    }, [activeTab, user]);

    const loadUser = async () => {
        if (!userId) {
            showToast('ID utilisateur manquant', 'error');
            navigate(`/structures/${structureId}`);
            return;
        }

        setIsLoading(true);
        try {
            // Fetch client by user ID directly (no cache)
            const foundUser = await fetchClientByUserId(Number(userId));

            if (!foundUser) {
                showToast('Utilisateur non trouvé', 'error');
                navigate(`/structures/${structureId}`);
                return;
            }

            // Toujours charger la structure si on a un structureId (dans l'URL ou dans foundUser)
            const sId = foundUser.structureId || (structureId ? Number(structureId) : null);
            if (sId) {
                try {
                    const structure = await fetchStructureById(sId);
                    // Convertir en StructureClient (sans les utilisateurs)
                    foundUser.structure = {
                        id: structure.id,
                        nom: structure.nom,
                        adresse: structure.adresse,
                        telephone: structure.telephone,
                        contactPrincipal: structure.contactPrincipal,
                        emailFacturation: structure.emailFacturation,
                        logo: structure.logo,
                        actif: structure.actif,
                        dateCreation: structure.dateCreation,
                        utilisateursCount: structure.utilisateursCount,
                        sitesCount: structure.sitesCount
                    };
                    foundUser.structureId = structure.id;
                } catch (e) {
                    console.error('Erreur chargement structure:', e);
                }
            }

            setUser(foundUser);
        } catch (error: any) {
            showToast(error.message || 'Erreur lors du chargement', 'error');
            navigate(`/structures/${structureId}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditUser = async (data: { nom: string; prenom: string; email: string; actif: boolean }) => {
        if (!user) return;
        try {
            await updateUtilisateur(user.utilisateur, data);
            showToast('Utilisateur modifié avec succès', 'success');
            setShowEditModal(false);
            // Recharger les données
            loadUser();
        } catch (error: any) {
            showToast(error.message || 'Erreur lors de la modification', 'error');
        }
    };

    const loadReclamations = async () => {
        if (!userId) return;

        setIsLoadingReclamations(true);
        try {
            const allReclamations = await fetchReclamations();
            // Filter reclamations by creator
            const userReclamations = allReclamations.filter(r => r.createur === Number(userId));
            setReclamations(userReclamations);
        } catch (error: any) {
            showToast('Erreur lors du chargement des réclamations', 'error');
        } finally {
            setIsLoadingReclamations(false);
        }
    };

    if (isLoading) return <LoadingScreen />;
    if (!user) return null;

    return (
        <div className="h-full bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="flex-shrink-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800">
                                {user.prenom} {user.nom}
                            </h1>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>{user.email}</span>
                                <span className="text-slate-300">•</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    user.actif
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-red-100 text-red-700'
                                }`}>
                                    {user.actif ? 'Actif' : 'Inactif'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                    <Edit className="w-4 h-4" />
                    Modifier
                </button>
            </header>

            {/* Tabs */}
            <div className="flex-shrink-0 bg-white border-b border-slate-100 px-6">
                <div className="flex gap-1">
                    <TabButton
                        active={activeTab === 'general'}
                        onClick={() => setActiveTab('general')}
                        icon={<User className="w-4 h-4" />}
                        label="Général"
                    />
                    <TabButton
                        active={activeTab === 'reclamations'}
                        onClick={() => setActiveTab('reclamations')}
                        icon={<FileText className="w-4 h-4" />}
                        label="Réclamations"
                        badge={reclamations.length}
                    />
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6">
                {activeTab === 'general' && <OngletGeneral user={user} />}
                {activeTab === 'reclamations' && (
                    <OngletReclamations
                        reclamations={reclamations}
                        isLoading={isLoadingReclamations}
                    />
                )}
            </main>

            {/* Modal Modifier Utilisateur */}
            {showEditModal && user && (
                <EditUserModal
                    user={user}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleEditUser}
                />
            )}
        </div>
    );
}

// ============================================================================
// MODAL EDITION UTILISATEUR
// ============================================================================

const EditUserModal: React.FC<{
    user: Client;
    onClose: () => void;
    onSave: (data: { nom: string; prenom: string; email: string; actif: boolean }) => Promise<void>;
}> = ({ user, onClose, onSave }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        actif: user.actif
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

                    {/* Toggle Actif/Inactif */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                            <label className="text-sm font-medium text-slate-700">
                                Statut du compte
                            </label>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {formData.actif
                                    ? "L'utilisateur peut se connecter"
                                    : "L'utilisateur ne peut pas se connecter"}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, actif: !formData.actif })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                                formData.actif ? 'bg-emerald-600' : 'bg-slate-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                                    formData.actif ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
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
