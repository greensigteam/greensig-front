import React, { useState, useEffect } from 'react';
import { Edit2, Mail, UserCheck, Phone, Hash } from 'lucide-react';
import FormModal, { FormSection } from './FormModal';
import { PremiumInput, PremiumSelect } from './modals/PremiumFormComponents';
import { Utilisateur, Client, OperateurList, NomRole, Role, OperateurUpdate } from '../types/users';
import {
  fetchRoles,
  updateUtilisateur,
  updateOperateur,
  attribuerRole,
  retirerRole,
} from '../services/usersApi';
import { createOperateur } from '../services/usersApi';
import { fetchUtilisateurById } from '../services/usersApi';
import {
  fetchCompetences,
  fetchCompetencesOperateur,
  affecterCompetence,
} from '../services/usersApi';
import { Competence, CompetenceOperateur, NiveauCompetence } from '../types/users';
import { useToast } from '../contexts/ToastContext';

interface EditUserModalProps {
  user: Utilisateur;
  clients: Client[];
  operateurs: OperateurList[];
  onClose: () => void;
  onUpdated: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  clients: _clients,
  operateurs,
  onClose,
  onUpdated,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<NomRole[]>(user.roles || []);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [currentUserRoles, setCurrentUserRoles] = useState<NomRole[]>([]);

  useEffect(() => {
    // Recharger l'utilisateur depuis l'API pour garantir que les rôles sont à jour
    const refreshUser = async () => {
      try {
        const fresh = await fetchUtilisateurById(user.id);
        if (fresh && Array.isArray(fresh.roles)) {
          setUserRoles(fresh.roles as NomRole[]);
        }
      } catch (e) {
        // ignore
      }
    };
    refreshUser();

    const fetchAll = async () => {
      try {
        const rolesRes = await fetchRoles();
        setAllRoles(rolesRes);
      } catch (err) {
        // ignore
      }
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const resp = await fetch('/api/users/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return;
        const me = await resp.json();
        let roles: NomRole[] = [];
        if (Array.isArray(me.roles) && me.roles.length > 0) {
          roles = me.roles as NomRole[];
        }
        setCurrentUserRoles(roles);
      } catch (e) {
        // ignore
      }
    };
    fetchAll();
  }, []);

  const initialOperateur = operateurs.find((o) => o.id === user.id) || null;
  const [operateurInfo, setOperateurInfo] = useState<OperateurList | null>(initialOperateur);

  const [allCompetences, setAllCompetences] = useState<Competence[]>([]);
  const [operateurCompetences, setOperateurCompetences] = useState<CompetenceOperateur[]>([]);
  const [newCompetenceId, setNewCompetenceId] = useState<number | ''>('');
  const [newCompetenceNiveau, setNewCompetenceNiveau] = useState<string>('');

  useEffect(() => {
    const loadComps = async () => {
      if (!(userRoles.includes('SUPERVISEUR') || userRoles.includes('SUPERVISEUR'))) return;
      try {
        const all = await fetchCompetences();
        setAllCompetences(all);
        if (operateurInfo) {
          const opComps = await fetchCompetencesOperateur(operateurInfo.id);
          setOperateurCompetences(opComps);
        } else {
          setOperateurCompetences([]);
        }
      } catch (e) {
        // ignore
      }
    };
    loadComps();
  }, [userRoles, operateurInfo]);

  const [formData, setFormData] = useState({
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    actif: user.actif,
  });

  const [operateurFields, setOperateurFields] = useState({
    numeroImmatriculation: initialOperateur?.numeroImmatriculation || '',
    telephone: initialOperateur?.telephone || '',
  });
  const [creatingOperateur, setCreatingOperateur] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await updateUtilisateur(user.id, {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        actif: formData.actif,
      });

      if (userRoles && (userRoles.includes('SUPERVISEUR') || userRoles.includes('SUPERVISEUR'))) {
        // if operateur profile exists, update it; otherwise create one
        if (operateurInfo) {
          const operateurUpdate: OperateurUpdate = {
            nom: formData.nom,
            prenom: formData.prenom,
            email: formData.email,
            numeroImmatriculation: operateurFields.numeroImmatriculation,
            telephone: operateurFields.telephone,
          };
          await updateOperateur(operateurInfo.id, operateurUpdate);
        } else {
          // try to create operateur profile
          try {
            const created = await createOperateur({
              email: formData.email,
              nom: formData.nom,
              prenom: formData.prenom,
              numeroImmatriculation: operateurFields.numeroImmatriculation || `OP-${user.id}`,
              dateEmbauche: new Date().toISOString().split('T')[0] as string,
              telephone: operateurFields.telephone || '',
            });
            setOperateurInfo(created as OperateurList);
          } catch (e) {
            // creation may fail; ignore here
          }
        }
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise a jour');
    } finally {
      setLoading(false);
    }
  };

  // Determine icon color based on roles
  const iconColor = userRoles.includes('ADMIN')
    ? 'text-purple-600'
    : userRoles.includes('SUPERVISEUR')
      ? 'text-blue-600'
      : userRoles.includes('SUPERVISEUR')
        ? 'text-yellow-600'
        : userRoles.includes('CLIENT')
          ? 'text-green-600'
          : 'text-gray-600';

  const subtitleContent = (
    <span className="text-sm text-gray-500">{(userRoles || []).join(', ')}</span>
  );

  return (
    <FormModal
      isOpen={true}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Modifier l'utilisateur"
      subtitle={subtitleContent}
      icon={<Edit2 className={`w-5 h-5 ${iconColor}`} />}
      size="lg"
      loading={loading}
      error={error}
      submitLabel="Enregistrer"
      cancelLabel="Annuler"
    >
      {/* Gestion des rôles (admin uniquement) */}
      {currentUserRoles.includes('ADMIN') && (
        <FormSection title="Gestion des rôles">
          {roleError && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-2">
              {roleError}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {allRoles.map((roleObj) => {
              const roleName = roleObj.nomRole;
              const hasRole = userRoles.includes(roleName);
              return (
                <div key={roleObj.id} className="flex items-center gap-1 border rounded px-2 py-1">
                  <span className="text-xs font-semibold">{roleObj.nomRole}</span>
                  {hasRole ? (
                    <button
                      type="button"
                      disabled={roleLoading === roleName}
                      className="text-red-600 text-xs ml-2 px-1 hover:underline"
                      onClick={async () => {
                        setRoleLoading(roleName);
                        setRoleError(null);
                        try {
                          await retirerRole(user.id.toString(), roleObj.id.toString());
                          setUserRoles((prev) => prev.filter((r) => r !== roleName));
                        } catch (err: any) {
                          setRoleError(err.message || 'Erreur lors du retrait du rôle');
                        } finally {
                          setRoleLoading(null);
                        }
                      }}
                    >
                      Retirer
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={roleLoading === roleName}
                      className="text-emerald-600 text-xs ml-2 px-1 hover:underline"
                      onClick={async () => {
                        setRoleLoading(roleName);
                        setRoleError(null);
                        try {
                          await attribuerRole(user.id.toString(), roleObj.id.toString());
                          setUserRoles((prev) => [...prev, roleName]);
                        } catch (err: any) {
                          setRoleError(err.message || "Erreur lors de l'attribution du rôle");
                        } finally {
                          setRoleLoading(null);
                        }
                      }}
                    >
                      Ajouter
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </FormSection>
      )}

      {/* Informations générales */}
      <FormSection title="Informations générales" icon={<Mail className="w-4 h-4" />}>
        <div className="grid grid-cols-2 gap-4">
          <PremiumInput
            type="text"
            value={formData.prenom}
            onChange={(value) => setFormData({ ...formData, prenom: value })}
            label="Prénom"
            placeholder="Jean"
            icon={<UserCheck className="w-4 h-4" />}
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
            icon={<UserCheck className="w-4 h-4" />}
            required
            variant="outlined"
            size="md"
          />
        </div>

        <PremiumInput
          type="email"
          value={formData.email}
          onChange={(value) => setFormData({ ...formData, email: value })}
          label="Email"
          placeholder="email@exemple.com"
          icon={<Mail className="w-4 h-4" />}
          required
          variant="outlined"
          size="md"
        />

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Statut du compte</label>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, actif: !formData.actif })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.actif ? 'bg-emerald-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.actif ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${formData.actif ? 'text-emerald-600' : 'text-gray-500'}`}>
            {formData.actif ? 'Actif' : 'Inactif'}
          </span>
        </div>
      </FormSection>

      {/* Informations opérateur (si SUPERVISEUR ou SUPERVISEUR) */}
      {(userRoles.includes('SUPERVISEUR') || userRoles.includes('SUPERVISEUR')) && (
        <FormSection title="Informations opérateur" icon={<UserCheck className="w-4 h-4" />}>
          <div className="grid grid-cols-2 gap-4">
            <PremiumInput
              type="text"
              value={operateurFields.numeroImmatriculation}
              onChange={(value) =>
                setOperateurFields({ ...operateurFields, numeroImmatriculation: value })
              }
              label="Matricule"
              placeholder="OP-2024-0001"
              icon={<Hash className="w-4 h-4" />}
              variant="outlined"
              size="md"
            />

            <PremiumInput
              type="tel"
              value={operateurFields.telephone}
              onChange={(value) => setOperateurFields({ ...operateurFields, telephone: value })}
              label="Téléphone"
              placeholder="06 XX XX XX XX"
              icon={<Phone className="w-4 h-4" />}
              variant="outlined"
              size="md"
            />
          </div>

          {!operateurInfo && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-700 mb-2">
                Aucun profil opérateur trouvé. Créez le profil pour gérer les compétences.
              </p>
              <button
                type="button"
                disabled={creatingOperateur}
                className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                onClick={async () => {
                  setCreatingOperateur(true);
                  try {
                    const created = await createOperateur({
                      email: formData.email,
                      nom: formData.nom,
                      prenom: formData.prenom,
                      numeroImmatriculation:
                        operateurFields.numeroImmatriculation || `OP-${user.id}`,
                      dateEmbauche: new Date().toISOString().split('T')[0] as string,
                      telephone: operateurFields.telephone || '',
                    });
                    setOperateurInfo(created as OperateurList);
                    try {
                      const refreshed = await fetchCompetencesOperateur(
                        (created as OperateurList).id,
                      );
                      setOperateurCompetences(refreshed);
                    } catch (e) {
                      // ignore
                    }
                  } catch (e) {
                    showToast('Erreur lors de la création du profil opérateur', 'error');
                  } finally {
                    setCreatingOperateur(false);
                  }
                }}
              >
                {creatingOperateur ? 'Création...' : 'Créer profil opérateur'}
              </button>
            </div>
          )}

          {/* Gestion des compétences */}
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Compétences</label>
            {operateurCompetences.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune compétence enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {operateurCompetences.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {c.competenceDetail?.nomCompetence || `#${c.competence}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.competenceDetail?.categorieDisplay}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-48">
                      <PremiumSelect
                        value={c.niveau}
                        onChange={async (value) => {
                          const niveau = value as NiveauCompetence;
                          try {
                            await affecterCompetence(c.operateur, {
                              competenceId: c.competence,
                              niveau,
                            });
                            const refreshed = await fetchCompetencesOperateur(c.operateur);
                            setOperateurCompetences(refreshed);
                          } catch (err) {
                            showToast('Erreur lors de la mise à jour de la compétence', 'error');
                          }
                        }}
                        options={[
                          { value: 'NON', label: 'Non maîtrisé' },
                          { value: 'DEBUTANT', label: 'Débutant' },
                          { value: 'INTERMEDIAIRE', label: 'Intermédiaire' },
                          { value: 'EXPERT', label: 'Expert' },
                        ]}
                        placeholder="Niveau..."
                        variant="outlined"
                        size="sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ajouter une compétence */}
            <div className="mt-3 border-t pt-3">
              <label className="text-sm text-gray-600 mb-2 block">Ajouter une compétence</label>
              <div className="flex gap-2 mt-2">
                <div className="flex-1">
                  <PremiumSelect
                    value={newCompetenceId ? newCompetenceId.toString() : ''}
                    onChange={(value) => setNewCompetenceId(value ? Number(value) : '')}
                    options={allCompetences
                      .filter((ac) => !operateurCompetences.some((oc) => oc.competence === ac.id))
                      .map((ac) => ({
                        value: ac.id.toString(),
                        label: ac.nomCompetence,
                      }))}
                    placeholder="-- Choisir --"
                    variant="outlined"
                    size="sm"
                  />
                </div>
                <div className="w-40">
                  <PremiumSelect
                    value={newCompetenceNiveau}
                    onChange={(value) => setNewCompetenceNiveau(value)}
                    options={[
                      { value: 'NON', label: 'Non maîtrisé' },
                      { value: 'DEBUTANT', label: 'Débutant' },
                      { value: 'INTERMEDIAIRE', label: 'Intermédiaire' },
                      { value: 'EXPERT', label: 'Expert' },
                    ]}
                    placeholder="Niveau"
                    variant="outlined"
                    size="sm"
                  />
                </div>
                <button
                  type="button"
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 self-start"
                  onClick={async () => {
                    if (!operateurInfo || !newCompetenceId || !newCompetenceNiveau) return;
                    try {
                      await affecterCompetence(operateurInfo.id, {
                        competenceId: Number(newCompetenceId),
                        niveau: newCompetenceNiveau as NiveauCompetence,
                      });
                      const refreshed = await fetchCompetencesOperateur(operateurInfo.id);
                      setOperateurCompetences(refreshed);
                      setNewCompetenceId('');
                      setNewCompetenceNiveau('');
                    } catch (err) {
                      showToast("Erreur lors de l'ajout de la compétence", 'error');
                    }
                  }}
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </FormSection>
      )}
    </FormModal>
  );
};

export default EditUserModal;
