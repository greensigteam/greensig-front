import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, Search, MapPin,
    ChevronRight, Camera, Package, AlertCircle, Plus, Trash2,
    Loader2, FileImage
} from 'lucide-react';
import { planningService } from '../services/planningService';
import {
    fetchPhotosParTache, createPhoto, deletePhoto,
    fetchConsommationsParTache, createConsommation, deleteConsommation,
    fetchProduitsActifs
} from '../services/suiviTachesApi';
import { Tache, STATUT_TACHE_COLORS, PRIORITE_LABELS } from '../types/planning';
import { PhotoList, ConsommationProduit, ProduitList } from '../types/suiviTaches';

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

    // Form States
    const [newConsommation, setNewConsommation] = useState({
        produit: '',
        quantite: '',
        unite: 'L',
        commentaire: ''
    });

    // Chargement initial des tâches
    useEffect(() => {
        loadTaches();
        loadProduitsOptions();
    }, []);

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
            // Charge les tâches du mois en cours par défaut, ou une liste paginée. 
            // Ici on simplifie en demandant les 50 dernières tout court pour l'exemple
            // Idéalement on filtrerait par date
            const response = await planningService.getTaches({ page: 1 }); // TODO: Augmenter page_size si possible ou gérer pagination
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
                    type_photo: 'APRES', // Par défaut
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

    // --- RENDER ---

    const filteredTaches = taches.filter(t =>
        t.type_tache_detail?.nom_tache.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.equipe_detail?.nomEquipe?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

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
                                        <span className="truncate">Client: {tache.client_detail?.nomStructure || tache.client_detail?.nom || 'N/A'}</span>
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
                                    <p className="text-gray-500 flex items-center gap-2 mt-1">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-sm text-gray-700">#{selectedTache.id}</span>
                                        <span>Priorité: {PRIORITE_LABELS[selectedTache.priorite]}</span>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {/* Actions Globales Tâche si besoin (Clôturer, etc) */}
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
                                                <label className="text-xs font-semibold text-gray-500 uppercase">Date Planifiée</label>
                                                <p className="text-gray-900">{new Date(selectedTache.date_debut_planifiee).toLocaleString()}</p>
                                            </div>
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
                                                {photos.map(photo => (
                                                    <div key={photo.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                                                        <img
                                                            src={photo.url_fichier}
                                                            alt={photo.legende || 'Photo'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <a
                                                            href={photo.url_fichier}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Search className="w-6 h-6 text-white drop-shadow-md" />
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-sm italic">Aucune photo pour l'instant.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'photos' && (
                                <div className="space-y-6">
                                    {/* Upload Zone */}
                                    <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-8 text-center transition-colors hover:bg-gray-50">
                                        <input
                                            type="file"
                                            id="photo-upload"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handlePhotoUpload}
                                            disabled={uploadingPhoto}
                                        />
                                        <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center">
                                            {uploadingPhoto ? (
                                                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-3" />
                                            ) : (
                                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3 text-emerald-600">
                                                    <Camera className="w-6 h-6" />
                                                </div>
                                            )}
                                            <span className="text-lg font-medium text-gray-900">Ajouter des photos</span>
                                            <span className="text-sm text-gray-500 mt-1">Cliquez pour parcourir (JPG, PNG)</span>
                                        </label>
                                    </div>

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
                                            {photos.map(photo => (
                                                <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                                    <img
                                                        src={photo.url_fichier}
                                                        alt={photo.legende || 'Photo'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <a
                                                            href={photo.url_fichier}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm"
                                                        >
                                                            <Search className="w-5 h-5" />
                                                        </a>
                                                        <button
                                                            onClick={() => handleDeletePhoto(photo.id)}
                                                            className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white backdrop-blur-sm"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                                        <p className="text-white text-xs truncate">{photo.type_photo_display}</p>
                                                        <p className="text-gray-300 text-[10px]">{new Date(photo.date_prise).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'produits' && (
                                <div className="space-y-6">
                                    {/* Form Ajout */}
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

                                    {/* Liste Consommations */}
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4 py-3 text-xs font-semibold text-gray-500 uppercase">Produit</th>
                                                    <th className="p-4 py-3 text-xs font-semibold text-gray-500 uppercase">Quantité</th>
                                                    <th className="p-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {consommations.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={3} className="p-6 text-center text-gray-500">Aucun produit consommé enregistré.</td>
                                                    </tr>
                                                ) : (
                                                    consommations.map(conso => (
                                                        <tr key={conso.id} className="hover:bg-gray-50">
                                                            <td className="p-4 font-medium text-gray-900">{conso.produit_nom}</td>
                                                            <td className="p-4 text-gray-600">{conso.quantite_utilisee} {conso.unite}</td>
                                                            <td className="p-4 text-right">
                                                                <button
                                                                    onClick={() => handleDeleteConsommation(conso.id)}
                                                                    className="text-gray-400 hover:text-red-500 p-1"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
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
        </div>
    );
};

export default SuiviTaches;
