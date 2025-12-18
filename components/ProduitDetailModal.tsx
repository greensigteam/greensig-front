import React from 'react';
import { X, Package, Calendar, Target, CheckCircle, XCircle, FileText } from 'lucide-react';
import { ProduitDetail } from '../types/suiviTaches';

interface ProduitDetailModalProps {
    isOpen: boolean;
    produit: ProduitDetail | null;
    onClose: () => void;
}

const ProduitDetailModal: React.FC<ProduitDetailModalProps> = ({ isOpen, produit, onClose }) => {
    if (!isOpen || !produit) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Package className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{produit.nom_produit}</h2>
                            <p className="text-sm text-gray-500">{produit.numero_homologation || 'Sans homologation'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Statut et Validité */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                    {produit.actif ? (
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-gray-400" />
                                    )}
                                    <span className="text-sm font-medium text-gray-700">Statut</span>
                                </div>
                                <p className={`text-lg font-semibold ${produit.actif ? 'text-green-600' : 'text-gray-600'}`}>
                                    {produit.actif ? 'Actif' : 'Inactif'}
                                </p>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-5 h-5 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">Validité</span>
                                </div>
                                <p className={`text-lg font-semibold ${produit.est_valide ? 'text-green-600' : 'text-red-600'}`}>
                                    {produit.est_valide ? 'Valide' : 'Expiré'}
                                </p>
                                {produit.date_validite && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Jusqu'au {new Date(produit.date_validite).toLocaleDateString('fr-FR')}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Informations générales */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Informations générales
                            </h3>

                            {produit.cible && (
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                        <Target className="w-4 h-4" />
                                        Cible
                                    </label>
                                    <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                                        {produit.cible}
                                    </p>
                                </div>
                            )}

                            {produit.description && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                        Description
                                    </label>
                                    <p className="text-gray-900 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 whitespace-pre-wrap">
                                        {produit.description}
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Date de création
                                </label>
                                <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                                    {new Date(produit.date_creation).toLocaleDateString('fr-FR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* Matières actives */}
                        {produit.matieres_actives && produit.matieres_actives.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Matières actives ({produit.matieres_actives.length})
                                </h3>
                                <div className="space-y-2">
                                    {produit.matieres_actives.map((ma) => (
                                        <div
                                            key={ma.id}
                                            className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                                        >
                                            <span className="font-medium text-gray-900">{ma.matiere_active}</span>
                                            <span className="text-sm text-blue-700 font-semibold">
                                                {ma.teneur_valeur} {ma.teneur_unite}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Doses recommandées */}
                        {produit.doses && produit.doses.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Doses recommandées ({produit.doses.length})
                                </h3>
                                <div className="space-y-2">
                                    {produit.doses.map((dose) => (
                                        <div
                                            key={dose.id}
                                            className="p-3 bg-purple-50 rounded-lg border border-purple-200"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-purple-700">
                                                    {dose.dose_valeur} {dose.dose_unite_produit}/{dose.dose_unite_support}
                                                </span>
                                            </div>
                                            {dose.contexte && (
                                                <p className="text-sm text-gray-600">{dose.contexte}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Message si pas de matières actives ni doses */}
                        {(!produit.matieres_actives || produit.matieres_actives.length === 0) &&
                            (!produit.doses || produit.doses.length === 0) && (
                                <div className="text-center py-8 text-gray-500">
                                    <p>Aucune matière active ou dose enregistrée</p>
                                </div>
                            )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProduitDetailModal;
