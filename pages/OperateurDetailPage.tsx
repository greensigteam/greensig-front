import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Users, User, Mail, Phone, Calendar, Clock,
    Award, UserCheck, UserX, Loader2, AlertCircle, Shield, Briefcase,
    ClipboardList, MapPin
} from 'lucide-react';
import { fetchOperateurById, fetchAbsences } from '../services/usersApi';
import { planningService } from '../services/planningService';
import type { OperateurDetail, Absence } from '../types/users';
import type { Tache } from '../types/planning';
import { useToast } from '../contexts/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { DetailRow, DetailGrid, DetailCard, DetailEmptyState } from '../components/DetailModal';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'general' | 'competences' | 'absences' | 'interventions';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const LoadingScreen: React.FC = () => (
    <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-emerald-600 mb-3" />
            <p className="text-gray-600">Chargement des détails de l'opérateur...</p>
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

const OngletGeneral: React.FC<{ operateur: OperateurDetail }> = ({ operateur }) => {
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
                {/* INFORMATIONS PERSONNELLES */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                        <User className="w-5 h-5 text-emerald-600" />
                        Informations personnelles
                    </h2>
                    <DetailGrid columns={2}>
                        <DetailRow
                            label="Nom complet"
                            value={operateur.fullName}
                            icon={<User className="w-4 h-4 text-emerald-600" />}
                        />
                        <DetailRow
                            label="Matricule"
                            value={operateur.numeroImmatriculation}
                            icon={<Shield className="w-4 h-4 text-emerald-600" />}
                        />
                        <DetailRow
                            label="Email"
                            value={operateur.email || 'Non renseigné'}
                            icon={<Mail className="w-4 h-4 text-emerald-600" />}
                        />
                        <DetailRow
                            label="Téléphone"
                            value={operateur.telephone || 'Non renseigné'}
                            icon={<Phone className="w-4 h-4 text-emerald-600" />}
                        />
                        <DetailRow
                            label="Date d'embauche"
                            value={formatDate(operateur.dateEmbauche)}
                            icon={<Calendar className="w-4 h-4 text-emerald-600" />}
                        />
                    </DetailGrid>
                </div>

                {/* AFFECTATION */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                        Affectation
                    </h2>
                    <DetailGrid columns={2}>
                        <DetailRow
                            label="Équipe"
                            value={operateur.equipeNom || 'Non affecté'}
                            icon={<Users className="w-4 h-4 text-blue-600" />}
                        />
                        <DetailRow
                            label="Superviseur"
                            value={operateur.superviseurNom || 'Non assigné'}
                            icon={<Shield className="w-4 h-4 text-blue-600" />}
                        />
                        {operateur.estChefEquipe && (
                            <div className="col-span-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-yellow-600" />
                                    <span className="text-sm font-semibold text-yellow-800">
                                        Chef d'équipe
                                    </span>
                                </div>
                            </div>
                        )}
                    </DetailGrid>
                </div>
            </div>

            {/* COLONNE DROITE - Statut & Disponibilité */}
            <div className="space-y-6">
                {/* STATUT */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-xl border border-blue-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        Statut
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-blue-200">
                            <span className="text-sm text-gray-600">Statut opérateur</span>
                            <StatusBadge
                                variant="status"
                                type="operateur"
                                value={operateur.statut}
                            />
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-blue-200">
                            <span className="text-sm text-gray-600">Disponibilité</span>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
                                operateur.estDisponible
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {operateur.estDisponible ? (
                                    <UserCheck className="w-3 h-3" />
                                ) : (
                                    <UserX className="w-3 h-3" />
                                )}
                                <span className="text-xs font-medium">
                                    {operateur.estDisponible ? 'Disponible' : 'Indisponible'}
                                </span>
                            </div>
                        </div>
                        {operateur.peutEtreChef && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Qualification</span>
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium flex items-center gap-1">
                                    <Award className="w-3 h-3" />
                                    Peut être chef
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* PHOTO */}
                {operateur.photo && (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-600 mb-4">Photo de profil</h2>
                        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                            <img
                                src={operateur.photo}
                                alt={operateur.fullName}
                                className="max-w-full max-h-48 object-contain rounded-lg"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// ONGLET COMPÉTENCES
// ============================================================================

const OngletCompetences: React.FC<{ operateur: OperateurDetail }> = ({ operateur }) => {
    if (!operateur.competencesDetail || operateur.competencesDetail.length === 0) {
        return (
            <DetailEmptyState
                icon={<Award className="w-12 h-12" />}
                title="Aucune compétence"
                description="Cet opérateur n'a pas encore de compétences enregistrées."
            />
        );
    }

    const competencesParCategorie = operateur.competencesDetail.reduce((acc, comp) => {
        const cat = comp.competenceDetail?.categorie || 'AUTRE';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(comp);
        return acc;
    }, {} as Record<string, typeof operateur.competencesDetail>);

    return (
        <div className="space-y-6">
            {/* Statistique */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Total compétences"
                    value={operateur.competencesDetail.length}
                    icon={<Award className="w-6 h-6 text-white" />}
                    color="bg-gradient-to-br from-emerald-500 to-teal-500"
                />
            </div>

            {/* Liste par catégorie */}
            {Object.entries(competencesParCategorie).map(([categorie, comps]) => (
                <DetailCard key={categorie} title={`Compétences ${categorie.toLowerCase()}`} variant="success">
                    <div className="space-y-2">
                        {comps.map((comp) => (
                            <div
                                key={comp.id}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-100"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">
                                        {comp.competenceDetail?.nomCompetence || `Compétence #${comp.competence}`}
                                    </p>
                                    {comp.dateAcquisition && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Acquise le {new Date(comp.dateAcquisition).toLocaleDateString('fr-FR')}
                                        </p>
                                    )}
                                </div>
                                <StatusBadge variant="status" type="competence" value={comp.niveau} />
                            </div>
                        ))}
                    </div>
                </DetailCard>
            ))}
        </div>
    );
};

// ============================================================================
// ONGLET ABSENCES
// ============================================================================

const OngletAbsences: React.FC<{
    absences: Absence[];
    isLoading: boolean;
}> = ({ absences, isLoading }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (absences.length === 0) {
        return (
            <DetailEmptyState
                icon={<Calendar className="w-12 h-12" />}
                title="Aucune absence"
                description="Cet opérateur n'a pas d'absences enregistrées."
            />
        );
    }

    const enCours = absences.filter(a => a.statut === 'VALIDEE' && new Date(a.dateFin) >= new Date()).length;
    const enAttente = absences.filter(a => a.statut === 'DEMANDEE').length;

    // Pagination
    const totalPages = Math.ceil(absences.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentAbsences = absences.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Total"
                    value={absences.length}
                    icon={<Calendar className="w-6 h-6 text-white" />}
                    color="bg-gradient-to-br from-gray-500 to-gray-600"
                />
                <StatCard
                    title="En cours"
                    value={enCours}
                    icon={<Clock className="w-6 h-6 text-white" />}
                    color="bg-gradient-to-br from-orange-500 to-amber-500"
                />
                <StatCard
                    title="En attente"
                    value={enAttente}
                    icon={<AlertCircle className="w-6 h-6 text-white" />}
                    color="bg-gradient-to-br from-blue-500 to-cyan-500"
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
                                Période
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                Durée
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                Statut
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {currentAbsences.map((absence) => (
                            <tr key={absence.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <StatusBadge
                                        variant="status"
                                        type="typeAbsence"
                                        value={absence.typeAbsence}
                                        size="xs"
                                    />
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {new Date(absence.dateDebut).toLocaleDateString('fr-FR')} -{' '}
                                    {new Date(absence.dateFin).toLocaleDateString('fr-FR')}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {absence.dureeJours} jour{absence.dureeJours > 1 ? 's' : ''}
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge
                                        variant="status"
                                        type="absence"
                                        value={absence.statut}
                                        size="xs"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Affichage de {startIndex + 1} à {Math.min(endIndex, absences.length)} sur {absences.length} absences
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
                description="Aucune tâche assignée pour cet opérateur."
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
                    icon={<Award className="w-6 h-6 text-white" />}
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

export default function OperateurDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // State
    const [operateur, setOperateur] = useState<OperateurDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('general');

    // Data per tab (lazy loaded)
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [isLoadingAbsences, setIsLoadingAbsences] = useState(false);
    const [taches, setTaches] = useState<Tache[]>([]);
    const [isLoadingTaches, setIsLoadingTaches] = useState(false);

    // Load operateur
    useEffect(() => {
        loadOperateur();
    }, [id]);

    // Lazy load tab data
    useEffect(() => {
        if (!operateur) return;

        if (activeTab === 'absences' && absences.length === 0 && !isLoadingAbsences) {
            loadAbsences();
        }
        if (activeTab === 'interventions' && taches.length === 0 && !isLoadingTaches) {
            loadTaches();
        }
    }, [activeTab, operateur]);

    const loadOperateur = async () => {
        if (!id) {
            showToast('ID opérateur manquant', 'error');
            navigate('/users');
            return;
        }

        setIsLoading(true);
        try {
            const data = await fetchOperateurById(Number(id));
            setOperateur(data);
        } catch (error: any) {
            showToast(error.message || 'Erreur lors du chargement', 'error');
            navigate('/users');
        } finally {
            setIsLoading(false);
        }
    };

    const loadAbsences = async () => {
        setIsLoadingAbsences(true);
        try {
            const response = await fetchAbsences({ operateur: Number(id) });
            setAbsences(response.results || []);
        } catch (error: any) {
            showToast('Erreur lors du chargement des absences', 'error');
        } finally {
            setIsLoadingAbsences(false);
        }
    };

    const loadTaches = async () => {
        setIsLoadingTaches(true);
        try {
            const response = await planningService.getTaches();
            const allTaches = response.results || [];
            // Filter tasks for this operator (via their team)
            const operateurTaches = allTaches.filter(t =>
                t.equipes?.some(equipeId => equipeId === operateur?.equipe)
            );
            setTaches(operateurTaches);
        } catch (error: any) {
            showToast('Erreur lors du chargement des tâches', 'error');
        } finally {
            setIsLoadingTaches(false);
        }
    };

    if (isLoading) return <LoadingScreen />;
    if (!operateur) return null;

    return (
        <div className="h-full bg-white flex flex-col">
            {/* Header */}
            <header className="flex-shrink-0 bg-white border-b p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Retour"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        {operateur.photo ? (
                            <img
                                src={operateur.photo}
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-200"
                                alt={operateur.fullName}
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Users className="w-6 h-6 text-emerald-600" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{operateur.fullName}</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{operateur.numeroImmatriculation}</span>
                                <span>•</span>
                                <StatusBadge
                                    variant="status"
                                    type="operateur"
                                    value={operateur.statut}
                                    size="xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                {/* TODO: Ajouter un bouton "Modifier" avec une modale d'édition */}
            </header>

            {/* Tabs */}
            <div className="flex-shrink-0 bg-white border-b px-6">
                <div className="flex gap-4">
                    <TabButton
                        active={activeTab === 'general'}
                        onClick={() => setActiveTab('general')}
                        icon={<User className="w-4 h-4" />}
                        label="Général"
                    />
                    <TabButton
                        active={activeTab === 'competences'}
                        onClick={() => setActiveTab('competences')}
                        icon={<Award className="w-4 h-4" />}
                        label="Compétences"
                        badge={operateur.competencesDetail?.length}
                    />
                    <TabButton
                        active={activeTab === 'absences'}
                        onClick={() => setActiveTab('absences')}
                        icon={<Calendar className="w-4 h-4" />}
                        label="Absences"
                        badge={absences.filter(a => a.statut === 'DEMANDEE').length}
                    />
                    <TabButton
                        active={activeTab === 'interventions'}
                        onClick={() => setActiveTab('interventions')}
                        icon={<ClipboardList className="w-4 h-4" />}
                        label="Interventions"
                        badge={taches.filter(t => !['TERMINEE', 'ANNULEE'].includes(t.statut)).length}
                    />
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
                {activeTab === 'general' && <OngletGeneral operateur={operateur} />}
                {activeTab === 'competences' && <OngletCompetences operateur={operateur} />}
                {activeTab === 'absences' && <OngletAbsences absences={absences} isLoading={isLoadingAbsences} />}
                {activeTab === 'interventions' && <OngletInterventions taches={taches} isLoading={isLoadingTaches} />}
            </main>
        </div>
    );
}
