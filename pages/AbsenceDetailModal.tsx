import React from 'react';
import { Calendar, User, Clock, FileText, CheckCircle, XCircle } from 'lucide-react';
import {
  Absence,
  TYPE_ABSENCE_LABELS,
  TYPE_ABSENCE_COLORS,
  STATUT_ABSENCE_LABELS,
  STATUT_ABSENCE_COLORS,
  getBadgeColors
} from '../types/users';
import DetailModal, { DetailSection, DetailRow, DetailCard } from '../components/DetailModal';

interface AbsenceDetailModalProps {
  absence: Absence;
  onClose: () => void;
}

const AbsenceDetailModal: React.FC<AbsenceDetailModalProps> = ({ absence, onClose }) => {
  const typeColors = getBadgeColors(TYPE_ABSENCE_COLORS, absence.typeAbsence);
  const statutColors = getBadgeColors(STATUT_ABSENCE_COLORS, absence.statut);

  const getStatutIcon = () => {
    switch (absence.statut) {
      case 'VALIDEE':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'REFUSEE':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'ANNULEE':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-blue-600" />;
    }
  };

  // Contenu de la modale
  const content = (
    <div className="space-y-6">
      {/* Statut et Type */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          {getStatutIcon()}
          <div>
            <p className="text-sm text-gray-500">Statut</p>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statutColors.bg} ${statutColors.text}`}>
              {STATUT_ABSENCE_LABELS[absence.statut]}
            </span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeColors.bg} ${typeColors.text}`}>
          {TYPE_ABSENCE_LABELS[absence.typeAbsence]}
        </span>
      </div>

      {/* Opérateur */}
      <DetailRow
        label="Operateur"
        value={absence.operateurNom}
        icon={<User className="w-5 h-5 text-gray-600" />}
      />
      {absence.equipeImpactee && (
        <p className="text-sm text-gray-500 -mt-4 ml-9">
          Equipe: {absence.equipeImpactee.nom}
        </p>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <DetailRow
          label="Date de debut"
          value={new Date(absence.dateDebut).toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
          icon={<Calendar className="w-5 h-5 text-green-600" />}
        />
        <DetailRow
          label="Date de fin"
          value={new Date(absence.dateFin).toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
          icon={<Calendar className="w-5 h-5 text-red-600" />}
        />
      </div>

      {/* Durée */}
      <DetailRow
        label="Duree"
        value={`${absence.dureeJours} jour${absence.dureeJours > 1 ? 's' : ''}`}
        icon={<Clock className="w-5 h-5 text-purple-600" />}
      />

      {/* Motif */}
      {absence.motif && (
        <DetailRow
          label="Motif"
          value={absence.motif}
          icon={<FileText className="w-5 h-5 text-yellow-600" />}
        />
      )}

      {/* Informations de demande */}
      <DetailSection title="Informations de demande">
        <DetailCard variant="default">
          <DetailRow
            label="Date de demande"
            value={new Date(absence.dateDemande).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          />
        </DetailCard>
      </DetailSection>

      {/* Validation info */}
      {absence.dateValidation && (
        <DetailSection title="Informations de validation">
          <DetailCard variant="default">
            <div className="space-y-2">
              <DetailRow
                label="Valide par"
                value={absence.valideeParNom || '-'}
              />
              <DetailRow
                label="Date de validation"
                value={new Date(absence.dateValidation).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              />
              {absence.commentaire && (
                <>
                  <div className="pt-2 border-t border-gray-200" />
                  <DetailRow
                    label="Commentaire"
                    value={absence.commentaire}
                  />
                </>
              )}
            </div>
          </DetailCard>
        </DetailSection>
      )}
    </div>
  );

  // Actions footer
  const actions = (
    <button
      onClick={onClose}
      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
    >
      Fermer
    </button>
  );

  return (
    <DetailModal
      isOpen={true}
      onClose={onClose}
      title="Details de l'absence"
      subtitle={`Absence #${absence.id}`}
      icon={<Calendar className="w-5 h-5 text-blue-600" />}
      size="lg"
      actions={actions}
    >
      {content}
    </DetailModal>
  );
};

export default AbsenceDetailModal;
