import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, AlertCircle, Eye, Edit2, Trash2, X, Tag, MapPin, ClipboardList, Calendar, Clock, Users, Star, TrendingUp } from 'lucide-react';
import { Reclamation, TypeReclamation, Urgence, ReclamationCreate } from '../types/reclamations';
import {
    fetchReclamations,
    fetchTypesReclamations,
    fetchUrgences,
    fetchReclamationById,
    createReclamation,
    deleteReclamation,
    updateReclamation,
    uploadPhoto,
    assignReclamation,
    cloturerReclamation,
    createSatisfaction
} from '../services/reclamationsApi';
import { planningService } from '../services/planningService';
import { fetchEquipes } from '../services/usersApi';
import { TypeTache, TacheCreate, PRIORITE_LABELS, Tache, STATUT_TACHE_COLORS } from '../types/planning';
import { EquipeList } from '../types/users';
import { PhotoUpload } from '../components/shared/PhotoUpload';
import { SatisfactionForm } from '../components/SatisfactionForm';

import ConfirmModal from '../components/ConfirmModal';
import { ReclamationTimeline } from '../components/ReclamationTimeline';

const Reclamations: React.FC = () => {
    const navigate = useNavigate();
    const [reclamations, setReclamations] = useState<Reclamation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // UI State
    const [activeTab, setActiveTab] = useState<'reclamations' | 'taches'>('reclamations');
    const [tachesLiees, setTachesLiees] = useState<Tache[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedReclamation, setSelectedReclamation] = useState<Reclamation | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Assignation
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignEquipeId, setAssignEquipeId] = useState<number | ''>('');

    // Referentiels Réclamation
    const [types, setTypes] = useState<TypeReclamation[]>([]);
    const [urgences, setUrgences] = useState<Urgence[]>([]);

    // Referentiels Tâche (pour création intervention)
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [equipes, setEquipes] = useState<EquipeList[]>([]);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskFormData, setTaskFormData] = useState<Partial<TacheCreate>>({});
    const [reclamationTargetForTask, setReclamationTargetForTask] = useState<Reclamation | null>(null);

    // Form state Reclamation
    const [formData, setFormData] = useState<Partial<ReclamationCreate>>({});
    const [photos, setPhotos] = useState<File[]>([]);
    const [existingPhotos, setExistingPhotos] = useState<any[]>([]);

    // User 6.6.13 - Satisfaction
    const [showSatisfactionForm, setShowSatisfactionForm] = useState(false);

    // Modal de confirmation/notification
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
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [recsData, typesData, urgencesData, typesTachesData, equipesData, tachesLieesData] = await Promise.all([
                fetchReclamations(),
                fetchTypesReclamations(),
                fetchUrgences(),
                planningService.getTypesTaches(),
                fetchEquipes(),
                planningService.getTaches({ has_reclamation: true })
            ]);
            setReclamations(recsData);
            setTypes(typesData);
            setUrgences(urgencesData);
            setTypesTaches(typesTachesData);
            // fetchEquipes retourne { count, results } ou array selon format API
            const eqList = Array.isArray(equipesData) ? equipesData : (equipesData as any).results || [];
            setEquipes(eqList);

            // Taches liées retourne PaginatedResponse ou tableau
            const tData = (tachesLieesData as any).results || tachesLieesData;
            setTachesLiees(Array.isArray(tData) ? tData : []);

        } catch (error) {
            console.error("Erreur chargement données", error);
        } finally {
            setLoading(false);
        }
    };

    // ===================================
    // HANDLERS RECLAMATION
    // ===================================

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Validation basique
        if (!formData.type_reclamation || !formData.urgence || !formData.description) {
            setModalConfig({
                isOpen: true,
                title: 'Champs manquants',
                message: 'Veuillez remplir tous les champs obligatoires (*)',
                variant: 'warning'
            });
            return;
        }

        try {
            // 1. Création / Mise à jour de la réclamation (JSON)
            const payload = {
                ...formData,
                date_constatation: formData.date_constatation || new Date().toISOString(),
            };

            let targetId = editingId;

            if (editingId) {
                await updateReclamation(editingId, payload);
            } else {
                const newRec = await createReclamation(payload as ReclamationCreate);
                targetId = newRec.id;
            }

            // 2. Upload des photos réelles
            if (photos.length > 0 && targetId) {
                const uploadPromises = photos.map(file => {
                    const fd = new FormData();
                    fd.append('fichier', file);
                    fd.append('type_photo', 'RECLAMATION');
                    fd.append('reclamation', String(targetId));
                    fd.append('legende', 'Photo jointe');
                    return uploadPhoto(fd);
                });
                await Promise.all(uploadPromises);
            }

            setModalConfig({
                isOpen: true,
                title: 'Succès',
                message: editingId ? 'Réclamation mise à jour avec succès.' : 'Réclamation créée avec succès.',
                variant: 'success',
                onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });

            closeCreateModal();
            loadData();
        } catch (error) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: "Une erreur est survenue lors de l'enregistrement.",
                variant: 'danger'
            });
        }
    };

    const handleDelete = (id: number) => {
        setModalConfig({
            isOpen: true,
            title: 'Supprimer la réclamation ?',
            message: 'Êtes-vous sûr de vouloir supprimer cette réclamation ?',
            variant: 'danger',
            confirmLabel: 'Supprimer',
            onConfirm: async () => {
                try {
                    await deleteReclamation(id);
                    setReclamations(prev => prev.filter(r => r.id !== id));
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    // Feedback différé
                    setTimeout(() => {
                        setModalConfig({ isOpen: true, title: 'Succès', message: 'Réclamation supprimée.', variant: 'success', onConfirm: () => setModalConfig(p => ({ ...p, isOpen: false })) });
                    }, 300);
                } catch (error) {
                    console.error(error);
                    setModalConfig({ isOpen: true, title: 'Erreur', message: "Impossible de supprimer la réclamation.", variant: 'danger' });
                }
            }
        });
    };

    const handleDetails = async (id: number) => {
        try {
            const fullRec = await fetchReclamationById(id);
            setSelectedReclamation(fullRec);
        } catch (error) {
            console.error(error);
            setModalConfig({ isOpen: true, title: 'Erreur', message: "Impossible de charger les détails.", variant: 'danger' });
        }
    };

    const handleEdit = async (id: number) => {
        try {
            const fullRec = await fetchReclamationById(id);
            setEditingId(fullRec.id);
            setFormData({
                type_reclamation: fullRec.type_reclamation,
                urgence: fullRec.urgence,
                description: fullRec.description,
                zone: fullRec.zone,
            });
            setExistingPhotos(fullRec.photos || []);
            setIsCreateModalOpen(true);
        } catch (error) {
            console.error(error);
            setModalConfig({ isOpen: true, title: 'Erreur', message: "Impossible de charger pour édition.", variant: 'danger' });
        }
    };

    const openAssignModal = () => {
        if (!selectedReclamation) return;
        setAssignEquipeId(selectedReclamation.equipe_affectee || '');
        setIsAssignModalOpen(true);
    };

    const handleAssignSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReclamation || !assignEquipeId) return;

        try {
            const updatedRec = await assignReclamation(selectedReclamation.id, Number(assignEquipeId));

            // Update local state
            setSelectedReclamation(updatedRec);
            setReclamations(prev => prev.map(r => r.id === updatedRec.id ? updatedRec : r));

            setIsAssignModalOpen(false);
            setModalConfig({
                isOpen: true,
                title: 'Succès',
                message: "Réclamation affectée à l'équipe avec succès.",
                variant: 'success',
                onConfirm: () => setModalConfig(p => ({ ...p, isOpen: false }))
            });
        } catch (error) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: "Impossible d'affecter l'équipe.",
                variant: 'danger'
            });
        }
    };

    // User 6.6.12 - Clôture
    const handleCloturer = async () => {
        if (!selectedReclamation) return;

        // Vérification du statut
        if (selectedReclamation.statut !== 'RESOLUE') {
            setModalConfig({
                isOpen: true,
                title: 'Impossible de clôturer',
                message: 'La réclamation doit être au statut "Résolue" pour être clôturée.',
                variant: 'danger'
            });
            return;
        }

        try {
            const updatedRec = await cloturerReclamation(selectedReclamation.id);

            // Update local state
            setSelectedReclamation(updatedRec);
            setReclamations(prev => prev.map(r => r.id === updatedRec.id ? updatedRec : r));

            setModalConfig({
                isOpen: true,
                title: 'Succès',
                message: 'Réclamation clôturée avec succès.',
                variant: 'success'
            });
        } catch (error: any) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: error.message || 'Erreur lors de la clôture.',
                variant: 'danger'
            });
        }
    };

    // User 6.6.13 - Satisfaction
    const handleSatisfactionSubmit = async (data: { reclamation: number; note: number; commentaire?: string }) => {
        try {
            await createSatisfaction(data);
            setModalConfig({
                isOpen: true,
                title: 'Merci !',
                message: 'Votre évaluation a été enregistrée avec succès.',
                variant: 'success'
            });
        } catch (error: any) {
            console.error(error);
            setModalConfig({
                isOpen: true,
                title: 'Erreur',
                message: error.message || 'Erreur lors de l\'enregistrement.',
                variant: 'danger'
            });
        }
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
        setEditingId(null);
        setFormData({});
        setPhotos([]);
        setExistingPhotos([]);
    };

    // ===================================
    // HANDLERS TACHE
    // ===================================

    const handleOpenTaskModal = (reclamation: Reclamation) => {
        setReclamationTargetForTask(reclamation);
        setTaskFormData({
            id_client: reclamation.client || null, // client peut être undefined selon interface
            priorite: 3,
            commentaires: '',
            date_debut_planifiee: new Date().toISOString().slice(0, 16), // Maintenant
            date_fin_planifiee: new Date(Date.now() + 3600000).toISOString().slice(0, 16), // +1h
        });
        setIsTaskModalOpen(true);
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskFormData.id_type_tache || !taskFormData.date_debut_planifiee || !taskFormData.date_fin_planifiee) {
            setModalConfig({ isOpen: true, title: 'Attention', message: "Veuillez remplir les champs obligatoires de la tâche.", variant: 'warning' });
            return;
        }

        try {
            const payload: TacheCreate = {
                ...(taskFormData as TacheCreate),
                reclamation: reclamationTargetForTask?.id,
                // Conversion Dates ISO
                date_debut_planifiee: new Date(taskFormData.date_debut_planifiee!).toISOString(),
                date_fin_planifiee: new Date(taskFormData.date_fin_planifiee!).toISOString(),
            };

            await planningService.createTache(payload);

            setIsTaskModalOpen(false);
            setTaskFormData({});
            setReclamationTargetForTask(null);

            setModalConfig({
                isOpen: true,
                title: 'Succès',
                message: `Une tâche a été créée pour la réclamation ${reclamationTargetForTask?.numero_reclamation}.`,
                variant: 'success',
                onConfirm: () => setModalConfig(p => ({ ...p, isOpen: false }))
            });

        } catch (error) {
            console.error("Erreur création tâche", error);
            setModalConfig({ isOpen: true, title: 'Erreur', message: "Échec de la création de la tâche.", variant: 'danger' });
        }
    };


    const filteredReclamations = reclamations.filter(r =>
        r.numero_reclamation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredTaches = tachesLiees.filter(t =>
        t.type_tache_detail.nom_tache.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((t.client_detail as any)?.nom_structure || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description_travaux?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-emerald-600" />
                        Réclamations
                    </h1>
                    <div className="flex gap-6 mt-4 border-b border-gray-200">
                        <button onClick={() => setActiveTab('reclamations')} className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'reclamations' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            Réclamations ({filteredReclamations.length})
                        </button>
                        <button onClick={() => setActiveTab('taches')} className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'taches' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            Tâches liées ({filteredTaches.length})
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto mt-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
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
                        <span className="hidden sm:inline">Nouvelle</span>
                    </button>

                    <button
                        onClick={() => navigate('/reclamations/stats')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <TrendingUp className="w-5 h-5" />
                        <span className="hidden sm:inline">Statistiques</span>
                    </button>
                </div>
            </div>

            {/* Table Reclamations */}
            {activeTab === 'reclamations' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Numéro</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Type</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Urgence</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Site / Zone</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Date création</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Statut</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500">
                                            <div className="flex justify-center items-center gap-2">
                                                <div className="animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                                                Chargement...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredReclamations.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500 bg-gray-50/30">
                                            Aucune réclamation trouvée
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReclamations.map(rec => (
                                        <tr key={rec.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="p-4 text-sm font-medium text-slate-700">{rec.numero_reclamation}</td>
                                            <td className="p-4 text-sm text-slate-600">{rec.type_reclamation_nom}</td>
                                            <td className="p-4">
                                                <span
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                                    style={{
                                                        backgroundColor: (rec.urgence_couleur || '#ccc') + '20',
                                                        color: rec.urgence_couleur || '#666'
                                                    }}
                                                >
                                                    {rec.urgence_niveau}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{rec.site_nom}</span>
                                                    <span className="text-xs text-gray-400">{rec.zone_nom}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                {new Date(rec.date_creation).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="p-4">
                                                <span className={`
                                                inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium capitalize
                                                ${rec.statut === 'NOUVELLE' ? 'bg-blue-100 text-blue-800' :
                                                        rec.statut === 'RESOLUE' ? 'bg-green-100 text-green-800' :
                                                            rec.statut === 'EN_COURS' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'}
                                            `}>
                                                    {rec.statut.toLowerCase().replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleOpenTaskModal(rec)}
                                                        className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                                                        title="Créer une tâche"
                                                    >
                                                        <ClipboardList className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDetails(rec.id)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Voir détails"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(rec.id)}
                                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                        title="Modifier"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(rec.id)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
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
            )}

            {/* Table TACHES LIEES */}
            {activeTab === 'taches' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-purple-50/50 border-b border-purple-100">
                                <tr>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Type Tâche</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Réclamation liée</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Equipe</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Dates</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Priorité</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600">Statut</th>
                                    <th className="p-4 py-3 font-semibold text-sm text-gray-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-purple-50">
                                {filteredTaches.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500">
                                            Aucune tâche liée trouvée.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTaches.map(t => {
                                        const statutColors = STATUT_TACHE_COLORS[t.statut] || { bg: 'bg-gray-100', text: 'text-gray-800' };
                                        return (
                                            <tr key={t.id} className="hover:bg-purple-50/20 transition-colors">
                                                <td className="p-4 font-medium text-slate-700">{t.type_tache_detail.nom_tache}</td>
                                                <td className="p-4 text-sm text-slate-600">
                                                    {t.reclamation_numero ? (
                                                        <span className="flex items-center gap-1 font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                                            <AlertCircle className="w-3 h-3" />
                                                            {t.reclamation_numero}
                                                        </span>
                                                    ) : <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="p-4 text-sm text-slate-600">{(t.equipe_detail as any)?.nom_equipe || '-'}</td>
                                                <td className="p-4 text-sm text-slate-600">
                                                    Du {new Date(t.date_debut_planifiee).toLocaleDateString()} au {new Date(t.date_fin_planifiee).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-sm text-slate-600">{PRIORITE_LABELS[t.priorite]}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${statutColors.bg} ${statutColors.text}`}>
                                                        {t.statut}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => navigate(`/planning?date=${t.date_debut_planifiee?.split('T')[0] || ''}`)}
                                                        className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                                        title="Voir dans l'agenda"
                                                    >
                                                        <Calendar className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


            {/* Modal Création Tâche (Intervention) */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-purple-600" />
                                Planifier une Tâche
                            </h2>
                            <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTask} className="p-6 space-y-4">
                            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-4">
                                Tâche liée à la réclamation <strong>{reclamationTargetForTask?.numero_reclamation}</strong>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type de tâche <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={taskFormData.id_type_tache || ''}
                                    onChange={e => setTaskFormData({ ...taskFormData, id_type_tache: Number(e.target.value) })}
                                    className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="">Sélectionner...</option>
                                    {typesTaches.map(t => <option key={t.id} value={t.id}>{t.nom_tache}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Equipe</label>
                                <select
                                    value={taskFormData.id_equipe || ''}
                                    onChange={e => setTaskFormData({ ...taskFormData, id_equipe: e.target.value ? Number(e.target.value) : null })}
                                    className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="">Aucune équipe</option>
                                    {equipes.map(e => <option key={e.id} value={e.id}>{e.nomEquipe}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Début <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={taskFormData.date_debut_planifiee || ''}
                                        onChange={e => setTaskFormData({ ...taskFormData, date_debut_planifiee: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fin <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={taskFormData.date_fin_planifiee || ''}
                                        onChange={e => setTaskFormData({ ...taskFormData, date_fin_planifiee: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                                <select
                                    value={taskFormData.priorite || 3}
                                    onChange={e => setTaskFormData({ ...taskFormData, priorite: Number(e.target.value) as any })}
                                    className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    {Object.entries(PRIORITE_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Commentaires</label>
                                <textarea
                                    rows={3}
                                    value={taskFormData.commentaires || ''}
                                    onChange={e => setTaskFormData({ ...taskFormData, commentaires: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsTaskModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium shadow-sm"
                                >
                                    Créer la tâche
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Création / Edition Réclamation */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editingId ? 'Modifier la Réclamation' : 'Nouvelle Réclamation'}
                            </h2>
                            <button onClick={closeCreateModal} className="text-gray-400 hover:text-red-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de problème <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={formData.type_reclamation || ''}
                                        className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        onChange={e => setFormData({ ...formData, type_reclamation: Number(e.target.value) })}
                                    >
                                        <option value="">Sélectionner un type...</option>
                                        {types.map(t => <option key={t.id} value={t.id}>{t.nom_reclamation}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Urgence <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {urgences.map(u => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, urgence: u.id })}
                                                className={`
                                                    flex items-center justify-center p-2 rounded-lg border text-sm font-medium transition-all
                                                    ${formData.urgence === u.id
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'}
                                                `}
                                            >
                                                {u.niveau_urgence}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={formData.description || ''}
                                        className="w-full rounded-lg border-gray-300 border p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="Décrivez le problème..."
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                {/* Section Photos Existantes (Edition) */}
                                {existingPhotos.length > 0 && (
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                                            Photos existantes
                                        </label>
                                        <div className="flex gap-2 overflow-x-auto">
                                            {existingPhotos.map((p, i) => (
                                                <div key={p.id || i} className="relative group shrink-0">
                                                    <img
                                                        src={p.url_fichier}
                                                        alt={p.legende || 'Photo'}
                                                        className="h-20 w-20 object-cover rounded-md border border-gray-200"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {editingId ? 'Ajouter des photos' : 'Photos (optionnel)'}
                                    </label>
                                    <PhotoUpload
                                        photos={photos}
                                        onChange={setPhotos}
                                    />
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-100 shrink-0 bg-gray-50 flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm hover:shadow-md transition-all"
                                >
                                    {editingId ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}



            {/* Modal Détails */}
            {selectedReclamation && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    {selectedReclamation.numero_reclamation}
                                </h2>
                                <p className="text-sm text-gray-500">Créée le {new Date(selectedReclamation.date_creation).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <button onClick={() => setSelectedReclamation(null)} className="text-gray-400 hover:text-red-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Type</h4>
                                    <p className="font-medium text-gray-900 flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-emerald-600" />
                                        {selectedReclamation.type_reclamation_nom}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Urgence</h4>
                                    <span
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                            backgroundColor: (selectedReclamation.urgence_couleur || '#ccc') + '20',
                                            color: selectedReclamation.urgence_couleur || '#666'
                                        }}
                                    >
                                        {selectedReclamation.urgence_niveau}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Localisation</h4>
                                    <p className="font-medium text-gray-900 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        {selectedReclamation.site_nom || '-'} / {selectedReclamation.zone_nom || '-'}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Statut</h4>
                                    <span className="font-medium text-gray-900">
                                        {selectedReclamation.statut}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Equipe Affectée</h4>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-gray-900 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-purple-600" />
                                            {selectedReclamation.equipe_nom || 'Non affectée'}
                                        </p>
                                        <button
                                            onClick={openAssignModal}
                                            className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
                                        >
                                            Modifier
                                        </button>
                                    </div>
                                </div>
                            </div>


                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6">
                                <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Description</h4>
                                <p className="text-gray-700 whitespace-pre-line">{selectedReclamation.description}</p>
                            </div>

                            {/* Photos (Si disponibles) */}
                            {selectedReclamation.photos && selectedReclamation.photos.length > 0 ? (
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Photos jointes</h4>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {selectedReclamation.photos.map((p, i) => (
                                            <img key={i} src={p.url_fichier} alt={`Photo ${i}`} className="h-24 rounded-lg border border-gray-200" />
                                        ))}
                                    </div>
                                </div>
                            ) : (

                                <p className="text-xs text-gray-400 italic">Aucune photo jointe.</p>
                            )}
                            {/* TIME LINE (SUIVI) */}
                            <div className="mt-8 border-t border-gray-100 pt-6">
                                <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-emerald-600" />
                                    Suivi de traitement
                                </h4>
                                <ReclamationTimeline historique={selectedReclamation.historique || []} />
                            </div>

                            <div className="flex justify-end pt-4 gap-3">
                                <button
                                    onClick={() => {
                                        const rec = selectedReclamation;
                                        setSelectedReclamation(null);
                                        navigate('/planning', {
                                            state: {
                                                createTaskFromReclamation: true,
                                                reclamation: rec
                                            }
                                        });
                                    }}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2"
                                >
                                    <ClipboardList className="w-4 h-4" />
                                    Créer une tâche
                                </button>
                                {/* User 6.6.12.3 - Bouton Clôturer (visible uniquement si RESOLUE) */}
                                {selectedReclamation.statut === 'RESOLUE' && (
                                    <button
                                        onClick={handleCloturer}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                                    >
                                        <Clock className="w-4 h-4" />
                                        Clôturer
                                    </button>
                                )}
                                {/* User 6.6.13 - Bouton Évaluer (visible uniquement si CLOTUREE) */}
                                {selectedReclamation.statut === 'CLOTUREE' && (
                                    <button
                                        onClick={() => setShowSatisfactionForm(true)}
                                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium flex items-center gap-2"
                                    >
                                        <Star className="w-4 h-4" />
                                        Évaluer
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedReclamation(null)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Modal Assignation Equipe (Moved to end for stacking context) */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Users className="w-5 h-5 text-purple-600" />
                                Affecter une équipe
                            </h2>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
                            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-2">
                                Réc. <strong>{selectedReclamation?.numero_reclamation}</strong>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Choisir une équipe</label>
                                <select
                                    required
                                    value={assignEquipeId}
                                    onChange={e => setAssignEquipeId(Number(e.target.value))}
                                    className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="">Sélectionner...</option>
                                    {equipes.filter(e => e.actif).map(e => (
                                        <option key={e.id} value={e.id}>{e.nomEquipe}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                                >
                                    Valider
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                variant={modalConfig.variant === 'success' ? 'info' : modalConfig.variant}
                confirmLabel={modalConfig.confirmLabel || 'OK'}
                onConfirm={() => {
                    if (modalConfig.onConfirm) modalConfig.onConfirm();
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            />

            {/* User 6.6.13 - Formulaire Satisfaction */}
            {showSatisfactionForm && selectedReclamation && (
                <SatisfactionForm
                    reclamationId={selectedReclamation.id}
                    reclamationNumero={selectedReclamation.numero_reclamation}
                    onSubmit={handleSatisfactionSubmit}
                    onClose={() => setShowSatisfactionForm(false)}
                />
            )}
        </div >
    );
};

export default Reclamations;
