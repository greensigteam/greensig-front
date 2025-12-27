import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, X, Gauge, Filter, Eye, Clock, Calendar, Info } from 'lucide-react';
import { planningService } from '../services/planningService';
import LoadingScreen from '../components/LoadingScreen';
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Type de tâche <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.id_type_tache}
                                onChange={(e) => setFormData({ ...formData, id_type_tache: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                required
                            >
                                <option value={0}>Sélectionner un type de tâche</option>
                                {typesTaches.map(t => (
                                    <option key={t.id} value={t.id}>{t.nom_tache}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Type d'objet <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.type_objet}
                                onChange={(e) => setFormData({ ...formData, type_objet: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ratio <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    value={formData.ratio}
                                    onChange={(e) => setFormData({ ...formData, ratio: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Unité de mesure <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.unite_mesure}
                                    onChange={(e) => setFormData({ ...formData, unite_mesure: e.target.value as UniteMesure })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    {Object.entries(UNITE_MESURE_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                            Exemple: un ratio de <strong>{formData.ratio}</strong> {UNITE_MESURE_LABELS[formData.unite_mesure].toLowerCase()}/heure
                            signifie qu'un opérateur peut traiter {formData.ratio} {formData.unite_mesure === 'm2' ? 'm²' : formData.unite_mesure === 'ml' ? 'mètres linéaires' : 'unités'} par heure.
                        </p>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description (optionnel)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Notes ou conditions particulières..."
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="actif"
                                checked={formData.actif}
                                onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                            />
                            <label htmlFor="actif" className="text-sm text-gray-700">
                                Ratio actif (utilisé dans les calculs)
                            </label>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-200 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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

const RatiosProductivite: React.FC = () => {
    const [ratios, setRatios] = useState<RatioProductivite[]>([]);
    const [typesTaches, setTypesTaches] = useState<TypeTache[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterTypeTache, setFilterTypeTache] = useState<number | 'all'>('all');
    const [filterTypeObjet, setFilterTypeObjet] = useState<string>('all');

    const [showForm, setShowForm] = useState(false);
    const [selectedRatio, setSelectedRatio] = useState<RatioProductivite | null>(null);
    const [ratioToDelete, setRatioToDelete] = useState<number | null>(null);
    const [ratioDetails, setRatioDetails] = useState<RatioProductivite | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [ratiosData, typesData] = await Promise.all([
                planningService.getRatios(),
                planningService.getTypesTaches()
            ]);
            setRatios(ratiosData);
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
            alert('Erreur lors de la suppression');
            console.error(err);
        }
    };

    const filteredRatios = useMemo(() => {
        return ratios.filter(r => {
            if (filterTypeTache !== 'all' && r.id_type_tache !== filterTypeTache) return false;
            if (filterTypeObjet !== 'all' && r.type_objet !== filterTypeObjet) return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (
                    r.type_tache_nom.toLowerCase().includes(term) ||
                    r.type_objet.toLowerCase().includes(term) ||
                    r.description.toLowerCase().includes(term)
                );
            }
            return true;
        });
    }, [ratios, filterTypeTache, filterTypeObjet, searchTerm]);

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
        <div className="p-4 sm:p-6 h-full flex flex-col">
            {/* Header */}
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Gauge className="w-6 h-6 text-emerald-600" />
                        Ratios de productivité
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Configurez les ratios pour le calcul automatique des charges de travail
                    </p>
                </div>
                <button
                    onClick={() => { setSelectedRatio(null); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Nouveau ratio
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>

                <div className="flex gap-3 items-center">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={filterTypeTache}
                        onChange={(e) => setFilterTypeTache(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white text-sm"
                    >
                        <option value="all">Tous les types de tâche</option>
                        {typesTaches.map(t => (
                            <option key={t.id} value={t.id}>{t.nom_tache}</option>
                        ))}
                    </select>

                    <select
                        value={filterTypeObjet}
                        onChange={(e) => setFilterTypeObjet(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-emerald-500 bg-white text-sm"
                    >
                        <option value="all">Tous les types d'objet</option>
                        {uniqueTypeObjets.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="mb-4 flex gap-4">
                <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm">
                    <span className="font-bold">{ratios.length}</span> ratios configurés
                </div>
                <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm">
                    <span className="font-bold">{ratios.filter(r => r.actif).length}</span> actifs
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
                <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type de tâche</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type d'objet</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ratio</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unité</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRatios.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    {searchTerm || filterTypeTache !== 'all' || filterTypeObjet !== 'all'
                                        ? 'Aucun ratio trouvé avec ces critères'
                                        : 'Aucun ratio configuré. Cliquez sur "Nouveau ratio" pour commencer.'}
                                </td>
                            </tr>
                        ) : (
                            filteredRatios.map(ratio => (
                                <tr key={ratio.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        {ratio.type_tache_nom}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                                            {ratio.type_objet}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-bold text-emerald-600">
                                            {ratio.ratio}
                                        </span>
                                        <span className="text-gray-400 text-sm ml-1">/h</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-sm">
                                        {ratio.unite_mesure === 'm2' ? 'm²' : ratio.unite_mesure === 'ml' ? 'ml' : 'unités'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {ratio.actif ? (
                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                                Actif
                                            </span>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">
                                                Inactif
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setRatioDetails(ratio)}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Voir les détails"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedRatio(ratio); setShowForm(true); }}
                                                className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                title="Modifier"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setRatioToDelete(ratio.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmer la suppression</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Êtes-vous sûr de vouloir supprimer ce ratio ? Les calculs de charge utilisant ce ratio ne fonctionneront plus.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setRatioToDelete(null)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {ratioDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                    <Gauge className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Détails du ratio
                                </h2>
                            </div>
                            <button
                                onClick={() => setRatioDetails(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                                    <p className="text-sm text-gray-500">Type de tâche</p>
                                    <p className="font-semibold text-gray-900">{ratioDetails.type_tache_nom}</p>
                                </div>
                            </div>

                            {/* Type d'objet */}
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
                                    <Gauge className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Type d'objet</p>
                                    <p className="font-semibold text-gray-900">
                                        <span className="bg-gray-100 px-2 py-1 rounded">
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
                                        <p className="text-sm text-gray-500">Ratio</p>
                                        <p className="font-mono font-bold text-2xl text-emerald-600">
                                            {ratioDetails.ratio}
                                            <span className="text-gray-400 text-sm font-normal ml-1">/h</span>
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Unité de mesure</p>
                                    <p className="font-semibold text-gray-900">
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
                                <span className="text-sm text-gray-500">Statut</span>
                                {ratioDetails.actif ? (
                                    <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                                        ✓ Actif
                                    </span>
                                ) : (
                                    <span className="bg-gray-100 text-gray-500 text-sm font-medium px-3 py-1 rounded-full">
                                        Inactif
                                    </span>
                                )}
                            </div>

                            {/* Description */}
                            {ratioDetails.description && (
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Description</p>
                                    <div className="bg-gray-50 rounded-lg p-3 text-gray-700 text-sm">
                                        {ratioDetails.description}
                                    </div>
                                </div>
                            )}

                            {/* Dates */}
                            {(ratioDetails.created_at || ratioDetails.updated_at) && (
                                <div className="pt-4 border-t border-gray-200">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
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
                        <div className="p-6 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={() => setRatioDetails(null)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
