import React from 'react';
import { Bug, CheckCircle, XCircle, AlertTriangle, Target, Package } from 'lucide-react';
import {
    RavageurMaladieDetail,
    CATEGORIE_RAVAGEUR_MALADIE_LABELS,
    CATEGORIE_RAVAGEUR_MALADIE_COLORS
} from '../types/suiviTaches';
import DetailModal, { DetailSection, DetailRow, DetailCard } from './DetailModal';

interface RavageurMaladieDetailModalProps {
    isOpen: boolean;
    ravageurMaladie: RavageurMaladieDetail | null;
    onClose: () => void;
}

const RavageurMaladieDetailModal: React.FC<RavageurMaladieDetailModalProps> = ({
    isOpen,
    ravageurMaladie,
    onClose
}) => {
    if (!isOpen || !ravageurMaladie) return null;

    const categorieColors = CATEGORIE_RAVAGEUR_MALADIE_COLORS[ravageurMaladie.categorie];

    const content = (
        <div className="space-y-6">
            {/* Statut et Categorie */}
            <div className="grid grid-cols-2 gap-4">
                <DetailCard variant={ravageurMaladie.actif ? 'success' : 'default'}>
                    <div className="flex items-center gap-2 mb-2">
                        {ravageurMaladie.actif ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="text-sm font-medium text-gray-700">Statut</span>
                    </div>
                    <p className={`text-lg font-semibold ${ravageurMaladie.actif ? 'text-green-600' : 'text-gray-600'}`}>
                        {ravageurMaladie.actif ? 'Actif' : 'Inactif'}
                    </p>
                </DetailCard>

                <DetailCard variant={ravageurMaladie.categorie === 'MALADIE' ? 'danger' : 'warning'}>
                    <div className="flex items-center gap-2 mb-2">
                        <Bug className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-medium text-gray-700">Categorie</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${categorieColors.bg} ${categorieColors.text}`}>
                        {CATEGORIE_RAVAGEUR_MALADIE_LABELS[ravageurMaladie.categorie]}
                    </span>
                </DetailCard>
            </div>

            {/* Diagnostic */}
            <DetailSection title="Diagnostic">
                <DetailRow
                    label="Partie atteinte"
                    value={ravageurMaladie.partie_atteinte}
                    icon={<Target className="w-4 h-4" />}
                />

                <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-gray-500 font-medium">Symptomes</span>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {ravageurMaladie.symptomes}
                        </p>
                    </div>
                </div>
            </DetailSection>

            {/* Produits recommandes */}
            <DetailSection title={`Produits recommandes (${ravageurMaladie.produits_recommandes?.length || 0})`}>
                {ravageurMaladie.produits_recommandes && ravageurMaladie.produits_recommandes.length > 0 ? (
                    <div className="space-y-2">
                        {ravageurMaladie.produits_recommandes.map((produit) => (
                            <div
                                key={produit.id}
                                className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg border border-cyan-200"
                            >
                                <div className="flex items-center gap-3">
                                    <Package className="w-5 h-5 text-cyan-600" />
                                    <div>
                                        <span className="font-medium text-gray-900">{produit.nom_produit}</span>
                                        {produit.cible && (
                                            <p className="text-xs text-gray-500">{produit.cible}</p>
                                        )}
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    produit.actif
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {produit.actif ? 'Actif' : 'Inactif'}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-500">
                        <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Aucun produit recommande</p>
                    </div>
                )}
            </DetailSection>

            {/* Metadonnees */}
            <DetailSection title="Informations">
                <DetailRow
                    label="Date de creation"
                    value={new Date(ravageurMaladie.date_creation).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                />
            </DetailSection>
        </div>
    );

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
            title={ravageurMaladie.nom}
            subtitle={CATEGORIE_RAVAGEUR_MALADIE_LABELS[ravageurMaladie.categorie]}
            icon={<Bug className="w-6 h-6 text-red-600" />}
            size="2xl"
            actions={actions}
        >
            {content}
        </DetailModal>
    );
};

export default RavageurMaladieDetailModal;
