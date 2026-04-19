import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Edit,
  Loader2,
  X as XIcon,
  Users,
  MoreVertical,
  UserX,
  UserCheck,
} from 'lucide-react';
import { addUserToStructure, updateUtilisateur } from '../../services/usersApi';
import type { ClientUser } from '../../types/users';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';
import { PremiumInput } from '../modals/PremiumFormComponents';

const ActionMenu: React.FC<{
  isOpen: boolean;
  isActive: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
}> = ({ isOpen, isActive, onToggle, onClose, onEdit, onToggleActive }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 176,
      });
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div
              className="fixed w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-[9999]"
              style={{ top: menuPosition.top, left: menuPosition.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="w-4 h-4 text-slate-500" />
                Modifier
              </button>
              <hr className="my-1 border-slate-100" />
              {isActive ? (
                <button
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleActive();
                  }}
                >
                  <UserX className="w-4 h-4" />
                  Désactiver
                </button>
              ) : (
                <button
                  className="w-full px-3 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleActive();
                  }}
                >
                  <UserCheck className="w-4 h-4" />
                  Activer
                </button>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

const EditUserModal: React.FC<{
  user: ClientUser;
  onClose: () => void;
  onSave: (data: { nom: string; prenom: string; email: string }) => Promise<void>;
}> = ({ user, onClose, onSave }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    prenom: user.prenom,
    nom: user.nom,
    email: user.email,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prenom || !formData.nom || !formData.email) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Modifier l'utilisateur</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <PremiumInput
            type="text"
            value={formData.prenom}
            onChange={(value) => setFormData({ ...formData, prenom: value })}
            label="Prénom"
            placeholder="Jean"
            icon={<User className="w-4 h-4" />}
            required
            variant="outlined"
            size="md"
          />

          <PremiumInput
            type="text"
            value={formData.nom}
            onChange={(value) => setFormData({ ...formData, nom: value })}
            label="Nom"
            placeholder="Dupont"
            icon={<User className="w-4 h-4" />}
            required
            variant="outlined"
            size="md"
          />

          <PremiumInput
            type="email"
            value={formData.email}
            onChange={(value) => setFormData({ ...formData, email: value })}
            label="Email"
            placeholder="jean.dupont@exemple.com"
            icon={<Mail className="w-4 h-4" />}
            required
            variant="outlined"
            size="md"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface OngletUtilisateursProps {
  utilisateurs: ClientUser[];
  structureId: number;
  onRefresh: () => void;
  isLoading: boolean;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
}

const OngletUtilisateurs: React.FC<OngletUtilisateursProps> = ({
  utilisateurs,
  structureId,
  onRefresh,
  isLoading,
  showAddModal,
  setShowAddModal,
}) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [togglingUser, setTogglingUser] = useState<ClientUser | null>(null);
  const [editingUser, setEditingUser] = useState<ClientUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.nom || !formData.prenom || !formData.password) {
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addUserToStructure(structureId, formData);
      showToast('Utilisateur ajoute avec succes', 'success');
      setShowAddModal(false);
      setFormData({ email: '', nom: '', prenom: '', password: '' });
      onRefresh();
    } catch (error: any) {
      let errorMessage = "Erreur lors de l'ajout";
      if (error.data) {
        const errorMessages: string[] = [];
        if (error.data.email) errorMessages.push(`Email: ${error.data.email[0]}`);
        if (error.data.password) errorMessages.push(`Mot de passe: ${error.data.password[0]}`);
        if (error.data.nom) errorMessages.push(`Nom: ${error.data.nom[0]}`);
        if (error.data.prenom) errorMessages.push(`Prénom: ${error.data.prenom[0]}`);
        if (error.data.detail) errorMessages.push(error.data.detail);
        if (error.data.non_field_errors) errorMessages.push(error.data.non_field_errors[0]);
        if (errorMessages.length > 0) {
          errorMessage = errorMessages.join(' | ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserActive = async () => {
    if (!togglingUser) return;
    try {
      await updateUtilisateur(togglingUser.utilisateur, { actif: !togglingUser.actif });
      showToast(togglingUser.actif ? 'Utilisateur désactivé' : 'Utilisateur activé', 'success');
      setTogglingUser(null);
      onRefresh();
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la modification', 'error');
    }
  };

  const handleEditUser = async (data: { nom: string; prenom: string; email: string }) => {
    if (!editingUser) return;
    try {
      await updateUtilisateur(editingUser.utilisateur, data);
      showToast('Utilisateur modifié avec succès', 'success');
      setEditingUser(null);
      onRefresh();
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la modification', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {utilisateurs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12">
          <div className="text-center text-slate-500 flex flex-col items-center">
            <Users className="w-12 h-12 text-slate-200 mb-3" />
            <p className="font-medium text-slate-800">Aucun utilisateur</p>
            <p className="text-sm text-slate-500 mt-1">
              Cette structure n'a pas encore d'utilisateurs.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Utilisateurs ({utilisateurs.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {utilisateurs.map((user) => (
              <div
                key={user.utilisateur}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
                onClick={() =>
                  navigate(`/structures/${structureId}/utilisateurs/${user.utilisateur}`)
                }
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">
                      {user.prenom} {user.nom}
                    </p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      user.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {user.actif ? 'Actif' : 'Inactif'}
                  </span>
                  <ActionMenu
                    isOpen={openActionMenu === user.utilisateur}
                    isActive={user.actif}
                    onToggle={() =>
                      setOpenActionMenu(
                        openActionMenu === user.utilisateur ? null : user.utilisateur,
                      )
                    }
                    onClose={() => setOpenActionMenu(null)}
                    onEdit={() => {
                      setEditingUser(user);
                      setOpenActionMenu(null);
                    }}
                    onToggleActive={() => {
                      setTogglingUser(user);
                      setOpenActionMenu(null);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Ajouter un utilisateur</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                  placeholder="Jean"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                  placeholder="Dupont"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email (identifiant) *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                  placeholder="jean.dupont@exemple.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                  placeholder="********"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {togglingUser && (
        <ConfirmDeleteModal
          title={
            togglingUser.actif
              ? `Désactiver ${togglingUser.prenom} ${togglingUser.nom} ?`
              : `Activer ${togglingUser.prenom} ${togglingUser.nom} ?`
          }
          message={
            togglingUser.actif
              ? 'Cet utilisateur ne pourra plus se connecter à cette structure.'
              : 'Cet utilisateur pourra à nouveau se connecter à cette structure.'
          }
          onConfirm={handleToggleUserActive}
          onCancel={() => setTogglingUser(null)}
          confirmText={togglingUser.actif ? 'Désactiver' : 'Activer'}
          cancelText="Annuler"
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUser}
        />
      )}
    </div>
  );
};

export default OngletUtilisateurs;
