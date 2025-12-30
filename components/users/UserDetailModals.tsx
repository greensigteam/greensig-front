import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Calendar,
  Award,
  Check,
  Shield,
  Building2,
  UserCheck,
  UserX,
  Phone,
  MapPin,
  CreditCard,
  Users,
  Edit2
} from 'lucide-react';
import {
  Utilisateur,
  Client,
  OperateurList,
  OperateurDetail,
  NomRole,
  NOM_ROLE_LABELS,
  NIVEAU_COMPETENCE_LABELS,
  STATUT_OPERATEUR_LABELS,
  STATUT_OPERATEUR_COLORS,
  getBadgeColors
} from '../../types/users';
import { fetchOperateurById } from '../../services/usersApi';

// ============================================================================
// PROPS COMMUNES
// ============================================================================

interface DetailModalProps {
  user: Utilisateur;
  onClose: () => void;
  onEdit: (user: Utilisateur) => void;
  onToggleActive: (id: number, actif: boolean) => void;
}

interface AdminDetailModalProps extends DetailModalProps {}

interface ClientDetailModalProps extends DetailModalProps {
  clientData?: Client;
}

interface ChefEquipeDetailModalProps extends DetailModalProps {
  operateurs: OperateurList[];
}

interface OperateurDetailModalProps extends DetailModalProps {
  operateurs: OperateurList[];
}

// ============================================================================
// MODAL - Détail Administrateur
// ============================================================================

export const AdminDetailModal: React.FC<AdminDetailModalProps> = ({
  user,
  onClose,
  onEdit,
  onToggleActive
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-purple-100">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.fullName}</h2>
              <p className="text-sm text-purple-600 font-medium">Administrateur</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-purple-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Informations générales */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-500" />
              Informations du compte
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Statut</label>
                <p className="mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    user.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.actif ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {user.actif ? 'Actif' : 'Inactif'}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Date de création</label>
                <p className="text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {new Date(user.dateCreation).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Dernière connexion</label>
                <p className="text-gray-900">
                  {user.derniereConnexion
                    ? new Date(user.derniereConnexion).toLocaleString('fr-FR')
                    : 'Jamais'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Rôles */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-500" />
              Rôles attribués
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1"
                >
                  <Shield className="w-3 h-3" />
                  {NOM_ROLE_LABELS[role]}
                </span>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-purple-800 mb-2">Accès administrateur</h4>
            <ul className="text-sm text-purple-700 space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" /> Accès complet au système
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" /> Gestion des utilisateurs
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" /> Configuration du système
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" /> Rapports et statistiques
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => onEdit(user)}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Modifier
          </button>
          <button
            onClick={() => onToggleActive(user.id, !user.actif)}
            className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
              user.actif
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {user.actif ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            {user.actif ? 'Désactiver' : 'Réactiver'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL - Détail Client
// ============================================================================

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  user,
  onClose,
  onEdit,
  onToggleActive,
  clientData
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-green-50">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-green-100">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.fullName}</h2>
              <p className="text-sm text-green-600 font-medium">Client</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-green-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Informations du compte */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-green-500" />
              Informations du compte
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Statut</label>
                <p className="mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    user.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.actif ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {user.actif ? 'Actif' : 'Inactif'}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Date de création</label>
                <p className="text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {new Date(user.dateCreation).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Dernière connexion</label>
                <p className="text-gray-900">
                  {user.derniereConnexion
                    ? new Date(user.derniereConnexion).toLocaleString('fr-FR')
                    : 'Jamais'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Informations de la structure */}
          {clientData ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-500" />
                Informations de la structure
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Nom de la structure</label>
                  <p className="text-gray-900 font-semibold text-lg">{clientData.nomStructure || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Adresse
                    </label>
                    <p className="text-gray-900">{clientData.adresse || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Téléphone
                    </label>
                    <p className="text-gray-900">{clientData.telephone || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Contact principal</label>
                    <p className="text-gray-900">{clientData.contactPrincipal || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> Email facturation
                    </label>
                    <p className="text-gray-900">{clientData.emailFacturation || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-700">Aucun profil client associé.</p>
            </div>
          )}

          {/* Rôles */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-green-500" />
              Rôles
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1"
                >
                  {role === 'CLIENT' ? <Building2 className="w-3 h-3" /> : <Award className="w-3 h-3" />}
                  {NOM_ROLE_LABELS[role]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => onEdit(user)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Modifier
          </button>
          <button
            onClick={() => onToggleActive(user.id, !user.actif)}
            className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
              user.actif
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {user.actif ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            {user.actif ? 'Désactiver' : 'Réactiver'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL - Détail Chef d'équipe
// ============================================================================

export const ChefEquipeDetailModal: React.FC<ChefEquipeDetailModalProps> = ({
  user,
  onClose,
  onEdit,
  onToggleActive,
  operateurs
}) => {
  const [operateurDetail, setOperateurDetail] = useState<OperateurDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadOperateurDetail = async () => {
      const op = operateurs.find(o => o.id === user.id);
      if (!op) return;
      setLoading(true);
      try {
        const detail = await fetchOperateurById(op.id);
        if (mounted) setOperateurDetail(detail);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadOperateurDetail();
    return () => { mounted = false; };
  }, [user, operateurs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-yellow-50">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-yellow-100">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.fullName}</h2>
              <p className="text-sm text-yellow-600 font-medium">Chef d'équipe</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-yellow-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-yellow-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Informations du compte */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-yellow-500" />
                  Informations du compte
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Statut</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.actif ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {user.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Date de création</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(user.dateCreation).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Dernière connexion</label>
                    <p className="text-gray-900">
                      {user.derniereConnexion
                        ? new Date(user.derniereConnexion).toLocaleString('fr-FR')
                        : 'Jamais'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations opérateur */}
              {operateurDetail && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-yellow-500" />
                    Informations professionnelles
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Matricule</label>
                        <p className="text-gray-900 font-semibold">{operateurDetail.numeroImmatriculation || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Statut opérateur</label>
                        <div className="mt-1">
                          {(() => {
                            const safe = getBadgeColors(STATUT_OPERATEUR_COLORS, operateurDetail.statut as any);
                            const label = operateurDetail.statut ? STATUT_OPERATEUR_LABELS[operateurDetail.statut] : 'Non renseigné';
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${safe.bg} ${safe.text}`}>
                                {label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Téléphone
                        </label>
                        <p className="text-gray-900">{operateurDetail.telephone || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Date d'embauche</label>
                        <p className="text-gray-900">
                          {operateurDetail.dateEmbauche
                            ? new Date(operateurDetail.dateEmbauche).toLocaleDateString('fr-FR')
                            : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Équipe
                        </label>
                        <p className="text-gray-900">{operateurDetail.equipeNom || 'Non affecté'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Disponibilité</label>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          operateurDetail.estDisponible
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {operateurDetail.estDisponible ? (
                            <UserCheck className="w-3 h-3" />
                          ) : (
                            <UserX className="w-3 h-3" />
                          )}
                          {operateurDetail.estDisponible ? 'Disponible' : 'Indisponible'}
                        </div>
                      </div>
                    </div>

                    {operateurDetail.estChefEquipe && operateurDetail.equipesDirigeesCount > 0 && (
                      <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 font-medium flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Dirige {operateurDetail.equipesDirigeesCount} équipe{operateurDetail.equipesDirigeesCount > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Compétences */}
              {operateurDetail && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    Compétences ({operateurDetail.competencesDetail?.length || 0})
                  </h3>
                  {operateurDetail.competencesDetail && operateurDetail.competencesDetail.length > 0 ? (
                    <div className="space-y-2">
                      {operateurDetail.competencesDetail.map((comp) => (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {comp.competenceDetail?.nomCompetence || `Compétence #${comp.competence}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {comp.competenceDetail?.categorieDisplay}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800`}>
                            {NIVEAU_COMPETENCE_LABELS[comp.niveau]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Aucune compétence renseignée.</p>
                  )}
                </div>
              )}

              {/* Rôles */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  Rôles
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-1"
                    >
                      {role === 'SUPERVISEUR' ? <Award className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                      {NOM_ROLE_LABELS[role]}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => onEdit(user)}
            className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Modifier
          </button>
          <button
            onClick={() => onToggleActive(user.id, !user.actif)}
            className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
              user.actif
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {user.actif ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            {user.actif ? 'Désactiver' : 'Réactiver'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL - Détail Opérateur
// ============================================================================

export const OperateurDetailModal: React.FC<OperateurDetailModalProps> = ({
  user,
  onClose,
  onEdit,
  onToggleActive,
  operateurs
}) => {
  const [operateurDetail, setOperateurDetail] = useState<OperateurDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadOperateurDetail = async () => {
      const op = operateurs.find(o => o.id === user.id);
      if (!op) return;
      setLoading(true);
      try {
        const detail = await fetchOperateurById(op.id);
        if (mounted) setOperateurDetail(detail);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadOperateurDetail();
    return () => { mounted = false; };
  }, [user, operateurs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100">
              <UserCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.fullName}</h2>
              <p className="text-sm text-blue-600 font-medium">Opérateur</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-blue-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Informations du compte */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  Informations du compte
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Statut</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.actif ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {user.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Date de création</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(user.dateCreation).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Dernière connexion</label>
                    <p className="text-gray-900">
                      {user.derniereConnexion
                        ? new Date(user.derniereConnexion).toLocaleString('fr-FR')
                        : 'Jamais'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations opérateur */}
              {operateurDetail ? (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-500" />
                    Informations professionnelles
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Matricule</label>
                        <p className="text-gray-900 font-semibold">{operateurDetail.numeroImmatriculation || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Statut opérateur</label>
                        <div className="mt-1">
                          {(() => {
                            const safe = getBadgeColors(STATUT_OPERATEUR_COLORS, operateurDetail.statut as any);
                            const label = operateurDetail.statut ? STATUT_OPERATEUR_LABELS[operateurDetail.statut] : 'Non renseigné';
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${safe.bg} ${safe.text}`}>
                                {label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Téléphone
                        </label>
                        <p className="text-gray-900">{operateurDetail.telephone || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Date d'embauche</label>
                        <p className="text-gray-900">
                          {operateurDetail.dateEmbauche
                            ? new Date(operateurDetail.dateEmbauche).toLocaleDateString('fr-FR')
                            : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Équipe
                        </label>
                        <p className="text-gray-900">{operateurDetail.equipeNom || 'Non affecté'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Disponibilité</label>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          operateurDetail.estDisponible
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {operateurDetail.estDisponible ? (
                            <UserCheck className="w-3 h-3" />
                          ) : (
                            <UserX className="w-3 h-3" />
                          )}
                          {operateurDetail.estDisponible ? 'Disponible' : 'Indisponible'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-700">Profil opérateur non disponible.</p>
                </div>
              )}

              {/* Compétences */}
              {operateurDetail && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-500" />
                    Compétences ({operateurDetail.competencesDetail?.length || 0})
                  </h3>
                  {operateurDetail.competencesDetail && operateurDetail.competencesDetail.length > 0 ? (
                    <div className="space-y-2">
                      {operateurDetail.competencesDetail.map((comp) => (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {comp.competenceDetail?.nomCompetence || `Compétence #${comp.competence}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {comp.competenceDetail?.categorieDisplay}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
                            {NIVEAU_COMPETENCE_LABELS[comp.niveau]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Aucune compétence renseignée.</p>
                  )}
                </div>
              )}

              {/* Rôles */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-500" />
                  Rôles
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1"
                    >
                      {role === 'SUPERVISEUR' ? <UserCheck className="w-3 h-3" /> : <Award className="w-3 h-3" />}
                      {NOM_ROLE_LABELS[role]}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => onEdit(user)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Modifier
          </button>
          <button
            onClick={() => onToggleActive(user.id, !user.actif)}
            className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
              user.actif
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {user.actif ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            {user.actif ? 'Désactiver' : 'Réactiver'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HELPER - Sélection automatique de la modale appropriée
// ============================================================================

interface UserDetailModalSelectorProps {
  user: Utilisateur;
  clients: Client[];
  operateurs: OperateurList[];
  onClose: () => void;
  onEdit: (user: Utilisateur) => void;
  onToggleActive: (id: number, actif: boolean) => void;
}

export const UserDetailModalSelector: React.FC<UserDetailModalSelectorProps> = ({
  user,
  clients,
  operateurs,
  onClose,
  onEdit,
  onToggleActive
}) => {
  // Déterminer le type principal de l'utilisateur
  // Priorité: ADMIN > SUPERVISEUR > SUPERVISEUR > CLIENT
  if (user.roles.includes('ADMIN')) {
    return (
      <AdminDetailModal
        user={user}
        onClose={onClose}
        onEdit={onEdit}
        onToggleActive={onToggleActive}
      />
    );
  }

  if (user.roles.includes('SUPERVISEUR')) {
    return (
      <ChefEquipeDetailModal
        user={user}
        operateurs={operateurs}
        onClose={onClose}
        onEdit={onEdit}
        onToggleActive={onToggleActive}
      />
    );
  }

  if (user.roles.includes('SUPERVISEUR')) {
    return (
      <OperateurDetailModal
        user={user}
        operateurs={operateurs}
        onClose={onClose}
        onEdit={onEdit}
        onToggleActive={onToggleActive}
      />
    );
  }

  if (user.roles.includes('CLIENT')) {
    const clientData = clients.find(c => c.utilisateur === user.id);
    return (
      <ClientDetailModal
        user={user}
        clientData={clientData}
        onClose={onClose}
        onEdit={onEdit}
        onToggleActive={onToggleActive}
      />
    );
  }

  // Fallback: Admin modal si aucun rôle identifié
  return (
    <AdminDetailModal
      user={user}
      onClose={onClose}
      onEdit={onEdit}
      onToggleActive={onToggleActive}
    />
  );
};
