import React from 'react';
import { X, Users, UserCheck } from 'lucide-react';
import { EquipeDetail } from '../../types/users';
import { StatusBadge } from '../StatusBadge';

interface EquipeDetailModalProps {
  equipe: EquipeDetail;
  onClose: () => void;
}

const EquipeDetailModal: React.FC<EquipeDetailModalProps> = ({ equipe, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{equipe.nomEquipe}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Statut */}
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Statut</label>
              <div className="mt-1">
                <StatusBadge variant="boolean" value={equipe.actif} labels={{ true: 'Active', false: 'Inactive' }} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Statut operationnel</label>
              <div className="mt-1">
                <StatusBadge variant="status" type="equipe" value={equipe.statutOperationnel || ''} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Creee le</label>
              <p className="text-gray-900">
                {new Date(equipe.dateCreation).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Chef d'equipe */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-2 block">Chef d'equipe</label>
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{equipe.chefEquipeNom}</p>
                <p className="text-sm text-gray-500">
                  {equipe.chefEquipeDetail?.numeroImmatriculation}
                </p>
              </div>
            </div>
          </div>

          {/* Membres */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-3 block flex items-center gap-2">
              <Users className="w-4 h-4" />
              Membres ({equipe.nombreMembres})
            </label>
            <div className="space-y-2">
              {equipe.membres.map((membre) => (
                <div
                  key={membre.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{membre.fullName}</p>
                      <p className="text-xs text-gray-500">{membre.numeroImmatriculation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant="status" type="operateur" value={membre.statut || ''} />
                    {membre.estChefEquipe && (
                      <StatusBadge variant="custom" bg="bg-emerald-100" text="text-emerald-700">
                        Chef
                      </StatusBadge>
                    )}
                  </div>
                </div>
              ))}
            </div>
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

export default EquipeDetailModal;
