import React from 'react';
import { X, Calendar, User, Clock, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  Absence,
  TYPE_ABSENCE_LABELS,
  TYPE_ABSENCE_COLORS,
  STATUT_ABSENCE_LABELS,
  STATUT_ABSENCE_COLORS,
  getBadgeColors
} from '../types/users';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Details de l'absence</h2>
              <p className="text-sm text-gray-500">Absence #{absence.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Statut */}
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

          {/* Operateur */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Operateur</p>
              <p className="font-medium text-gray-900">{absence.operateurNom}</p>
              {absence.equipeImpactee && (
                <p className="text-sm text-gray-500">Equipe: {absence.equipeImpactee.nom}</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Date de debut</p>
                <p className="font-medium text-gray-900">
                  {new Date(absence.dateDebut).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Calendar className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Date de fin</p>
                <p className="font-medium text-gray-900">
                  {new Date(absence.dateFin).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Duree */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Duree</p>
              <p className="font-medium text-gray-900">
                {absence.dureeJours} jour{absence.dureeJours > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Motif */}
          {absence.motif && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Motif</p>
                <p className="text-gray-900">{absence.motif}</p>
              </div>
            </div>
          )}

          {/* Informations de demande */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500 mb-2">Informations de demande</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date de demande:</span>
                <span className="text-gray-900">
                  {new Date(absence.dateDemande).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Validation info */}
          {absence.dateValidation && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500 mb-2">Informations de validation</p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Valide par:</span>
                  <span className="text-gray-900">{absence.valideeParNom || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date de validation:</span>
                  <span className="text-gray-900">
                    {new Date(absence.dateValidation).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {absence.commentaire && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-500">Commentaire:</p>
                    <p className="text-sm text-gray-900">{absence.commentaire}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AbsenceDetailModal;
