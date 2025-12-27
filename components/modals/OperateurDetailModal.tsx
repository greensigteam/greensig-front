import React from 'react';
import { X, Users, UserCheck, UserX, Award } from 'lucide-react';
import { OperateurDetail } from '../../types/users';
import { StatusBadge } from '../StatusBadge';

interface OperateurDetailModalProps {
  operateur: OperateurDetail;
  onClose: () => void;
}

const OperateurDetailModal: React.FC<OperateurDetailModalProps> = ({ operateur, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {operateur.photo ? (
              <img
                src={operateur.photo}
                alt={operateur.fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{operateur.fullName}</h2>
              <p className="text-sm text-gray-500">{operateur.numeroImmatriculation}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Informations generales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Nom</label>
              <p className="text-gray-900">{operateur.nom}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Prénom</label>
              <p className="text-gray-900">{operateur.prenom}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{operateur.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Téléphone</label>
              <p className="text-gray-900">{operateur.telephone || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date d'embauche</label>
              <p className="text-gray-900">
                {new Date(operateur.dateEmbauche).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Statut compte</label>
              <div className="mt-1">
                <StatusBadge variant="boolean" value={operateur.actif} labels={{ true: 'Actif', false: 'Inactif' }} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Statut opérateur</label>
              <div className="mt-1">
                <StatusBadge variant="status" type="operateur" value={operateur.statut || ''} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Equipe</label>
              <p className="text-gray-900">{operateur.equipeNom || 'Non affecté'}</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-500">Rôle(s)</label>
              <div className="flex items-center gap-2 mt-1">
                {operateur.utilisateurDetail?.roles && operateur.utilisateurDetail.roles.length > 0 ? (
                  operateur.utilisateurDetail.roles.map((r) => (
                    <StatusBadge key={r} variant="role" value={r} />
                  ))
                ) : (
                  <StatusBadge variant="custom" bg="bg-gray-100" text="text-gray-800">
                    {operateur.estChefEquipe ? "Chef d'équipe" : 'Opérateur'}
                  </StatusBadge>
                )}

                {operateur.estChefEquipe && (
                  <span className="text-sm text-gray-500 ml-1">
                    ({operateur.equipesDirigeesCount} équipe{operateur.equipesDirigeesCount > 1 ? 's' : ''})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Disponibilite */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-2 block">Disponibilite</label>
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${operateur.estDisponible
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
              }`}>
              {operateur.estDisponible ? (
                <UserCheck className="w-4 h-4" />
              ) : (
                <UserX className="w-4 h-4" />
              )}
              <span className="font-medium">
                {operateur.estDisponible ? 'Disponible' : 'Indisponible'}
              </span>
            </div>
          </div>

          {/* Competences */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-3 block flex items-center gap-2">
              <Award className="w-4 h-4" />
              Competences ({operateur.competencesDetail.length})
            </label>
            {operateur.competencesDetail.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucune competence enregistree</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {operateur.competencesDetail.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {comp.competenceDetail?.nomCompetence || `Competence #${comp.competence}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {comp.competenceDetail?.categorieDisplay}
                      </p>
                    </div>
                    <StatusBadge variant="status" type="competence" value={comp.niveau || ''} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperateurDetailModal;
