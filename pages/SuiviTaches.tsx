import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, Search, MapPin,
    ChevronRight, Camera, Package, AlertCircle, Plus, Trash2,
    Loader2, FileImage, Play, CheckCircle, XCircle, ThumbsUp, ThumbsDown, ShieldCheck
} from 'lucide-react';
import { planningService } from '../services/planningService';
import { fetchCurrentUser } from '../services/api';
import {
    fetchPhotosParTache, createPhoto, deletePhoto,
    fetchConsommationsParTache, createConsommation, deleteConsommation,
    fetchProduitsActifs
} from '../services/suiviTachesApi';
import { Tache, STATUT_TACHE_COLORS, PRIORITE_LABELS, ETAT_VALIDATION_COLORS, ETAT_VALIDATION_LABELS } from '../types/planning';
import { PhotoList, ConsommationProduit, ProduitList } from '../types/suiviTaches';
import LoadingWrapper from '../components/LoadingWrapper';

// Helper pour construire l'URL complète des images
const getFullImageUrl = (url: string | null): string => {
    if (!url) return '';
    // Si l'URL est déjà absolue, la retourner telle quelle
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // Sinon, ajouter le préfixe du backend
    const backendUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000';
    return `${backendUrl}${url}`;
};

const SuiviTaches: React.FC = () => {
    // State UI
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [taches, setTaches] = useState<Tache[]>([]);
    const [selectedTache, setSelectedTache] = useState<Tache | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // State Détail Tâche
    const [activeTab, setActiveTab] = useState<'info' | 'photos' | 'produits'>('info');
    const [photos, setPhotos] = useState<PhotoList[]>([]);
    const [consommations, setConsommations] = useState<ConsommationProduit[]>([]);
    const [produitsOptions, setProduitsOptions] = useState<ProduitList[]>([]);

    // Loading States Locals
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [loadingConsommations, setLoadingConsommations] = useState(false);
    const [changingStatut, setChangingStatut] = useState(false);

    // Type de photo sélectionné pour l'upload
    const [selectedPhotoType, setSelectedPhotoType] = useState<'AVANT' | 'APRES'>('AVANT');

    // Rôle utilisateur (pour afficher les boutons de validation admin)
    const [isAdmin, setIsAdmin] = useState(false);
    // Mode lecture seule pour les clients
    const [isClientView, setIsClientView] = useState(false);

    // Modal de validation
    const [validationModal, setValidationModal] = useState<{
        isOpen: boolean;
        type: 'VALIDEE' | 'REJETEE';
    } | null>(null);
    const [validationComment, setValidationComment] = useState('');
    const [validating, setValidating] = useState(false);

    // Form States
    const [newConsommation, setNewConsommation] = useState({
        produit: '',
        quantite: '',
        unite: 'L',
        commentaire: ''
    });

    // Modal de confirmation
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'start' | 'complete' | 'cancel';
        icon: 'play' | 'check' | 'x';
    } | null>(null);

    // Chargement initial des tâches (filtrées automatiquement par le backend selon les permissions)
    useEffect(() => {
        loadTaches();
        loadProduitsOptions();
        loadUserRole();
    }, []);

    const loadUserRole = async () => {
        try {
            const userData = await fetchCurrentUser();
            const roles = userData.roles || [];
            setIsAdmin(roles.includes('ADMIN'));
            setIsClientView(roles.includes('CLIENT'));
        } catch (error) {
            console.error("Erreur chargement rôle utilisateur", error);
        }
    };

    // Chargement détails quand une tâche est sélectionnée
    useEffect(() => {
        if (selectedTache) {
            loadTaskDetails(selectedTache.id);
            setActiveTab('info');
        }
    }, [selectedTache]);

    const loadTaches = async () => {
        setLoadingTasks(true);
        try {
            // Le backend filtre automatiquement selon les permissions de l'utilisateur
            const response = await planningService.getTaches({ page: 1 });
            setTaches(response.results);
        } catch (error) {
            console.error("Erreur chargement tâches", error);
        } finally {
            setLoadingTasks(false);
        }
    };

    const loadProduitsOptions = async () => {
        try {
            const data = await fetchProduitsActifs();
            setProduitsOptions(data);
        } catch (error) {
            console.error("Erreur chargement produits", error);
        }
    };

    const loadTaskDetails = async (tacheId: number) => {
        setLoadingPhotos(true);
        setLoadingConsommations(true);
        try {
            const [photosData, consosData] = await Promise.all([
                fetchPhotosParTache(tacheId),
                fetchConsommationsParTache(tacheId)
            ]);
            setPhotos(photosData);
            setConsommations(consosData);
        } catch (error) {
            console.error("Erreur chargement détails tâche", error);
        } finally {
            setLoadingPhotos(false);
            setLoadingConsommations(false);
        }
    };

    // --- ACTIONS PHOTOS ---

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files.length || !selectedTache) return;

        setUploadingPhoto(true);
        const files = Array.from(e.target.files);

        try {
            for (const file of files) {
                await createPhoto({
                    fichier: file,
                    type_photo: selectedPhotoType,
                    tache: selectedTache.id,
                    legende: file.name
                });
            }
            // Recharger les photos
            const updatedPhotos = await fetchPhotosParTache(selectedTache.id);
            setPhotos(updatedPhotos);
        } catch (error) {
            console.error("Erreur upload photo", error);
            alert("Erreur lors de l'upload des photos");
        } finally {
            setUploadingPhoto(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleDeletePhoto = async (photoId: number) => {
        if (!confirm("Supprimer cette photo ?")) return;
        try {
            await deletePhoto(photoId);
            setPhotos(prev => prev.filter(p => p.id !== photoId));
        } catch (error) {
            console.error("Erreur suppression photo", error);
        }
    };

    // --- ACTIONS CONSOMMATION ---

    const handleAddConsommation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTache || !newConsommation.produit || !newConsommation.quantite) return;

        try {
            await createConsommation({
                tache: selectedTache.id,
                produit: parseInt(newConsommation.produit),
                quantite_utilisee: parseFloat(newConsommation.quantite),
                unite: newConsommation.unite,
                commentaire: newConsommation.commentaire
            });

            // Reload & Reset
            const updatedConsos = await fetchConsommationsParTache(selectedTache.id);
            setConsommations(updatedConsos);
            setNewConsommation({ produit: '', quantite: '', unite: 'L', commentaire: '' });
        } catch (error) {
            console.error("Erreur ajout consommation", error);
            alert("Erreur lors de l'ajout de la consommation");
        }
    };

    const handleDeleteConsommation = async (consoId: number) => {
        if (!confirm("Supprimer cette ligne de consommation ?")) return;
        try {
            await deleteConsommation(consoId);
            setConsommations(prev => prev.filter(c => c.id !== consoId));
        } catch (error) {
            console.error("Erreur suppression consommation", error);
        }
    };

    // --- ACTIONS STATUT ---

    // Ouvre le modal de confirmation
    const openConfirmModal = (type: 'start' | 'complete' | 'cancel') => {
        const configs = {
            start: {
                title: 'Démarrer la tâche',
                message: 'Êtes-vous sûr de vouloir démarrer cette tâche maintenant ? La date de début réelle sera enregistrée.',
                icon: 'play' as const
            },
            complete: {
                title: 'Terminer la tâche',
                message: 'Êtes-vous sûr de vouloir marquer cette tâche comme terminée ? La date de fin réelle sera enregistrée.',
                icon: 'check' as const
            },
            cancel: {
                title: 'Annuler la tâche',
                message: 'Êtes-vous sûr de vouloir annuler cette tâche ? Cette action peut être irréversible.',
                icon: 'x' as const
            }
        };

        setConfirmModal({
            isOpen: true,
            type,
            ...configs[type]
        });
    };

    // Exécute l'action confirmée
    const executeConfirmedAction = async () => {
        if (!selectedTache || !confirmModal) return;

        setConfirmModal(null);
        setChangingStatut(true);

        try {
            let nouveauStatut: 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

            switch (confirmModal.type) {
                case 'start':
                    nouveauStatut = 'EN_COURS';
                    break;
                case 'complete':
                    nouveauStatut = 'TERMINEE';
                    break;
                case 'cancel':
                    nouveauStatut = 'ANNULEE';
                    break;
            }

            const updatedTache = await planningService.changeStatut(selectedTache.id, nouveauStatut);
            setSelectedTache(updatedTache);
            setTaches(prev => prev.map(t => t.id === updatedTache.id ? updatedTache : t));
        } catch (error) {
            console.error("Erreur changement statut", error);
            alert("Erreur lors du changement de statut de la tâche");
        } finally {
            setChangingStatut(false);
        }
    };

    // --- VALIDATION ADMIN ---

    const openValidationModal = (type: 'VALIDEE' | 'REJETEE') => {
        setValidationModal({ isOpen: true, type });
        setValidationComment('');
    };

    const handleValidation = async () => {
        if (!selectedTache || !validationModal) return;

        setValidating(true);
        try {
            const result = await planningService.validerTache(
                selectedTache.id,
                validationModal.type,
                validationComment
            );
            setSelectedTache(result.tache);
            setTaches(prev => prev.map(t => t.id === result.tache.id ? result.tache : t));
            setValidationModal(null);
            setValidationComment('');
        } catch (error) {
            console.error("Erreur validation", error);
            alert("Erreur lors de la validation de la tâche");
        } finally {
            setValidating(false);
        }
    };

    // --- RENDER ---

    const filteredTaches = taches.filter(t => {
        const teamNames = t.equipes_detail?.length > 0
            ? t.equipes_detail.map((e: any) => e.nom_equipe || e.nomEquipe).join(' ')
            : (t.equipe_detail as any)?.nom_equipe || t.equipe_detail?.nomEquipe || '';

        return t.type_tache_detail?.nom_tache.toLowerCase().includes(searchQuery.toLowerCase()) ||
            teamNames.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="flex h-full bg-gray-50 overflow-hidden">
            {/* LISTE DES TACHES (SIDEBAR GAUCHE) */}
            <div className={`w-full md:w-1/3 min-w-[320px] max-w-md bg-white border-r border-gray-200 flex flex-col ${selectedTache ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-gray-800 mb-4">Journal de tâches</h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher une tâche..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingTasks ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredTaches.map(tache => (
                                <div
                                    key={tache.id}
                                    onClick={() => setSelectedTache(tache)}
                                    className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${selectedTache?.id === tache.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'border-l-4 border-transparent'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-semibold text-gray-900">{tache.type_tache_detail?.nom_tache || 'Tâche sans nom'}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_TACHE_COLORS[tache.statut]?.bg} ${STATUT_TACHE_COLORS[tache.statut]?.text}`}>
                                            {tache.statut}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(tache.date_debut_planifiee).toLocaleDateString()}
                                        <Clock className="w-3 h-3 ml-2" />
                                        {new Date(tache.date_debut_planifiee).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                        <MapPin className="w-3 h-3" />
                                        <span className="truncate">Équipe: {
                                            tache.equipes_detail?.length > 0
                                                ? tache.equipes_detail.map((e: any) => e.nom_equipe || e.nomEquipe).join(', ')
                                                : (tache.equipe_detail as any)?.nom_equipe || tache.equipe_detail?.nomEquipe || 'N/A'
                                        }</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* DETAIL TACHE (MAIN CONTENT) */}
            <div className={`flex-1 flex flex-col bg-gray-50 relative ${!selectedTache ? 'hidden md:flex' : 'flex'}`}>
                {selectedTache ? (
                    <>
                        {/* Header Détail */}
                        <div className="bg-white border-b border-gray-200 p-4 shadow-sm flex-shrink-0">
                            <button onClick={() => setSelectedTache(null)} className="md:hidden text-gray-500 mb-2 flex items-center gap-1">
                                <ChevronRight className="w-4 h-4 rotate-180" /> Retour
                            </button>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedTache.type_tache_detail?.nom_tache}</h2>
                                    <p className="text-gray-500 flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-sm text-gray-700">#{selectedTache.id}</span>
                                        <span>Priorité: {PRIORITE_LABELS[selectedTache.priorite]}</span>
                                        <span className={`px-2 py-0.5 rounded text-sm font-medium ${STATUT_TACHE_COLORS[selectedTache.statut]?.bg} ${STATUT_TACHE_COLORS[selectedTache.statut]?.text}`}>
                                            {selectedTache.statut}
                                        </span>
                                        {/* Badge état de validation - visible uniquement pour les tâches terminées */}
                                        {selectedTache.statut === 'TERMINEE' && (
                                            <span className={`px-2 py-0.5 rounded text-sm font-medium flex items-center gap-1 ${ETAT_VALIDATION_COLORS[selectedTache.etat_validation]?.bg} ${ETAT_VALIDATION_COLORS[selectedTache.etat_validation]?.text}`}>
                                                <ShieldCheck className="w-3 h-3" />
                                                {ETAT_VALIDATION_LABELS[selectedTache.etat_validation]}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {/* Mode consultation pour les clients */}
                                    {isClientView ? (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>Mode consultation</span>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Bouton Démarrer - visible si PLANIFIEE ou NON_DEBUTEE */}
                                            {(selectedTache.statut === 'PLANIFIEE' || selectedTache.statut === 'NON_DEBUTEE') && (
                                                <button
                                                    onClick={() => openConfirmModal('start')}
                                                    disabled={changingStatut}
                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                >
                                                    {changingStatut ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Play className="w-4 h-4" />
                                                    )}
                                                    Démarrer
                                                </button>
                                            )}

                                            {/* Bouton Terminer - visible si EN_COURS */}
                                            {selectedTache.statut === 'EN_COURS' && (
                                                <button
                                                    onClick={() => openConfirmModal('complete')}
                                                    disabled={changingStatut}
                                                    title="Terminer la tâche"
                                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                >
                                                    {changingStatut ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="w-4 h-4" />
                                                    )}
                                                    Terminer
                                                </button>
                                            )}

                                            {/* Bouton Annuler - visible si pas encore TERMINEE ou ANNULEE */}
                                            {selectedTache.statut !== 'TERMINEE' && selectedTache.statut !== 'ANNULEE' && (
                                                <button
                                                    onClick={() => openConfirmModal('cancel')}
                                                    disabled={changingStatut}
                                                    className="flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                                    title="Annuler la tâche"
                                                >
                                                    {changingStatut ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}

                                            {/* Boutons de validation ADMIN - visibles uniquement pour les tâches terminées en attente */}
                                            {isAdmin && selectedTache.statut === 'TERMINEE' && selectedTache.etat_validation === 'EN_ATTENTE' && (
                                                <>
                                                    <button
                                                        onClick={() => openValidationModal('VALIDEE')}
                                                        disabled={validating}
                                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {validating ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <ThumbsUp className="w-4 h-4" />
                                                        )}
                                                        Valider
                                                    </button>
                                                    <button
                                                        onClick={() => openValidationModal('REJETEE')}
                                                        disabled={validating}
                                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {validating ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <ThumbsDown className="w-4 h-4" />
                                                        )}
                                                        Rejeter
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Onglets */}
                            <div className="flex gap-6 mt-6 border-b border-gray-100">
                                <button
                                    onClick={() => setActiveTab('info')}
                                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    Informations
                                </button>
                                <button
                                    onClick={() => setActiveTab('photos')}
                                    className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'photos' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Camera className="w-4 h-4" /> Photos ({photos.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('produits')}
                                    className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'produits' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Package className="w-4 h-4" /> Produits ({consommations.length})
                                </button>
                            </div>
                        </div>

                        {/* Contenu Onglets */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6">

                            {activeTab === 'info' && (
                                <div className="space-y-6 max-w-3xl">
                                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Détails de l'intervention</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase">Site / Zone</label>
                                                {selectedTache.objets_detail && selectedTache.objets_detail.length > 0 ? (
                                                    selectedTache.objets_detail.map((obj, idx) => (
                                                        <div key={idx} className="flex flex-col mt-1">
                                                            <span className="text-gray-900 font-medium leading-tight">{obj.site}</span>
                                                            <span className="text-sm text-gray-500">{obj.sous_site}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-gray-900 mt-1">-</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase">Date Début Planifiée</label>
                                                <p className="text-gray-900">{new Date(selectedTache.date_debut_planifiee).toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase">Date Fin Planifiée</label>
                                                <p className="text-gray-900">{new Date(selectedTache.date_fin_planifiee).toLocaleString()}</p>
                                            </div>
                                            {selectedTache.date_debut_reelle && (
                                                <div>
                                                    <label className="text-xs font-semibold text-emerald-600 uppercase">Date Début Réelle</label>
                                                    <p className="text-gray-900">{new Date(selectedTache.date_debut_reelle).toLocaleString()}</p>
                                                </div>
                                            )}
                                            {selectedTache.date_fin_reelle && (
                                                <div>
                                                    <label className="text-xs font-semibold text-blue-600 uppercase">Date Fin Réelle</label>
                                                    <p className="text-gray-900">{new Date(selectedTache.date_fin_reelle).toLocaleString()}</p>
                                                </div>
                                            )}
                                            <div className="col-span-2">
                                                <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
                                                <p className="text-gray-900 mt-1">{selectedTache.description_travaux || 'Aucune description'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {selectedTache.reclamation_numero && (
                                        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-orange-800">Lié à une réclamation</h4>
                                                <p className="text-sm text-orange-700">Réclamation #{selectedTache.reclamation_numero}</p>
                                            </div>
                                        </div>
                                    )}
                                    {/* Photos Section in Info Tab */}
                                    <div className="mt-8 pt-6 border-t border-gray-100">
                                        <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                                            <Camera className="w-5 h-5 text-gray-500" />
                                            Photos de l'intervention
                                        </h3>
                                        {photos.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {photos.map(photo => {
                                                    const imageUrl = getFullImageUrl(photo.url_fichier);
                                                    return (
                                                        <div key={photo.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                                                            <img
                                                                src={imageUrl}
                                                                alt={photo.legende || 'Photo'}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Y2EzYWYiIHN0cm9rZS13aWR0aD0iMiI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ii8+PHBhdGggZD0ibTIxIDE1LTUtNUw1IDIxIi8+PC9zdmc+';
                                                                }}
                                                            />
                                                            {/* Badge type photo */}
                                                            <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full ${photo.type_photo === 'AVANT'
                                                                ? 'bg-amber-500/80 text-white'
                                                                : 'bg-emerald-500/80 text-white'
                                                                }`}>
                                                                {photo.type_photo_display}
                                                            </span>
                                                            <a
                                                                href={imageUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Search className="w-6 h-6 text-white drop-shadow-md" />
                                                            </a>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-sm italic">Aucune photo pour l'instant.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'photos' && (() => {
                                // Compter les photos par type
                                const photosAvant = photos.filter(p => p.type_photo === 'AVANT').length;
                                const photosApres = photos.filter(p => p.type_photo === 'APRES').length;
                                const MAX_PHOTOS_PAR_TYPE = 3;
                                const canAddAvant = photosAvant < MAX_PHOTOS_PAR_TYPE;
                                const canAddApres = photosApres < MAX_PHOTOS_PAR_TYPE;
                                const canAddSelected = selectedPhotoType === 'AVANT' ? canAddAvant : canAddApres;
                                const currentCount = selectedPhotoType === 'AVANT' ? photosAvant : photosApres;

                                return (
                                    <div className="space-y-6">
                                        {/* Sélecteur de type de photo avec compteurs et zone d'upload - masqués pour les clients */}
                                        {!isClientView && (
                                            <>
                                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-3">Type de photo à ajouter (max 3 par type)</label>
                                                    <div className="flex gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedPhotoType('AVANT')}
                                                            className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-xl font-medium transition-all ${selectedPhotoType === 'AVANT'
                                                                ? 'bg-amber-100 text-amber-800 border-2 border-amber-400 shadow-sm'
                                                                : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Camera className="w-5 h-5" />
                                                                <span>Avant intervention</span>
                                                            </div>
                                                            <div className={`text-xs px-2 py-0.5 rounded-full ${canAddAvant
                                                                ? 'bg-amber-200 text-amber-800'
                                                                : 'bg-red-100 text-red-600'
                                                                }`}>
                                                                {photosAvant}/{MAX_PHOTOS_PAR_TYPE}
                                                            </div>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedPhotoType('APRES')}
                                                            className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-xl font-medium transition-all ${selectedPhotoType === 'APRES'
                                                                ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400 shadow-sm'
                                                                : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <CheckCircle className="w-5 h-5" />
                                                                <span>Après intervention</span>
                                                            </div>
                                                            <div className={`text-xs px-2 py-0.5 rounded-full ${canAddApres
                                                                ? 'bg-emerald-200 text-emerald-800'
                                                                : 'bg-red-100 text-red-600'
                                                                }`}>
                                                                {photosApres}/{MAX_PHOTOS_PAR_TYPE}
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Upload Zone */}
                                                <div className={`bg-white rounded-xl shadow-sm border-2 border-dashed p-8 text-center transition-colors ${!canAddSelected
                                                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                                    : selectedPhotoType === 'AVANT'
                                                        ? 'border-amber-300 hover:bg-gray-50'
                                                        : 'border-emerald-300 hover:bg-gray-50'
                                                    }`}>
                                                    <input
                                                        type="file"
                                                        id="photo-upload"
                                                        multiple
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handlePhotoUpload}
                                                        disabled={uploadingPhoto || !canAddSelected}
                                                    />
                                                    <label
                                                        htmlFor="photo-upload"
                                                        className={`flex flex-col items-center ${canAddSelected ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                                    >
                                                        {uploadingPhoto ? (
                                                            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-3" />
                                                        ) : !canAddSelected ? (
                                                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-gray-200 text-gray-400">
                                                                <XCircle className="w-6 h-6" />
                                                            </div>
                                                        ) : (
                                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${selectedPhotoType === 'AVANT'
                                                                ? 'bg-amber-100 text-amber-600'
                                                                : 'bg-emerald-100 text-emerald-600'
                                                                }`}>
                                                                <Camera className="w-6 h-6" />
                                                            </div>
                                                        )}
                                                        {canAddSelected ? (
                                                            <>
                                                                <span className="text-lg font-medium text-gray-900">
                                                                    Ajouter des photos {selectedPhotoType === 'AVANT' ? 'avant' : 'après'} intervention
                                                                </span>
                                                                <span className="text-sm text-gray-500 mt-1">Cliquez pour parcourir (JPG, PNG)</span>
                                                                <span className={`text-xs mt-2 px-3 py-1 rounded-full ${selectedPhotoType === 'AVANT'
                                                                    ? 'bg-amber-100 text-amber-700'
                                                                    : 'bg-emerald-100 text-emerald-700'
                                                                    }`}>
                                                                    {currentCount}/{MAX_PHOTOS_PAR_TYPE} photos
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="text-lg font-medium text-gray-500">
                                                                    Limite atteinte
                                                                </span>
                                                                <span className="text-sm text-gray-400 mt-1">
                                                                    Maximum {MAX_PHOTOS_PAR_TYPE} photos {selectedPhotoType === 'AVANT' ? 'avant' : 'après'} intervention
                                                                </span>
                                                                <span className="text-xs mt-2 px-3 py-1 rounded-full bg-red-100 text-red-600">
                                                                    {currentCount}/{MAX_PHOTOS_PAR_TYPE} photos
                                                                </span>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                            </>
                                        )}

                                        {/* Gallery */}
                                        {loadingPhotos ? (
                                            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                                        ) : photos.length === 0 ? (
                                            <div className="text-center py-12 text-gray-400">
                                                <FileImage className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                <p>Aucune photo pour cette intervention</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {photos.map(photo => {
                                                    const imageUrl = getFullImageUrl(photo.url_fichier);
                                                    return (
                                                        <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                                            <img
                                                                src={imageUrl}
                                                                alt={photo.legende || 'Photo'}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    // Fallback en cas d'erreur de chargement
                                                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Y2EzYWYiIHN0cm9rZS13aWR0aD0iMiI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ii8+PHBhdGggZD0ibTIxIDE1LTUtNUw1IDIxIi8+PC9zdmc+';
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <a
                                                                    href={imageUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm"
                                                                >
                                                                    <Search className="w-5 h-5" />
                                                                </a>
                                                                {!isClientView && (
                                                                    <button
                                                                        onClick={() => handleDeletePhoto(photo.id)}
                                                                        className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white backdrop-blur-sm"
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                                                <span className={`text-xs px-2 py-0.5 rounded-full ${photo.type_photo === 'AVANT'
                                                                    ? 'bg-amber-500/80 text-white'
                                                                    : 'bg-emerald-500/80 text-white'
                                                                    }`}>
                                                                    {photo.type_photo_display}
                                                                </span>
                                                                <p className="text-gray-300 text-[10px] mt-1">{new Date(photo.date_prise).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {activeTab === 'produits' && (
                                <div className="space-y-6">
                                    {/* Form Ajout - masqué pour les clients */}
                                    {!isClientView && (
                                        <form onSubmit={handleAddConsommation} className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
                                            <div className="flex-1 w-full">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Produit</label>
                                                <select
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    value={newConsommation.produit}
                                                    onChange={e => setNewConsommation({ ...newConsommation, produit: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Sélectionner un produit...</option>
                                                    {produitsOptions.map(p => (
                                                        <option key={p.id} value={p.id}>{p.nom_produit}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-full md:w-32">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    value={newConsommation.quantite}
                                                    onChange={e => setNewConsommation({ ...newConsommation, quantite: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="w-full md:w-24">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
                                                <select
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    value={newConsommation.unite}
                                                    onChange={e => setNewConsommation({ ...newConsommation, unite: e.target.value })}
                                                >
                                                    <option value="L">Litres (L)</option>
                                                    <option value="ml">Millilitres (ml)</option>
                                                    <option value="kg">Kilogrammes (kg)</option>
                                                    <option value="g">Grammes (g)</option>
                                                </select>
                                            </div>
                                            <button
                                                type="submit"
                                                className="w-full md:w-auto px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
                                                disabled={loadingConsommations}
                                            >
                                                <Plus className="w-4 h-4" /> Ajouter
                                            </button>
                                        </form>
                                    )}

                                    {/* Liste Consommations */}
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4 py-3 text-xs font-semibold text-gray-500 uppercase">Produit</th>
                                                    <th className="p-4 py-3 text-xs font-semibold text-gray-500 uppercase">Quantité</th>
                                                    {!isClientView && (
                                                        <th className="p-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {consommations.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={isClientView ? 2 : 3} className="p-6 text-center text-gray-500">Aucun produit consommé enregistré.</td>
                                                    </tr>
                                                ) : (
                                                    consommations.map(conso => (
                                                        <tr key={conso.id} className="hover:bg-gray-50">
                                                            <td className="p-4 font-medium text-gray-900">{conso.produit_nom}</td>
                                                            <td className="p-4 text-gray-600">{conso.quantite_utilisee} {conso.unite}</td>
                                                            {!isClientView && (
                                                                <td className="p-4 text-right">
                                                                    <button
                                                                        onClick={() => handleDeleteConsommation(conso.id)}
                                                                        className="text-gray-400 hover:text-red-500 p-1"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Clock className="w-10 h-10 text-gray-300" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sélectionnez une intervention</h2>
                        <p className="text-center max-w-sm">
                            Cliquez sur une tâche dans la liste de gauche pour saisir le rapport d'intervention (photos, produits).
                        </p>
                    </div>
                )}
            </div>

            {/* Modal de confirmation */}
            {confirmModal?.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header avec icône */}
                        <div className={`p-6 text-center ${confirmModal.type === 'start' ? 'bg-emerald-50' :
                            confirmModal.type === 'complete' ? 'bg-blue-50' : 'bg-red-50'
                            }`}>
                            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${confirmModal.type === 'start' ? 'bg-emerald-100' :
                                confirmModal.type === 'complete' ? 'bg-blue-100' : 'bg-red-100'
                                }`}>
                                {confirmModal.icon === 'play' && (
                                    <Play className="w-8 h-8 text-emerald-600" />
                                )}
                                {confirmModal.icon === 'check' && (
                                    <CheckCircle className="w-8 h-8 text-blue-600" />
                                )}
                                {confirmModal.icon === 'x' && (
                                    <XCircle className="w-8 h-8 text-red-600" />
                                )}
                            </div>
                            <h3 className={`text-xl font-bold ${confirmModal.type === 'start' ? 'text-emerald-900' :
                                confirmModal.type === 'complete' ? 'text-blue-900' : 'text-red-900'
                                }`}>
                                {confirmModal.title}
                            </h3>
                        </div>

                        {/* Corps du message */}
                        <div className="p-6">
                            <p className="text-gray-600 text-center mb-6">
                                {confirmModal.message}
                            </p>

                            {/* Informations sur la tâche */}
                            {selectedTache && (
                                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                            <Calendar className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{selectedTache.type_tache_detail?.nom_tache}</p>
                                            <p className="text-sm text-gray-500">#{selectedTache.id}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Boutons d'action */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={executeConfirmedAction}
                                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${confirmModal.type === 'start'
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                                        confirmModal.type === 'complete'
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-red-600 text-white hover:bg-red-700'
                                        }`}
                                >
                                    {confirmModal.icon === 'play' && <Play className="w-4 h-4" />}
                                    {confirmModal.icon === 'check' && <CheckCircle className="w-4 h-4" />}
                                    {confirmModal.icon === 'x' && <XCircle className="w-4 h-4" />}
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de validation ADMIN */}
            {validationModal?.isOpen && selectedTache && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header avec icône */}
                        <div className={`p-6 text-center ${validationModal.type === 'VALIDEE' ? 'bg-emerald-50' : 'bg-red-50'
                            }`}>
                            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${validationModal.type === 'VALIDEE' ? 'bg-emerald-100' : 'bg-red-100'
                                }`}>
                                {validationModal.type === 'VALIDEE' ? (
                                    <ThumbsUp className="w-8 h-8 text-emerald-600" />
                                ) : (
                                    <ThumbsDown className="w-8 h-8 text-red-600" />
                                )}
                            </div>
                            <h3 className={`text-xl font-bold ${validationModal.type === 'VALIDEE' ? 'text-emerald-900' : 'text-red-900'
                                }`}>
                                {validationModal.type === 'VALIDEE' ? 'Valider la tâche' : 'Rejeter la tâche'}
                            </h3>
                        </div>

                        {/* Corps */}
                        <div className="p-6">
                            <p className="text-gray-600 text-center mb-4">
                                {validationModal.type === 'VALIDEE'
                                    ? 'Confirmez-vous que cette tâche a été correctement réalisée ?'
                                    : 'Indiquez la raison du rejet de cette tâche.'}
                            </p>

                            {/* Informations sur la tâche */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{selectedTache.type_tache_detail?.nom_tache}</p>
                                        <p className="text-sm text-gray-500">#{selectedTache.id}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Champ commentaire */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Commentaire {validationModal.type === 'REJETEE' && <span className="text-red-500">*</span>}
                                </label>
                                <textarea
                                    value={validationComment}
                                    onChange={(e) => setValidationComment(e.target.value)}
                                    placeholder={validationModal.type === 'VALIDEE'
                                        ? 'Commentaire optionnel...'
                                        : 'Raison du rejet...'}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                    rows={3}
                                    required={validationModal.type === 'REJETEE'}
                                />
                            </div>

                            {/* Boutons d'action */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setValidationModal(null);
                                        setValidationComment('');
                                    }}
                                    disabled={validating}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleValidation}
                                    disabled={validating || (validationModal.type === 'REJETEE' && !validationComment.trim())}
                                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${validationModal.type === 'VALIDEE'
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                        }`}
                                >
                                    {validating ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : validationModal.type === 'VALIDEE' ? (
                                        <ThumbsUp className="w-4 h-4" />
                                    ) : (
                                        <ThumbsDown className="w-4 h-4" />
                                    )}
                                    {validationModal.type === 'VALIDEE' ? 'Valider' : 'Rejeter'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuiviTaches;
