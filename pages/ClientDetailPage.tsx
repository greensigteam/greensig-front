import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Building2, User, Mail, Phone, MapPin, Shield, Calendar, Clock,
    Package, MapPin as MapPinIcon, ClipboardList, Edit, Loader2, AlertCircle,
    TrendingUp, BarChart3, PieChart as PieChartIcon, CheckCircle, XCircle, Plus, X as XIcon, Search
} from 'lucide-react';
import { fetchClients } from '../services/usersApi';
import { fetchAllSites, SiteFrontend, updateSite } from '../services/api';
import { planningService } from '../services/planningService';
import { fetchClientInventoryStats } from '../services/clientInventoryService';
import type { Client } from '../types/users';
import type { Tache } from '../types/planning';
import { useToast } from '../contexts/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { DetailRow, DetailGrid, DetailCard, DetailEmptyState } from '../components/DetailModal';
import { EditClientModal } from '../components/clients/ClientModals';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'general' | 'sites' | 'inventaire' | 'interventions';

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
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const LoadingScreen: React.FC = () => (
    <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-emerald-600 mb-3" />
            <p className="text-gray-600">Chargement des détails du client...</p>
        </div>
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
                ? 'border-emerald-500 text-emerald-600 bg-gradient-to-r from-emerald-50/50'
                : 'border-transparent text-gray-500 hover:text-emerald-600 hover:border-gray-300'
        }`}
    >
        {icon}
        <span className="font-medium">{label}</span>
        {badge !== undefined && badge > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                {badge}
            </span>
        )}
    </button>
);

const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
}> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
                {icon}
            </div>
        </div>
    </div>
);

// ============================================================================
// ONGLET GÉNÉRAL
// ============================================================================

const OngletGeneral: React.FC<{ client: Client }> = ({ client }) => {
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'Non disponible';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
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
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                        Organisation
                    </h2>
                    <DetailGrid columns={2}>
                        <DetailRow
                            label="Nom de la structure"
                            value={client.nomStructure}
                            icon={<Building2 className="w-4 h-4 text-emerald-600" />}
                        />
                        <DetailRow
                            label="Contact principal"
                            value={`${client.prenom} ${client.nom}`}
                            icon={<User className="w-4 h-4 text-emerald-600" />}
                        />
                        <DetailRow
                            label="Email principal"
                            value={client.email}
                            icon={<Mail className="w-4 h-4 text-emerald-600" />}
                        />
                        <DetailRow
                            label="Téléphone"
                            value={client.telephone || 'Non renseigné'}
                            icon={<Phone className="w-4 h-4 text-emerald-600" />}
                        />
                        <DetailRow
                            label="Adresse"
                            value={client.adresse || 'Non renseignée'}
                            icon={<MapPin className="w-4 h-4 text-emerald-600" />}
                            className="col-span-2"
                        />
                    </DetailGrid>
                </div>

                {/* FACTURATION */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                        <Mail className="w-5 h-5 text-blue-600" />
                        Facturation
                    </h2>
                    <DetailGrid columns={2}>
                        <DetailRow
                            label="Email facturation"
                            value={client.emailFacturation || client.email}
                            icon={<Mail className="w-4 h-4 text-blue-600" />}
                        />
                        <DetailRow
                            label="Contact facturation"
                            value={client.contactPrincipal || `${client.prenom} ${client.nom}`}
                            icon={<User className="w-4 h-4 text-blue-600" />}
                        />
                    </DetailGrid>
                </div>
            </div>

            {/* COLONNE DROITE - Compte & Statut */}
            <div className="space-y-6">
                {/* STATUT DU COMPTE */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-xl border border-blue-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        Compte
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-blue-200">
                            <span className="text-sm text-gray-600">Statut</span>
                            <StatusBadge
                                variant="boolean"
                                value={client.actif}
                                labels={{ true: 'Actif', false: 'Inactif' }}
                            />
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-blue-200">
                            <span className="text-sm text-gray-600">Rôle</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full inline-flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                CLIENT
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Accès</span>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                ClientPortal
                            </span>
                        </div>
                    </div>
                </div>

                {/* ACTIVITÉ */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-600" />
                        Activité
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <span className="text-xs text-gray-500 block mb-1">Dernière connexion</span>
                            <span className="text-sm font-medium text-gray-900">
                                {client.utilisateurDetail?.derniereConnexion
                                    ? formatDate(client.utilisateurDetail.derniereConnexion)
                                    : <span className="text-amber-600">Jamais connecté</span>
                                }
                            </span>
                        </div>
                        <div className="pt-3 border-t">
                            <span className="text-xs text-gray-500 block mb-1">Compte créé le</span>
                            <span className="text-sm font-medium text-gray-900">
                                {client.utilisateurDetail?.dateCreation
                                    ? new Date(client.utilisateurDetail.dateCreation).toLocaleDateString('fr-FR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })
                                    : 'Non disponible'
                                }
                            </span>
                        </div>
                    </div>
                </div>

                {/* LOGO */}
                {client.logo && (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-600 mb-4">Logo de l'organisation</h2>
                        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                            <img
                                src={client.logo}
                                alt={client.nomStructure}
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
// ONGLET SITES
// ============================================================================

const OngletSites: React.FC<{
    sites: SiteFrontend[];
    isLoading: boolean;
    clientId: number;
    onRefresh: () => void;
    showAssignModal: boolean;
    setShowAssignModal: (show: boolean) => void;
}> = ({ sites, isLoading, clientId, onRefresh, showAssignModal, setShowAssignModal }) => {
    const { showToast } = useToast();
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [allSites, setAllSites] = useState<SiteFrontend[]>([]);
    const [isLoadingAllSites, setIsLoadingAllSites] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Charger tous les sites quand le modal s'ouvre
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

    // Sites non assignés (client null ou undefined)
    const unassignedSites = useMemo(() => {
        return allSites.filter(s => !s.client).filter(s =>
            s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.code_site?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [allSites, searchQuery]);

    // Assigner un site au client
    const handleAssignSite = async (siteId: string) => {
        try {
            await updateSite(Number(siteId), { client: clientId });
            showToast('Site assigné avec succès', 'success');
            onRefresh();
            loadAllSites(); // Rafraîchir la liste des sites disponibles
        } catch (error: any) {
            showToast('Erreur lors de l\'assignation du site', 'error');
        }
    };

    // Désassigner un site du client
    const handleUnassignSite = async (siteId: string) => {
        try {
            await updateSite(Number(siteId), { client: undefined });
            showToast('Site désassigné avec succès', 'success');
            onRefresh();
        } catch (error: any) {
            showToast('Erreur lors de la désassignation du site', 'error');
        }
    };

    const filteredSites = useMemo(() => {
        if (statusFilter === 'all') return sites;
        if (statusFilter === 'active') return sites.filter(s => s.actif !== false);
        return sites.filter(s => s.actif === false);
    }, [sites, statusFilter]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (sites.length === 0) {
        return (
            <div className="space-y-6">
                {/* Message vide */}
                <DetailEmptyState
                    icon={<MapPinIcon className="w-12 h-12" />}
                    title="Aucun site"
                    description="Ce client ne possède pas encore de sites. Utilisez le bouton 'Assigner un site' ci-dessus pour lui assigner des sites."
                />

                {/* Modal d'assignation (même code que plus bas) */}
                {showAssignModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
                            {/* Header */}
                            <div className="p-6 border-b flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Assigner des sites</h2>
                                <button
                                    onClick={() => {
                                        setShowAssignModal(false);
                                        setSearchQuery('');
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Barre de recherche */}
                            <div className="p-4 border-b">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher un site..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Liste des sites */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {isLoadingAllSites ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                                    </div>
                                ) : unassignedSites.length === 0 ? (
                                    <div className="text-center py-12">
                                        <MapPinIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">
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
                                                className="w-full p-4 border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900 group-hover:text-emerald-700">
                                                            {site.name || 'Site sans nom'}
                                                        </div>
                                                        <div className="text-sm text-gray-500 mt-1">
                                                            {site.code_site && <span>Code: {site.code_site}</span>}
                                                            {site.adresse && (
                                                                <span className="ml-2">• {site.adresse}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-emerald-600" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t bg-gray-50 flex justify-end">
                                <button
                                    onClick={() => {
                                        setShowAssignModal(false);
                                        setSearchQuery('');
                                    }}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
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
            {/* Filtres */}
            <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${
                            statusFilter === 'all'
                                ? 'bg-white shadow-sm text-gray-900 font-medium'
                                : 'text-gray-600'
                        }`}
                    >
                        Tous ({sites.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${
                            statusFilter === 'active'
                                ? 'bg-white shadow-sm text-gray-900 font-medium'
                                : 'text-gray-600'
                        }`}
                    >
                        Actifs ({sites.filter(s => s.actif !== false).length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('inactive')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${
                            statusFilter === 'inactive'
                                ? 'bg-white shadow-sm text-gray-900 font-medium'
                                : 'text-gray-600'
                        }`}
                    >
                        Inactifs ({sites.filter(s => s.actif === false).length})
                    </button>
                </div>
            </div>

            {/* Grille de cartes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSites.map(site => (
                    <DetailCard
                        key={site.id}
                        variant={site.actif === false ? 'default' : 'success'}
                        className="hover:shadow-lg transition-shadow"
                    >
                        <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <Link
                                        to={`/sites/${site.id}`}
                                        className="text-base font-semibold text-emerald-600 hover:text-emerald-700 block truncate"
                                    >
                                        {site.name || 'Site sans nom'}
                                    </Link>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Code: {site.code_site || 'N/A'}
                                    </p>
                                </div>
                                <StatusBadge
                                    variant="boolean"
                                    value={site.actif !== false}
                                    labels={{ true: 'Actif', false: 'Inactif' }}
                                    size="xs"
                                />
                            </div>

                            {/* Infos */}
                            <div className="space-y-2 text-sm">
                                {site.adresse && (
                                    <div className="flex items-start gap-2 text-gray-600">
                                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span className="text-xs">{site.adresse}</span>
                                    </div>
                                )}
                                {(site.superficie_calculee || site.superficie_totale) && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Package className="w-4 h-4" />
                                        <span className="text-xs">{(site.superficie_calculee || site.superficie_totale)!.toLocaleString()} m²</span>
                                    </div>
                                )}
                            </div>

                            {/* Contrat */}
                            {(site.date_debut_contrat || site.date_fin_contrat) && (
                                <div className="pt-3 border-t border-gray-200">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500">Contrat</span>
                                        {site.date_fin_contrat && isContractExpired(site.date_fin_contrat) && (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                                Expiré
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                                        <Calendar className="w-3 h-3" />
                                        {site.date_debut_contrat ? new Date(site.date_debut_contrat).toLocaleDateString('fr-FR') : '?'} -
                                        {site.date_fin_contrat ? new Date(site.date_fin_contrat).toLocaleDateString('fr-FR') : '?'}
                                    </div>
                                </div>
                            )}

                            {/* Bouton Désassigner */}
                            <div className="pt-3 border-t border-gray-200">
                                <button
                                    onClick={() => handleUnassignSite(site.id)}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <XIcon className="w-4 h-4" />
                                    Désassigner ce site
                                </button>
                            </div>
                        </div>
                    </DetailCard>
                ))}
            </div>

            {/* Modal d'assignation de sites */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Assigner des sites</h2>
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSearchQuery('');
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Barre de recherche */}
                        <div className="p-4 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher un site..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Liste des sites */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoadingAllSites ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                                </div>
                            ) : unassignedSites.length === 0 ? (
                                <div className="text-center py-12">
                                    <MapPinIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">
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
                                            className="w-full p-4 border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 group-hover:text-emerald-700">
                                                        {site.name || 'Site sans nom'}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {site.code_site && <span>Code: {site.code_site}</span>}
                                                        {site.adresse && (
                                                            <span className="ml-2">• {site.adresse}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Plus className="w-5 h-5 text-gray-400 group-hover:text-emerald-600" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSearchQuery('');
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
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
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!stats || stats.totalObjets === 0) {
        return (
            <DetailEmptyState
                icon={<Package className="w-12 h-12" />}
                title="Aucun objet inventorié"
                description="Ce client ne possède pas encore d'objets dans l'inventaire."
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* KPIs Globaux */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Total Objets"
                    value={stats.totalObjets}
                    icon={<Package className="w-6 h-6 text-white" />}
                    color="bg-gradient-to-br from-emerald-500 to-teal-500"
                />
                <StatCard
                    title="Végétation"
                    value={stats.vegetation.total}
                    icon={<TrendingUp className="w-6 h-6 text-white" />}
                    color="bg-gradient-to-br from-green-500 to-emerald-500"
                />
                <StatCard
                    title="Hydraulique"
                    value={stats.hydraulique.total}
                    icon={<BarChart3 className="w-6 h-6 text-white" />}
                    color="bg-gradient-to-br from-blue-500 to-cyan-500"
                />
            </div>

            {/* Répartition par Site */}
            {stats.bySite && stats.bySite.length > 0 && (
                <DetailCard title="Répartition par Site" variant="default">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Site
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Végétation
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hydraulique
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stats.bySite.map((site) => (
                                    <tr key={site.siteId} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <MapPinIcon className="w-4 h-4 text-emerald-600 mr-2" />
                                                <span className="text-sm font-medium text-gray-900">{site.siteName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                {site.total}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900">{site.vegetation}</span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900">{site.hydraulique}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </DetailCard>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Répartition Végétation */}
                {stats.vegetation.total > 0 && (
                    <DetailCard title="Répartition Végétation" variant="success">
                        <div className="space-y-2">
                            {Object.entries(stats.vegetation.byType).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700 capitalize">{type}</span>
                                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </DetailCard>
                )}

                {/* Répartition Hydraulique */}
                {stats.hydraulique.total > 0 && (
                    <DetailCard title="Répartition Hydraulique" variant="info">
                        <div className="space-y-2">
                            {Object.entries(stats.hydraulique.byType).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700 capitalize">{type}</span>
                                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </DetailCard>
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
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (taches.length === 0) {
        return (
            <DetailEmptyState
                icon={<ClipboardList className="w-12 h-12" />}
                title="Aucune intervention"
                description="Aucune tâche planifiée ou réalisée pour ce client."
            />
        );
    }

    const enCours = taches.filter(t => !['TERMINEE', 'ANNULEE'].includes(t.statut)).length;
    const terminees = taches.filter(t => t.statut === 'TERMINEE').length;

    // Pagination
    const totalPages = Math.ceil(taches.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentTaches = taches.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Total"
                    value={taches.length}
                    icon={<ClipboardList className="w-6 h-6 text-white" />}
                    color="bg-gradient-to-br from-gray-500 to-gray-600"
                />
                <StatCard
                    title="En cours"
                    value={enCours}
                    icon={<Clock className="w-6 h-6 text-white" />}
                    color="bg-gradient-to-br from-orange-500 to-amber-500"
                />
                <StatCard
                    title="Terminées"
                    value={terminees}
                    icon={<CheckCircle className="w-6 h-6 text-white" />}
                    color="bg-gradient-to-br from-green-500 to-emerald-500"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                Site
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                Statut
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {currentTaches.map((tache) => {
                            // Extraire le premier site des objets
                            const firstSite = tache.objets_detail && tache.objets_detail.length > 0
                                ? tache.objets_detail[0].site_nom
                                : null;

                            return (
                                <tr key={tache.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {tache.type_tache_detail?.nom_tache || 'Type non défini'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {firstSite || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Affichage de {startIndex + 1} à {Math.min(endIndex, taches.length)} sur {taches.length} tâches
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                                    currentPage === 1
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => goToPage(page)}
                                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                                            currentPage === page
                                                ? 'bg-emerald-600 text-white font-medium'
                                                : 'bg-white text-gray-700 hover:bg-gray-50 border'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                                    currentPage === totalPages
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <ChevronRight className="w-4 h-4" />
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

export default function ClientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // State
    const [client, setClient] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showAssignSiteModal, setShowAssignSiteModal] = useState(false);

    // Data per tab (lazy loaded)
    const [sites, setSites] = useState<SiteFrontend[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(false);
    const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [taches, setTaches] = useState<Tache[]>([]);
    const [isLoadingTaches, setIsLoadingTaches] = useState(false);

    // Load client
    useEffect(() => {
        loadClient();
    }, [id]);

    // Lazy load tab data
    useEffect(() => {
        if (!client) return;

        if (activeTab === 'sites' && sites.length === 0 && !isLoadingSites) {
            loadSites();
        }
        if (activeTab === 'inventaire' && !inventoryStats && !isLoadingInventory) {
            loadInventoryStats();
        }
        if (activeTab === 'interventions' && taches.length === 0 && !isLoadingTaches) {
            loadTaches();
        }
    }, [activeTab, client]);

    const loadClient = async () => {
        if (!id) {
            showToast('ID client manquant', 'error');
            navigate('/clients');
            return;
        }

        setIsLoading(true);
        try {
            const data = await fetchClients();
            const clientData = data.results.find(c => c.utilisateur === Number(id));
            if (!clientData) {
                showToast('Client non trouvé', 'error');
                navigate('/clients');
                return;
            }
            setClient(clientData);
        } catch (error: any) {
            showToast(error.message || 'Erreur lors du chargement', 'error');
            navigate('/clients');
        } finally {
            setIsLoading(false);
        }
    };

    const loadSites = async () => {
        setIsLoadingSites(true);
        try {
            const allSites = await fetchAllSites();
            const clientSites = allSites.filter(s => s.client === Number(id));
            setSites(clientSites);
        } catch (error: any) {
            showToast('Erreur lors du chargement des sites', 'error');
        } finally {
            setIsLoadingSites(false);
        }
    };

    const loadInventoryStats = async () => {
        setIsLoadingInventory(true);
        try {
            const stats = await fetchClientInventoryStats(Number(id));
            setInventoryStats(stats);
        } catch (error: any) {
            showToast(error.message || 'Erreur lors du chargement de l\'inventaire', 'error');
            // Set empty stats on error
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
            const clientTaches = allTaches.filter(t => t.client_detail?.utilisateur === Number(id));
            setTaches(clientTaches);
        } catch (error: any) {
            showToast('Erreur lors du chargement des tâches', 'error');
        } finally {
            setIsLoadingTaches(false);
        }
    };

    if (isLoading) return <LoadingScreen />;
    if (!client) return null;

    return (
        <div className="h-full bg-white flex flex-col">
            {/* Header */}
            <header className="flex-shrink-0 bg-white border-b p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link to="/clients" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <div className="flex items-center gap-3">
                        {client.logo ? (
                            <img
                                src={client.logo}
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-200"
                                alt={client.nomStructure}
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-emerald-600" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{client.nomStructure}</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{client.nom} {client.prenom}</span>
                                <span>•</span>
                                <StatusBadge
                                    variant="boolean"
                                    value={client.actif}
                                    labels={{ true: 'Actif', false: 'Inactif' }}
                                    size="xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                        Modifier
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex-shrink-0 bg-white border-b px-6">
                <div className="flex items-center justify-between gap-4 py-1">
                    {/* Left: Tabs */}
                    <div className="flex gap-4">
                        <TabButton
                            active={activeTab === 'general'}
                            onClick={() => setActiveTab('general')}
                            icon={<Building2 className="w-4 h-4" />}
                            label="Général"
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

                    {/* Right: Action Buttons */}
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
            <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
                {activeTab === 'general' && <OngletGeneral client={client} />}
                {activeTab === 'sites' && <OngletSites sites={sites} isLoading={isLoadingSites} clientId={Number(id)} onRefresh={loadSites} showAssignModal={showAssignSiteModal} setShowAssignModal={setShowAssignSiteModal} />}
                {activeTab === 'inventaire' && <OngletInventaire stats={inventoryStats} isLoading={isLoadingInventory} />}
                {activeTab === 'interventions' && <OngletInterventions taches={taches} isLoading={isLoadingTaches} />}
            </main>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <EditClientModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    client={client}
                    onUpdated={loadClient}
                />
            )}
        </div>
    );
}
