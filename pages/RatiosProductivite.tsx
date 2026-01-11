import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, X, Gauge, Filter, Eye, Clock, Calendar, Info, ListFilter, Layers, RotateCcw, Search as SearchIcon, FileText, CheckCircle2 } from 'lucide-react';
import { planningService } from '../services/planningService';
import LoadingScreen from '../components/LoadingScreen';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import { useSearch } from '../contexts/SearchContext';
import {
    RatioProductivite, RatioProductiviteCreate, TypeTache,
    UNITE_MESURE_LABELS, TYPES_OBJETS, UniteMesure
} from '../types/planning';

// ============================================================================
// RATIO FORM MODAL
// ============================================================================

interface RatioFormModalProps {
    ratio?: RatioProductivite;
    typesTaches: TypeTache[];
    onClose: () => void;
    onSubmit: (data: RatioProductiviteCreate) => Promise<void>;
}

const RatioFormModal: React.FC<RatioFormModalProps> = ({ ratio, typesTaches, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<RatioProductiviteCreate>({
        id_type_tache: ratio?.id_type_tache || 0,
        type_objet: ratio?.type_objet || '',
        unite_mesure: ratio?.unite_mesure || 'unite',
        ratio: ratio?.ratio || 1,
        description: ratio?.description || '',
        actif: ratio?.actif ?? true
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.id_type_tache || !formData.type_objet) {
            setError('Veuillez remplir tous les champs obligatoires');
            return;
        }
        if (formData.ratio <= 0) {
            setError('Le ratio doit être supérieur à 0');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(formData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la sauvegarde');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900">
                            {ratio ? 'Modifier le ratio' : 'Nouveau ratio de productivité'}
                        </h2>
                    </div>

                    <div className="p-6 space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Type de tâche <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.id_type_tache}
                                onChange={(e) => setFormData({ ...formData, id_type_tache: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                required
                            >
                                <option value={0}>Sélectionner un type de tâche</option>
                                {typesTaches.map(t => (
                                    <option key={t.id} value={t.id}>{t.nom_tache}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Type d'objet <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.type_objet}
                                onChange={(e) => setFormData({ ...formData, type_objet: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                required
                            >
                                <option value="">Sélectionner un type d'objet</option>
                                {TYPES_OBJETS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Ratio <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    value={formData.ratio}
                                    onChange={(e) => setFormData({ ...formData, ratio: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Unité de mesure <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.unite_mesure}
                                    onChange={(e) => setFormData({ ...formData, unite_mesure: e.target.value as UniteMesure })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    {Object.entries(UNITE_MESURE_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                            Exemple: un ratio de <strong>{formData.ratio}</strong> {UNITE_MESURE_LABELS[formData.unite_mesure].toLowerCase()}/heure
                            signifie qu'un opérateur peut traiter {formData.ratio} {formData.unite_mesure === 'm2' ? 'm²' : formData.unite_mesure === 'ml' ? 'mètres linéaires' : 'unités'} par heure.
                        </p>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Description (optionnel)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Notes ou conditions particulières..."
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="actif"
                                checked={formData.actif}
                                onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                            />
                            <label htmlFor="actif" className="text-sm text-slate-700">
                                Ratio actif (utilisé dans les calculs)
                            </label>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-200 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Enregistrement...' : ratio ? 'Modifier' : 'Créer'}
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

interface RatiosProductiviteProps {
  triggerCreate?: number;
}

const RatiosProductivite: React.FC<RatiosProductiviteProps> = ({ triggerCreate }) => {
    const [ratios, setRatios] = useState<RatioProductivite[]>([]);
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Recherche globale via header
    const { searchQuery, setSearchQuery, setPlaceholder } = useSearch();

    // Filtres backend
    const [filterTypeTache, setFilterTypeTache] = useState<number | 'all'>('all');
    const [filterTypeObjet, setFilterTypeObjet] = useState<string>('all');

    const [showForm, setShowForm] = useState(false);
    const [selectedRatio, setSelectedRatio] = useState<RatioProductivite | null>(null);
    const [ratioToDelete, setRatioToDelete] = useState<number | null>(null);
    const [ratioDetails, setRatioDetails] = useState<RatioProductivite | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Définir le placeholder de la barre de recherche du header et nettoyer à la sortie
    useEffect(() => {
        setPlaceholder('Rechercher dans les ratios...');
        return () => {
            setPlaceholder('Rechercher...');
            setSearchQuery(''); // Nettoyer la recherche quand on quitte la page
        };
    }, [setPlaceholder, setSearchQuery]);

    // Recharger quand la recherche ou les filtres changent
    useEffect(() => {
        setCurrentPage(1); // Retour page 1 si filtres ou recherche changent
        loadData();
    }, [filterTypeTache, filterTypeObjet, searchQuery]);

    useEffect(() => {
        loadData();
    }, [currentPage]);

    // Handle external trigger to open create modal
    useEffect(() => {
        if (triggerCreate && triggerCreate > 0) {
            setSelectedRatio(null);
            setShowForm(true);
        }
    }, [triggerCreate]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Construire les paramètres de filtre
            const filterParams: { search?: string; type_tache_id?: number; type_objet?: string } = {};

            // Ajouter la recherche si présente
            if (searchQuery && searchQuery.trim()) {
                filterParams.search = searchQuery.trim();
            }

            if (filterTypeTache !== 'all') {
                filterParams.type_tache_id = filterTypeTache;
            }
            if (filterTypeObjet !== 'all') {
                filterParams.type_objet = filterTypeObjet;
            }

            const [ratiosResponse, typesData] = await Promise.all([
                planningService.getRatiosPaginated(currentPage, filterParams),
                planningService.getTypesTaches()
            ]);

            setRatios(ratiosResponse.results);
            setTotalCount(ratiosResponse.count);
            setTotalPages(Math.ceil(ratiosResponse.count / 20));
            setTypesTaches(typesData);
        } catch (err) {
            setError('Erreur lors du chargement des données');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (data: RatioProductiviteCreate) => {
        await planningService.createRatio(data);
        setCurrentPage(1); // Retour à la page 1
        await loadData();
    };

    const handleUpdate = async (data: RatioProductiviteCreate) => {
        if (!selectedRatio) return;
        await planningService.updateRatio(selectedRatio.id, data);
        await loadData();
    };

    const handleDelete = async () => {
        if (!ratioToDelete) return;
        try {
            await planningService.deleteRatio(ratioToDelete);
            await loadData();
            setRatioToDelete(null);
        } catch (err) {
            console.error(err);
            throw err; // Re-throw pour que le modal affiche l'erreur
        }
    };

    const handleResetFilters = () => {
        setFilterTypeTache('all');
        setFilterTypeObjet('all');
    };

    const hasActiveFilters = filterTypeTache !== 'all' || filterTypeObjet !== 'all' || (searchQuery && searchQuery.trim());

    // Get unique type_objet values from ratios
    const uniqueTypeObjets = useMemo(() => {
        return [...new Set(ratios.map(r => r.type_objet))].sort();
    }, [ratios]);

    if (loading) {
        return (
            <div className="fixed inset-0 z-50">
                <LoadingScreen isLoading={true} loop={true} minDuration={0} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-red-500">{error}</div>
            </div>
        );
    }

    return (
        <div className="p-6 h-full flex flex-col">
            {/* Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                        <Gauge className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Ratios de productivité</h1>
                        <p className="text-sm text-slate-600">{totalCount} ratios configurés</p>
                    </div>
                </div>
            </div>

            {/* Filters & Stats Section */}
            <div className="mb-6 space-y-4 flex-shrink-0">
                {/* Filters Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ListFilter className="w-4 h-4 text-slate-600" />
                                <h3 className="text-sm font-semibold text-slate-700">Filtres</h3>
                                {hasActiveFilters && (
                                    <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                        Actifs
                                    </span>
                                )}
                            </div>
                            {hasActiveFilters && (
                                <button
                                    onClick={handleResetFilters}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Réinitialiser
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Type de tâche */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    Type de tâche
                                </label>
                                <div className="relative">
                                    <select
                                        value={filterTypeTache}
                                        onChange={(e) => setFilterTypeTache(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                        className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white text-sm shadow-sm hover:border-slate-400 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="all">Tous les types de tâche</option>
                                        {typesTaches.map(t => (
                                            <option key={t.id} value={t.id}>{t.nom_tache}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Type d'objet */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                                    Type d'objet
                                </label>
                                <div className="relative">
                                    <select
                                        value={filterTypeObjet}
                                        onChange={(e) => setFilterTypeObjet(e.target.value)}
                                        className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white text-sm shadow-sm hover:border-slate-400 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="all">Tous les types d'objet</option>
                                        {uniqueTypeObjets.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex gap-3 flex-wrap items-center">
                    {/* Search Badge */}
                    {searchQuery && searchQuery.trim() && (
                        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 px-4 py-2.5 rounded-xl text-sm border border-blue-200 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                            <SearchIcon className="w-4 h-4" />
                            <span>Recherche :</span>
                            <span className="font-semibold">"{searchQuery}"</span>
                        </div>
                    )}

                    {/* Results Count */}
                    <div className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-sm border border-emerald-200 shadow-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-bold">{totalCount}</span>
                        <span>{hasActiveFilters ? 'résultats trouvés' : 'ratios au total'}</span>
                    </div>

                    {/* Pagination Info */}
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2 bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-sm border border-slate-200 shadow-sm">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <span>Page</span>
                            <span className="font-bold text-slate-900">{currentPage}</span>
                            <span className="text-slate-400">/</span>
                            <span className="font-bold text-slate-900">{totalPages}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-white rounded-lg border border-slate-200">
                <table className="w-full">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type de tâche</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type d'objet</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Ratio</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Unité</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {ratios.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                    {searchTerm || filterTypeTache !== 'all' || filterTypeObjet !== 'all'
                                        ? 'Aucun ratio trouvé avec ces critères'
                                        : 'Aucun ratio configuré. Cliquez sur "Nouveau ratio" pour commencer.'}
                                </td>
                            </tr>
                        ) : (
                            ratios.map(ratio => (
                                <tr key={ratio.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-900">
                                        {ratio.type_tache_nom}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-sm">
                                            {ratio.type_objet}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-bold text-emerald-600">
                                            {ratio.ratio}
                                        </span>
                                        <span className="text-slate-400 text-sm ml-1">/h</span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-sm">
                                        {ratio.unite_mesure === 'm2' ? 'm²' : ratio.unite_mesure === 'ml' ? 'ml' : 'unités'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {ratio.actif ? (
                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                                Actif
                                            </span>
                                        ) : (
                                            <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-full">
                                                Inactif
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setRatioDetails(ratio)}
                                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Voir les détails"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedRatio(ratio); setShowForm(true); }}
                                                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                title="Modifier"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setRatioToDelete(ratio.id)}
                                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200">
                    <div className="text-sm text-slate-700">
                        Affichage de <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> à{' '}
                        <span className="font-medium">{Math.min(currentPage * 20, totalCount)}</span> sur{' '}
                        <span className="font-medium">{totalCount}</span> ratios
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Précédent
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                                            currentPage === pageNum
                                                ? 'bg-emerald-600 text-white'
                                                : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Suivant
                        </button>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showForm && (
                <RatioFormModal
                    ratio={selectedRatio || undefined}
                    typesTaches={typesTaches}
                    onClose={() => { setShowForm(false); setSelectedRatio(null); }}
                    onSubmit={selectedRatio ? handleUpdate : handleCreate}
                />
            )}

            {/* Delete Confirmation Modal */}
            {ratioToDelete && (
                <ConfirmDeleteModal
                    title="Supprimer ce ratio ?"
                    message="Les calculs de charge utilisant ce ratio ne fonctionneront plus. Cette action est irréversible."
                    onConfirm={handleDelete}
                    onCancel={() => setRatioToDelete(null)}
                />
            )}

            {/* Details Modal */}
            {ratioDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                    <Gauge className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    Détails du ratio
                                </h2>
                            </div>
                            <button
                                onClick={() => setRatioDetails(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-5">
                            {/* Type de tâche */}
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                                    <Info className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Type de tâche</p>
                                    <p className="font-semibold text-slate-900">{ratioDetails.type_tache_nom}</p>
                                </div>
                            </div>

                            {/* Type d'objet */}
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
                                    <Gauge className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Type d'objet</p>
                                    <p className="font-semibold text-slate-900">
                                        <span className="bg-slate-100 px-2 py-1 rounded">
                                            {ratioDetails.type_objet}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Ratio et Unité */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Ratio</p>
                                        <p className="font-mono font-bold text-2xl text-emerald-600">
                                            {ratioDetails.ratio}
                                            <span className="text-slate-400 text-sm font-normal ml-1">/h</span>
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Unité de mesure</p>
                                    <p className="font-semibold text-slate-900">
                                        {UNITE_MESURE_LABELS[ratioDetails.unite_mesure]}
                                    </p>
                                </div>
                            </div>

                            {/* Explication du ratio */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                <p className="text-sm text-emerald-800">
                                    <strong>Interprétation :</strong> Un opérateur peut traiter{' '}
                                    <span className="font-bold">{ratioDetails.ratio}</span>{' '}
                                    {ratioDetails.unite_mesure === 'm2' ? 'm²' : ratioDetails.unite_mesure === 'ml' ? 'mètres linéaires' : 'unités'}{' '}
                                    par heure pour la tâche "{ratioDetails.type_tache_nom}" sur un objet de type "{ratioDetails.type_objet}".
                                </p>
                            </div>

                            {/* Statut */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Statut</span>
                                {ratioDetails.actif ? (
                                    <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                                        ✓ Actif
                                    </span>
                                ) : (
                                    <span className="bg-slate-100 text-slate-500 text-sm font-medium px-3 py-1 rounded-full">
                                        Inactif
                                    </span>
                                )}
                            </div>

                            {/* Description */}
                            {ratioDetails.description && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-2">Description</p>
                                    <div className="bg-slate-50 rounded-lg p-3 text-slate-700 text-sm">
                                        {ratioDetails.description}
                                    </div>
                                </div>
                            )}

                            {/* Dates */}
                            {(ratioDetails.created_at || ratioDetails.updated_at) && (
                                <div className="pt-4 border-t border-slate-200">
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Calendar className="w-3 h-3" />
                                        <span>
                                            {ratioDetails.created_at && (
                                                <>Créé le {new Date(ratioDetails.created_at).toLocaleDateString('fr-FR')}</>
                                            )}
                                            {ratioDetails.updated_at && ratioDetails.updated_at !== ratioDetails.created_at && (
                                                <> • Modifié le {new Date(ratioDetails.updated_at).toLocaleDateString('fr-FR')}</>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-200 flex gap-3">
                            <button
                                onClick={() => setRatioDetails(null)}
                                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedRatio(ratioDetails);
                                    setRatioDetails(null);
                                    setShowForm(true);
                                }}
                                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Modifier
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RatiosProductivite;
