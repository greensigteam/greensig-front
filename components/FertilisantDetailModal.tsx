import React from 'react';
import { Leaf, CheckCircle, XCircle } from 'lucide-react';
import {
    FertilisantDetail,
    TYPE_FERTILISANT_LABELS,
    FORMAT_FERTILISANT_LABELS,
    TYPE_FERTILISANT_COLORS
} from '../types/suiviTaches';
import DetailModal, { DetailSection, DetailRow, DetailCard } from './DetailModal';

interface FertilisantDetailModalProps {
    isOpen: boolean;
    fertilisant: FertilisantDetail | null;
    onClose: () => void;
}

const FertilisantDetailModal: React.FC<FertilisantDetailModalProps> = ({ isOpen, fertilisant, onClose }) => {
    if (!isOpen || !fertilisant) return null;

    const typeColors = TYPE_FERTILISANT_COLORS[fertilisant.type_fertilisant];

    const content = (
        <div className="space-y-6">
            {/* Statut et Type */}
            <div className="grid grid-cols-2 gap-4">
                <DetailCard variant={fertilisant.actif ? 'success' : 'default'}>
                    <div className="flex items-center gap-2 mb-2">
                        {fertilisant.actif ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="text-sm font-medium text-gray-700">Statut</span>
                    </div>
                    <p className={`text-lg font-semibold ${fertilisant.actif ? 'text-green-600' : 'text-gray-600'}`}>
                        {fertilisant.actif ? 'Actif' : 'Inactif'}
                    </p>
                </DetailCard>

                <DetailCard variant="info">
                    <div className="flex items-center gap-2 mb-2">
                        <Leaf className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Type</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeColors.bg} ${typeColors.text}`}>
                        {TYPE_FERTILISANT_LABELS[fertilisant.type_fertilisant]}
                    </span>
                </DetailCard>
            </div>

            {/* Informations generales */}
            <DetailSection title="Informations generales">
                <DetailRow
                    label="Format"
                    value={FORMAT_FERTILISANT_LABELS[fertilisant.format_fertilisant]}
                />

                {fertilisant.description && (
                    <DetailRow
                        label="Description"
                        value={fertilisant.description}
                    />
                )}

                <DetailRow
                    label="Date de creation"
                    value={new Date(fertilisant.date_creation).toLocaleDateString('fr-FR', {
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
            title={fertilisant.nom}
            subtitle={TYPE_FERTILISANT_LABELS[fertilisant.type_fertilisant]}
            icon={<Leaf className="w-6 h-6 text-green-600" />}
            size="xl"
            actions={actions}
        >
            {content}
        </DetailModal>
    );
};

export default FertilisantDetailModal;
