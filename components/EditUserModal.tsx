import React, { useState, useEffect } from 'react';
import {
  Edit2,
  AlertCircle,
  Mail,
  UserCheck,
  Building2
} from 'lucide-react';
import FormModal, { FormField, FormInput, FormSection } from './FormModal';
import {
  Utilisateur,
  Client,
  OperateurList,
  NomRole,
  Role,
  ClientUpdate,
  OperateurUpdate
} from '../types/users';
import {
  fetchRoles,
  updateUtilisateur,
  updateClient,
  updateOperateur,
  attribuerRole,
  retirerRole
} from '../services/usersApi';
import { createOperateur, fetchOperateurById } from '../services/usersApi';
import { fetchUtilisateurById } from '../services/usersApi';
import {
  fetchCompetences,
  fetchCompetencesOperateur,
  affecterCompetence
} from '../services/usersApi';
import { Competence, CompetenceOperateur } from '../types/users';

interface EditUserModalProps {
  user: Utilisateur;
  clients: Client[];
  operateurs: OperateurList[];
  onClose: () => void;
  onUpdated: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, clients, operateurs, onClose, onUpdated }) => {
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
        const resp = await fetch('/api/users/me/', { headers: { Authorization: `Bearer ${token}` } });
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

  const clientData = clients.find(c => c.utilisateur === user.id);
  const initialOperateur = operateurs.find(o => o.utilisateur === user.id) || null;
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
          const opComps = await fetchCompetencesOperateur(operateurInfo.utilisateur);
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
    actif: user.actif
  });



  const [operateurFields, setOperateurFields] = useState({
    numeroImmatriculation: initialOperateur?.numeroImmatriculation || '',
    telephone: initialOperateur?.telephone || ''
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
        actif: formData.actif
      });



      if (userRoles && (userRoles.includes('SUPERVISEUR') || userRoles.includes('SUPERVISEUR'))) {
        // if operateur profile exists, update it; otherwise create one
        if (operateurInfo) {
          const operateurUpdate: OperateurUpdate = {
            nom: formData.nom,
            prenom: formData.prenom,
            email: formData.email,
            numeroImmatriculation: operateurFields.numeroImmatriculation,
            telephone: operateurFields.telephone
          };
          await updateOperateur(operateurInfo.utilisateur, operateurUpdate);
        } else {
          // try to create operateur profile
          try {
            const created = await createOperateur({
              email: formData.email,
              nom: formData.nom,
              prenom: formData.prenom,
              password: Math.random().toString(36).slice(-8),
              numeroImmatriculation: operateurFields.numeroImmatriculation || `OP-${user.id}`,
              dateEmbauche: new Date().toISOString().split('T')[0] as string,
              telephone: operateurFields.telephone || ''
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
  const iconColor = userRoles.includes('ADMIN') ? 'text-purple-600' :
    userRoles.includes('SUPERVISEUR') ? 'text-blue-600' :
    userRoles.includes('SUPERVISEUR') ? 'text-yellow-600' :
    userRoles.includes('CLIENT') ? 'text-green-600' : 'text-gray-600';

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
              const roleName = roleObj.nomRole as any;
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
                    >Retirer</button>
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
                    >Ajouter</button>
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
          <FormField label="Prénom">
            <FormInput
              type="text"
              value={formData.prenom}
              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
            />
          </FormField>

          <FormField label="Nom">
            <FormInput
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="Email">
          <FormInput
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </FormField>

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
            <FormField label="Matricule">
              <FormInput
                type="text"
                value={operateurFields.numeroImmatriculation}
                onChange={(e) => setOperateurFields({ ...operateurFields, numeroImmatriculation: e.target.value })}
              />
            </FormField>

            <FormField label="Téléphone">
              <FormInput
                type="tel"
                value={operateurFields.telephone}
                onChange={(e) => setOperateurFields({ ...operateurFields, telephone: e.target.value })}
              />
            </FormField>
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
                      password: Math.random().toString(36).slice(-8),
                      numeroImmatriculation: operateurFields.numeroImmatriculation || `OP-${user.id}`,
                      dateEmbauche: new Date().toISOString().split('T')[0] as string,
                      telephone: operateurFields.telephone || ''
                    });
                    setOperateurInfo(created as OperateurList);
                    try {
                      const refreshed = await fetchCompetencesOperateur((created as OperateurList).utilisateur);
                      setOperateurCompetences(refreshed);
                    } catch (e) {
                      // ignore
                    }
                  } catch (e) {
                    console.error('Erreur création operateur', e);
                  } finally {
                    setCreatingOperateur(false);
                  }
                }}
              >
                {creatingOperateur ? 'Création...' : "Créer profil opérateur"}
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
                      <div className="text-xs text-gray-500">{c.competenceDetail?.categorieDisplay}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={c.niveau}
                        onChange={async (e) => {
                          const niveau = e.target.value as any;
                          try {
                            await affecterCompetence(c.operateur, { competenceId: c.competence, niveau });
                            const refreshed = await fetchCompetencesOperateur(c.operateur);
                            setOperateurCompetences(refreshed);
                          } catch (err) {
                            console.error('Erreur mise à jour competence', err);
                          }
                        }}
                        className="border border-gray-300 px-2 py-1 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">Niveau...</option>
                        <option value="NON">Non maîtrisé</option>
                        <option value="DEBUTANT">Débutant</option>
                        <option value="INTERMEDIAIRE">Intermédiaire</option>
                        <option value="EXPERT">Expert</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ajouter une compétence */}
            <div className="mt-3 border-t pt-3">
              <label className="text-sm text-gray-600">Ajouter une compétence</label>
              <div className="flex gap-2 mt-2">
                <select
                  value={newCompetenceId}
                  onChange={(e) => setNewCompetenceId(e.target.value ? Number(e.target.value) : '')}
                  className="border border-gray-300 px-2 py-1 rounded-lg flex-1 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">-- Choisir --</option>
                  {allCompetences
                    .filter((ac) => !operateurCompetences.some((oc) => oc.competence === ac.id))
                    .map((ac) => (
                      <option key={ac.id} value={ac.id}>
                        {ac.nomCompetence}
                      </option>
                    ))}
                </select>
                <select
                  value={newCompetenceNiveau}
                  onChange={(e) => setNewCompetenceNiveau(e.target.value)}
                  className="border border-gray-300 px-2 py-1 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Niveau</option>
                  <option value="NON">Non maîtrisé</option>
                  <option value="DEBUTANT">Débutant</option>
                  <option value="INTERMEDIAIRE">Intermédiaire</option>
                  <option value="EXPERT">Expert</option>
                </select>
                <button
                  type="button"
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  onClick={async () => {
                    if (!operateurInfo || !newCompetenceId || !newCompetenceNiveau) return;
                    try {
                      await affecterCompetence(operateurInfo.utilisateur, {
                        competenceId: Number(newCompetenceId),
                        niveau: newCompetenceNiveau as any
                      });
                      const refreshed = await fetchCompetencesOperateur(operateurInfo.utilisateur);
                      setOperateurCompetences(refreshed);
                      setNewCompetenceId('');
                      setNewCompetenceNiveau('');
                    } catch (err) {
                      console.error('Erreur ajout competence', err);
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
