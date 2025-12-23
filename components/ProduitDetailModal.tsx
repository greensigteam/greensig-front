import React from 'react';
import { Package, Calendar, Target, CheckCircle, XCircle, FileText } from 'lucide-react';
import { ProduitDetail } from '../types/suiviTaches';
import DetailModal, { DetailSection, DetailRow, DetailCard, DetailList } from './DetailModal';

interface ProduitDetailModalProps {
    isOpen: boolean;
    produit: ProduitDetail | null;
    onClose: () => void;
}

const ProduitDetailModal: React.FC<ProduitDetailModalProps> = ({ isOpen, produit, onClose }) => {
    if (!isOpen || !produit) return null;

    // Contenu de la modale
    const content = (
        <div className="space-y-6">
            {/* Statut et Validité */}
            <div className="grid grid-cols-2 gap-4">
                <DetailCard variant={produit.actif ? 'success' : 'default'}>
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
                </DetailCard>

                <DetailCard variant={produit.est_valide ? 'success' : 'danger'}>
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
                </DetailCard>
            </div>

            {/* Informations générales */}
            <DetailSection title="Informations générales">
                {produit.cible && (
                    <DetailRow
                        label="Cible"
                        value={produit.cible}
                        icon={<Target className="w-4 h-4" />}
                    />
                )}

                {produit.description && (
                    <DetailRow
                        label="Description"
                        value={produit.description}
                    />
                )}

                <DetailRow
                    label="Date de création"
                    value={new Date(produit.date_creation).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                />
            </DetailSection>

            {/* Matières actives */}
            {produit.matieres_actives && produit.matieres_actives.length > 0 && (
                <DetailSection title={`Matières actives (${produit.matieres_actives.length})`}>
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
                </DetailSection>
            )}

            {/* Doses recommandées */}
            {produit.doses && produit.doses.length > 0 && (
                <DetailSection title={`Doses recommandées (${produit.doses.length})`}>
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
                </DetailSection>
            )}

            {/* Message si pas de matières actives ni doses */}
            {(!produit.matieres_actives || produit.matieres_actives.length === 0) &&
                (!produit.doses || produit.doses.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                        <p>Aucune matière active ou dose enregistrée</p>
                    </div>
                )}
        </div>
    );

    // Actions footer
    const actions = (
        <button
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
            Fermer
        </button>
    );

    return (
        <DetailModal
            isOpen={isOpen}
            onClose={onClose}
            title={produit.nom_produit}
            subtitle={produit.numero_homologation || 'Sans homologation'}
            icon={<Package className="w-6 h-6 text-emerald-600" />}
            size="2xl"
            actions={actions}
        >
            {content}
        </DetailModal>
    );
};

export default ProduitDetailModal;
