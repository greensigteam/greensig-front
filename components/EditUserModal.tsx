import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  AlertCircle,
  Mail,
  UserCheck,
  Building2,
  Save
} from 'lucide-react';
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
      if (!userRoles.includes('OPERATEUR')) return;
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

  const [clientFields, setClientFields] = useState({
    nomStructure: clientData?.nomStructure || '',
    adresse: clientData?.adresse || '',
    telephone: clientData?.telephone || '',
    contactPrincipal: clientData?.contactPrincipal || '',
    emailFacturation: clientData?.emailFacturation || ''
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

      if (userRoles && userRoles.includes('CLIENT') && clientData) {
        const clientUpdate: ClientUpdate = {
          nomStructure: clientFields.nomStructure,
          adresse: clientFields.adresse,
          telephone: clientFields.telephone,
          contactPrincipal: clientFields.contactPrincipal,
          emailFacturation: clientFields.emailFacturation
        };
        await updateClient(clientData.utilisateur, clientUpdate);
      }

      if (userRoles && userRoles.includes('OPERATEUR')) {
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
              dateEmbauche: new Date().toISOString().split('T')[0],
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${
              userRoles.includes('ADMIN') ? 'bg-purple-100' :
              userRoles.includes('OPERATEUR') ? 'bg-blue-100' :
              userRoles.includes('CHEF_EQUIPE') ? 'bg-yellow-100' :
              userRoles.includes('CLIENT') ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Edit2 className={`w-5 h-5 ${
                userRoles.includes('ADMIN') ? 'text-purple-600' :
                userRoles.includes('OPERATEUR') ? 'text-blue-600' :
                userRoles.includes('CHEF_EQUIPE') ? 'text-yellow-600' :
                userRoles.includes('CLIENT') ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Modifier l'utilisateur</h2>
              <p className="text-sm text-gray-500">{(userRoles || []).join(', ')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {currentUserRoles.includes('ADMIN') && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-gray-300 rounded-full" />
                  Gestion des rôles
                </h3>
                {roleError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-2">{roleError}</div>
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
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              Informations generales
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

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

            {userRoles.includes('CLIENT') && (
              <>
                <hr className="my-4" />
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  Informations structure
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la structure</label>
                  <input
                    type="text"
                    value={clientFields.nomStructure}
                    onChange={(e) => setClientFields({ ...clientFields, nomStructure: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={clientFields.adresse}
                    onChange={(e) => setClientFields({ ...clientFields, adresse: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                    <input
                      type="tel"
                      value={clientFields.telephone}
                      onChange={(e) => setClientFields({ ...clientFields, telephone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact principal</label>
                    <input
                      type="text"
                      value={clientFields.contactPrincipal}
                      onChange={(e) => setClientFields({ ...clientFields, contactPrincipal: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email de facturation</label>
                  <input
                    type="email"
                    value={clientFields.emailFacturation}
                    onChange={(e) => setClientFields({ ...clientFields, emailFacturation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </>
            )}

            {userRoles.includes('OPERATEUR') && (
              <>
                <hr className="my-4" />
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-gray-400" />
                  Informations operateur
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Matricule</label>
                    <input
                      type="text"
                      value={operateurFields.numeroImmatriculation}
                      onChange={(e) => setOperateurFields({ ...operateurFields, numeroImmatriculation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                    <input
                      type="tel"
                      value={operateurFields.telephone}
                      onChange={(e) => setOperateurFields({ ...operateurFields, telephone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                {!operateurInfo && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-700 mb-2">Aucun profil opérateur trouvé. Créez le profil pour gérer les compétences.</p>
                    <button
                      type="button"
                      disabled={creatingOperateur}
                      className="px-3 py-1 bg-amber-600 text-white rounded"
                      onClick={async () => {
                        setCreatingOperateur(true);
                        try {
                          const created = await createOperateur({
                            email: formData.email,
                            nom: formData.nom,
                            prenom: formData.prenom,
                            password: Math.random().toString(36).slice(-8),
                            numeroImmatriculation: operateurFields.numeroImmatriculation || `OP-${user.id}`,
                            dateEmbauche: new Date().toISOString().split('T')[0],
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
                {/* Competences edit */}
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Compétences</label>
                  {operateurCompetences.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucune compétence enregistrée.</p>
                  ) : (
                    <div className="space-y-2">
                      {operateurCompetences.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{c.competenceDetail?.nomCompetence || `#${c.competence}`}</div>
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
                              className="border px-2 py-1 rounded"
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

                  <div className="mt-3 border-t pt-3">
                    <label className="text-sm text-gray-600">Ajouter une compétence</label>
                    <div className="flex gap-2 mt-2">
                      <select value={newCompetenceId} onChange={e => setNewCompetenceId(e.target.value ? Number(e.target.value) : '')} className="border px-2 py-1 rounded flex-1">
                        <option value="">-- Choisir --</option>
                        {allCompetences.filter(ac => !operateurCompetences.some(oc => oc.competence === ac.id)).map(ac => (
                          <option key={ac.id} value={ac.id}>{ac.nomCompetence}</option>
                        ))}
                      </select>
                      <select value={newCompetenceNiveau} onChange={e => setNewCompetenceNiveau(e.target.value)} className="border px-2 py-1 rounded">
                        <option value="">Niveau</option>
                        <option value="NON">Non maîtrisé</option>
                        <option value="DEBUTANT">Débutant</option>
                        <option value="INTERMEDIAIRE">Intermédiaire</option>
                        <option value="EXPERT">Expert</option>
                      </select>
                      <button type="button" className="px-3 py-1 bg-emerald-600 text-white rounded" onClick={async () => {
                        if (!operateurInfo || !newCompetenceId || !newCompetenceNiveau) return;
                        try {
                          await affecterCompetence(operateurInfo.utilisateur, { competenceId: Number(newCompetenceId), niveau: newCompetenceNiveau as any });
                          const refreshed = await fetchCompetencesOperateur(operateurInfo.utilisateur);
                          setOperateurCompetences(refreshed);
                          setNewCompetenceId('');
                          setNewCompetenceNiveau('');
                        } catch (err) {
                          console.error('Erreur ajout competence', err);
                        }
                      }}>Ajouter</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
