import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Edit2,
  ExternalLink
} from 'lucide-react';
import {
  Utilisateur,
  Client,
  NomRole,
  NOM_ROLE_LABELS,
  getBadgeColors
} from '../../types/users';
import { fetchClientByUserId } from '../../services/usersApi';

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

interface ChefEquipeDetailModalProps extends DetailModalProps {}

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
  clientData: initialClientData
}) => {
  const [clientData, setClientData] = useState<Client | undefined>(initialClientData);
  const [loading, setLoading] = useState(!initialClientData);

  useEffect(() => {
    // Si les données client ne sont pas fournies, les charger depuis l'API
    if (!initialClientData) {
      const loadClientData = async () => {
        setLoading(true);
        try {
          const data = await fetchClientByUserId(user.id);
          if (data) {
            setClientData(data);
          }
        } catch (error) {
          console.error('Erreur chargement client:', error);
        } finally {
          setLoading(false);
        }
      };
      loadClientData();
    }
  }, [user.id, initialClientData]);

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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
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
              {clientData?.structure ? (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-green-500" />
                    Organisation d'appartenance
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Nom de l'organisation</label>
                        <p className="text-gray-900 font-semibold text-lg">{clientData.structure.nom}</p>
                      </div>
                      {clientData.structure.id && (
                        <Link
                          to={`/structures/${clientData.structure.id}`}
                          className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 hover:underline"
                          onClick={onClose}
                        >
                          Voir détails
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Adresse
                        </label>
                        <p className="text-gray-900">{clientData.structure.adresse || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Téléphone
                        </label>
                        <p className="text-gray-900">{clientData.structure.telephone || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Contact principal</label>
                        <p className="text-gray-900">{clientData.structure.contactPrincipal || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> Email facturation
                        </label>
                        <p className="text-gray-900">{clientData.structure.emailFacturation || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-green-200">
                      <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Utilisateurs
                        </label>
                        <p className="text-gray-900">{clientData.structure.utilisateursCount}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Sites assignés
                        </label>
                        <p className="text-gray-900">{clientData.structure.sitesCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : clientData ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-700 font-medium">Utilisateur orphelin</p>
                  <p className="text-sm text-orange-600 mt-1">
                    Ce client n'est associé à aucune organisation.
                    Vous pouvez l'affecter depuis la page de détail d'une organisation.
                  </p>
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
            </>
          )}
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
  onToggleActive
}) => {
  // Note: Les SUPERVISEUR sont des utilisateurs avec compte, pas des opérateurs.
  // Les opérateurs sont des données RH standalone sans compte utilisateur.
  // Cette modal affiche les infos utilisateur pour les superviseurs.
  const loading = false;

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

              {/* Info superviseur */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">Rôle Superviseur</h4>
                <p className="text-sm text-yellow-700">
                  Ce superviseur gère les équipes et le planning depuis le bureau.
                  Il peut superviser les opérateurs terrain.
                </p>
              </div>

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
// HELPER - Sélection automatique de la modale appropriée
// ============================================================================

interface UserDetailModalSelectorProps {
  user: Utilisateur;
  clients: Client[];
  onClose: () => void;
  onEdit: (user: Utilisateur) => void;
  onToggleActive: (id: number, actif: boolean) => void;
}

export const UserDetailModalSelector: React.FC<UserDetailModalSelectorProps> = ({
  user,
  clients,
  onClose,
  onEdit,
  onToggleActive
}) => {
  // Déterminer le type principal de l'utilisateur
  // Priorité: ADMIN > SUPERVISEUR > CLIENT
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
