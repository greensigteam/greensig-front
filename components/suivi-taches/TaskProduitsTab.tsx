import React, { useState } from 'react';
import { Package, Loader2, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { Tache } from '../../types/planning';
import { ConsommationProduit, ProduitList } from '../../types/suiviTaches';

interface TaskProduitsTabProps {
    tache: Tache;
    consommations: ConsommationProduit[];
    produitsOptions: ProduitList[];
    loading: boolean;
    isClientView: boolean;
    onAdd: (data: { produit: number; quantite: number; unite: string; commentaire: string }) => void;
    onDelete: (consoId: number) => void;
}

export const TaskProduitsTab: React.FC<TaskProduitsTabProps> = ({
    tache,
    consommations,
    produitsOptions,
    loading,
    isClientView,
    onAdd,
    onDelete,
}) => {
    const [newConsommation, setNewConsommation] = useState({
        produit: '',
        quantite: '',
        unite: 'L',
        commentaire: ''
    });
    const [deletingConsoId, setDeletingConsoId] = useState<number | null>(null);

    const isValidated = tache.statut === 'TERMINEE' &&
        (tache.etat_validation === 'VALIDEE' || tache.etat_validation === 'REJETEE');
    const canModify = !isClientView && !isValidated;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newConsommation.produit || !newConsommation.quantite) return;

        onAdd({
            produit: parseInt(newConsommation.produit),
            quantite: parseFloat(newConsommation.quantite),
            unite: newConsommation.unite,
            commentaire: newConsommation.commentaire
        });

        setNewConsommation({ produit: '', quantite: '', unite: 'L', commentaire: '' });
    };

    const handleDeleteClick = async (consoId: number) => {
        try {
            await onDelete(consoId);
            setDeletingConsoId(null);
        } catch {
            // Error handled in parent
        }
    };

    return (
        <div className="space-y-4">
            {/* Add Form */}
            {canModify && (
                <form onSubmit={handleSubmit} className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Ajouter un produit
                    </h4>
                    <div className="grid gap-3">
                        <select
                            value={newConsommation.produit}
                            onChange={(e) => setNewConsommation({ ...newConsommation, produit: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            required
                        >
                            <option value="">Sélectionner un produit</option>
                            {produitsOptions.map(p => (
                                <option key={p.id} value={p.id}>{p.nom_produit}</option>
                            ))}
                        </select>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number"
                                step="0.01"
                                value={newConsommation.quantite}
                                onChange={(e) => setNewConsommation({ ...newConsommation, quantite: e.target.value })}
                                placeholder="Quantité"
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                required
                            />
                            <select
                                value={newConsommation.unite}
                                onChange={(e) => setNewConsommation({ ...newConsommation, unite: e.target.value })}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            >
                                <option value="L">Litres</option>
                                <option value="Kg">Kilos</option>
                                <option value="Unite">Unités</option>
                            </select>
                        </div>
                        <input
                            type="text"
                            value={newConsommation.commentaire}
                            onChange={(e) => setNewConsommation({ ...newConsommation, commentaire: e.target.value })}
                            placeholder="Commentaire (optionnel)"
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                        <button
                            type="submit"
                            className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"
                        >
                            Ajouter
                        </button>
                    </div>
                </form>
            )}

            {/* Read-only message for validated tasks */}
            {!isClientView && isValidated && (
                <div className={`rounded-xl p-4 border flex items-start gap-3 ${
                    tache.etat_validation === 'VALIDEE'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-red-50 border-red-200'
                }`}>
                    <ShieldCheck className={`w-5 h-5 mt-0.5 shrink-0 ${
                        tache.etat_validation === 'VALIDEE' ? 'text-emerald-600' : 'text-red-600'
                    }`} />
                    <div>
                        <h4 className={`font-semibold text-sm ${
                            tache.etat_validation === 'VALIDEE' ? 'text-emerald-800' : 'text-red-800'
                        }`}>
                            Tâche {tache.etat_validation === 'VALIDEE' ? 'validée' : 'rejetée'} - Lecture seule
                        </h4>
                        <p className={`text-sm mt-1 ${
                            tache.etat_validation === 'VALIDEE' ? 'text-emerald-700' : 'text-red-700'
                        }`}>
                            Les consommations ne peuvent plus être modifiées.
                        </p>
                    </div>
                </div>
            )}

            {/* Consommations List */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            ) : consommations.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun produit utilisé</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {consommations.map(conso => (
                        <div
                            key={conso.id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <Package className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-800">
                                        {conso.produit_nom}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {conso.quantite_utilisee} {conso.unite}
                                        {conso.commentaire && ` - ${conso.commentaire}`}
                                    </p>
                                </div>
                            </div>
                            {canModify && (
                                <button
                                    onClick={() => setDeletingConsoId(conso.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation */}
            {deletingConsoId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Supprimer ce produit ?</h3>
                        <p className="text-sm text-slate-600 mb-4">Cette action est irréversible.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingConsoId(null)}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleDeleteClick(deletingConsoId)}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskProduitsTab;
