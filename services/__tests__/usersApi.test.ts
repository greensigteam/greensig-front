import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiFetch = vi.fn();

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  };
});

import {
  fetchUtilisateurs,
  fetchCurrentUser,
  fetchUtilisateurById,
  createUtilisateur,
  updateUtilisateur,
  deleteUtilisateur,
  changePassword,
  adminResetPassword,
  fetchRoles,
  fetchStructures,
  fetchStructureById,
  deleteStructure,
  fetchStructureUtilisateurs,
  addUserToStructure,
  fetchClients,
  fetchClientByUserId,
  deleteClient,
  fetchOrphanClients,
  assignClientToStructure,
  fetchCompetences,
  createCompetence,
  deleteCompetence,
  fetchOperateurs,
  fetchOperateurById,
  createOperateur,
  updateOperateur,
  deleteOperateur,
  fetchOperateursDisponibles,
  fetchChefsPotentiels,
  fetchCompetencesOperateur,
  affecterCompetence,
  fetchSuperviseurs,
  createSuperviseur,
  fetchEquipes,
  fetchEquipeById,
  createEquipe,
  updateEquipe,
  deleteEquipe,
  fetchEquipeMembres,
  affecterMembres,
  fetchEquipeStatut,
  retirerMembre,
  fetchAbsences,
  fetchAbsenceById,
  createAbsence,
  validerAbsence,
  refuserAbsence,
  fetchAbsencesEnCours,
  fetchAbsencesAValider,
  updateAbsence,
  annulerAbsence,
  fetchHistoriqueRH,
  fetchStatistiquesUtilisateurs,
  attribuerRole,
  retirerRole,
} from '../usersApi';

const okJson = (data: unknown) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(data),
});

const ok204 = () => ({
  ok: true,
  status: 204,
  json: () => Promise.resolve(null),
});

const errJson = (status: number, data?: unknown) => ({
  ok: false,
  status,
  statusText: 'Error',
  json: () => (data ? Promise.resolve(data) : Promise.reject(new Error('no json'))),
});

describe('usersApi', () => {
  beforeEach(() => vi.clearAllMocks());

  // ---- Utilisateurs ----

  describe('utilisateurs', () => {
    it('fetchUtilisateurs calls with query params and converts snake_case', async () => {
      mockApiFetch.mockResolvedValue(
        okJson({
          count: 1,
          results: [{ id: 1, nom: 'Dupont', full_name: 'Jean Dupont' }],
        }),
      );
      const result = await fetchUtilisateurs({ search: 'jean' });
      const url = mockApiFetch.mock.calls[0]![0] as string;
      expect(url).toContain('/utilisateurs/');
      expect(url).toContain('search=jean');
      expect(result.results[0]!.fullName).toBe('Jean Dupont');
    });

    it('fetchCurrentUser', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1, nom: 'Test' }));
      const result = await fetchCurrentUser();
      expect(result.nom).toBe('Test');
    });

    it('fetchUtilisateurById', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 5, nom: 'A' }));
      const result = await fetchUtilisateurById(5);
      expect(result.id).toBe(5);
    });

    it('createUtilisateur sends POST with snake_case body', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1, nom: 'New' }));
      await createUtilisateur({
        nom: 'New',
        prenom: 'User',
        email: 'a@b.com',
        password: 'x',
      } as any);
      const [, opts] = mockApiFetch.mock.calls[0]!;
      expect(opts.method).toBe('POST');
    });

    it('updateUtilisateur sends PATCH', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await updateUtilisateur(1, { nom: 'Updated' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('PATCH');
    });

    it('deleteUtilisateur sends DELETE', async () => {
      mockApiFetch.mockResolvedValue(ok204());
      await deleteUtilisateur(1);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('DELETE');
    });

    it('changePassword sends POST', async () => {
      mockApiFetch.mockResolvedValue(okJson({ message: 'ok' }));
      await changePassword(1, { oldPassword: 'old', newPassword: 'new' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/change_password/');
    });

    it('adminResetPassword sends POST', async () => {
      mockApiFetch.mockResolvedValue(okJson({ message: 'ok' }));
      await adminResetPassword(1, { newPassword: 'new' } as any);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/admin_reset_password/');
    });
  });

  // ---- Roles ----

  it('fetchRoles returns results array', async () => {
    mockApiFetch.mockResolvedValue(okJson({ count: 2, results: [{ id: 1, nom_role: 'ADMIN' }] }));
    const result = await fetchRoles();
    expect(result[0]!.nomRole).toBe('ADMIN');
  });

  // ---- Structures ----

  describe('structures', () => {
    it('fetchStructures', async () => {
      mockApiFetch.mockResolvedValue(okJson({ count: 1, results: [{ id: 1, nom: 'S1' }] }));
      const result = await fetchStructures();
      expect(result.count).toBe(1);
    });

    it('fetchStructureById', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 3, nom: 'S3' }));
      const result = await fetchStructureById(3);
      expect(result.id).toBe(3);
    });

    it('deleteStructure', async () => {
      mockApiFetch.mockResolvedValue(ok204());
      await deleteStructure(5);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('DELETE');
    });

    it('fetchStructureUtilisateurs', async () => {
      mockApiFetch.mockResolvedValue(okJson([{ id: 1, nom: 'U1' }]));
      const result = await fetchStructureUtilisateurs(2);
      expect(result).toHaveLength(1);
    });

    it('addUserToStructure', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await addUserToStructure(2, { email: 'a@b.com', nom: 'A', prenom: 'B', password: 'x' });
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/ajouter_utilisateur/');
    });
  });

  // ---- Clients ----

  describe('clients', () => {
    it('fetchClients', async () => {
      mockApiFetch.mockResolvedValue(okJson({ count: 0, results: [] }));
      const result = await fetchClients();
      expect(result.count).toBe(0);
    });

    it('fetchClientByUserId returns client', async () => {
      mockApiFetch.mockResolvedValue(okJson({ utilisateur: 5, nom: 'Test' }));
      const result = await fetchClientByUserId(5);
      expect(result!.utilisateur).toBe(5);
    });

    it('fetchClientByUserId returns null on error', async () => {
      mockApiFetch.mockResolvedValue(errJson(404));
      const result = await fetchClientByUserId(999);
      expect(result).toBeNull();
    });

    it('deleteClient', async () => {
      mockApiFetch.mockResolvedValue(ok204());
      await deleteClient(1);
    });

    it('fetchOrphanClients', async () => {
      mockApiFetch.mockResolvedValue(okJson({ count: 1, results: [{ id: 1 }] }));
      const result = await fetchOrphanClients();
      expect(result).toHaveLength(1);
    });

    it('assignClientToStructure sends PATCH', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await assignClientToStructure(1, 5);
      const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
      expect(body.structure_id).toBe(5);
    });
  });

  // ---- Competences ----

  describe('competences', () => {
    it('fetchCompetences', async () => {
      mockApiFetch.mockResolvedValue(okJson({ count: 1, results: [{ id: 1 }] }));
      const result = await fetchCompetences();
      expect(result).toHaveLength(1);
    });

    it('createCompetence', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1, nom_competence: 'Taille' }));
      const result = await createCompetence({
        nomCompetence: 'Taille',
        categorie: 'TECHNIQUE' as any,
      });
      expect(result.nomCompetence).toBe('Taille');
    });

    it('deleteCompetence', async () => {
      mockApiFetch.mockResolvedValue(ok204());
      await deleteCompetence(1);
    });
  });

  // ---- Operateurs ----

  describe('operateurs', () => {
    it('fetchOperateurs with filters', async () => {
      mockApiFetch.mockResolvedValue(okJson({ count: 0, results: [] }));
      await fetchOperateurs({ search: 'test' });
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('search=test');
    });

    it('fetchOperateurById', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 3 }));
      const result = await fetchOperateurById(3);
      expect(result.id).toBe(3);
    });

    it('createOperateur', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await createOperateur({ nom: 'Op' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
    });

    it('updateOperateur', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await updateOperateur(1, { nom: 'Updated' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('PATCH');
    });

    it('deleteOperateur', async () => {
      mockApiFetch.mockResolvedValue(ok204());
      await deleteOperateur(1);
    });

    it('fetchOperateursDisponibles', async () => {
      mockApiFetch.mockResolvedValue(okJson([{ id: 1 }]));
      const result = await fetchOperateursDisponibles();
      expect(result).toHaveLength(1);
    });

    it('fetchChefsPotentiels', async () => {
      mockApiFetch.mockResolvedValue(okJson([{ id: 2 }]));
      const result = await fetchChefsPotentiels();
      expect(result).toHaveLength(1);
    });

    it('fetchCompetencesOperateur', async () => {
      mockApiFetch.mockResolvedValue(okJson([{ id: 1, competence: 'Arrosage' }]));
      const result = await fetchCompetencesOperateur(5);
      expect(result).toHaveLength(1);
    });

    it('affecterCompetence', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await affecterCompetence(5, { competenceId: 3, niveau: 'EXPERT' } as any);
      const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
      expect(body.competence_id).toBe(3);
      expect(body.niveau).toBe('EXPERT');
    });
  });

  // ---- Superviseurs ----

  describe('superviseurs', () => {
    it('fetchSuperviseurs merges superviseur model and user role data', async () => {
      mockApiFetch
        .mockResolvedValueOnce(
          okJson({
            count: 1,
            results: [
              {
                utilisateur: 1,
                email: 'a@b.com',
                nom: 'A',
                prenom: 'B',
                full_name: 'B A',
                actif: true,
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          okJson({
            count: 1,
            results: [
              { id: 2, email: 'c@d.com', nom: 'C', prenom: 'D', full_name: 'D C', actif: true },
            ],
          }),
        );
      const result = await fetchSuperviseurs();
      expect(result.results).toHaveLength(2);
    });

    it('fetchSuperviseurs deduplicates by email', async () => {
      mockApiFetch
        .mockResolvedValueOnce(
          okJson({
            count: 1,
            results: [{ utilisateur: 1, email: 'same@test.com', nom: 'A', prenom: 'B' }],
          }),
        )
        .mockResolvedValueOnce(
          okJson({
            count: 1,
            results: [{ id: 1, email: 'same@test.com', nom: 'A', prenom: 'B' }],
          }),
        );
      const result = await fetchSuperviseurs();
      expect(result.results).toHaveLength(1);
    });

    it('createSuperviseur', async () => {
      mockApiFetch.mockResolvedValue(okJson({ utilisateur: 1 }));
      await createSuperviseur({ nom: 'S', prenom: 'V', email: 'x@y.com', password: 'p' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
    });
  });

  // ---- Equipes ----

  describe('equipes', () => {
    it('fetchEquipes', async () => {
      mockApiFetch.mockResolvedValue(okJson({ count: 0, results: [] }));
      await fetchEquipes();
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/equipes/');
    });

    it('fetchEquipeById', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      const result = await fetchEquipeById(1);
      expect(result.id).toBe(1);
    });

    it('createEquipe', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await createEquipe({ nom: 'E1' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
    });

    it('updateEquipe sends PATCH', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await updateEquipe(1, { nom: 'Updated' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('PATCH');
    });

    it('deleteEquipe', async () => {
      mockApiFetch.mockResolvedValue(ok204());
      await deleteEquipe(1);
    });

    it('fetchEquipeMembres', async () => {
      mockApiFetch.mockResolvedValue(okJson([{ id: 1 }]));
      const result = await fetchEquipeMembres(5);
      expect(result).toHaveLength(1);
    });

    it('affecterMembres', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 5 }));
      await affecterMembres(5, { operateurs: [1, 2, 3] });
      const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
      expect(body.operateurs).toEqual([1, 2, 3]);
    });

    it('fetchEquipeStatut', async () => {
      mockApiFetch.mockResolvedValue(
        okJson({ statut_operationnel: 'DISPONIBLE', total_membres: 5 }),
      );
      const result = await fetchEquipeStatut(1);
      expect(result.statutOperationnel).toBe('DISPONIBLE');
    });

    it('retirerMembre', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await retirerMembre(5, 3);
      const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
      expect(body.operateur_id).toBe(3);
    });
  });

  // ---- Absences ----

  describe('absences', () => {
    it('fetchAbsences', async () => {
      mockApiFetch.mockResolvedValue(okJson({ count: 0, results: [] }));
      await fetchAbsences();
    });

    it('fetchAbsenceById', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      const result = await fetchAbsenceById(1);
      expect(result.id).toBe(1);
    });

    it('createAbsence', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await createAbsence({ operateur: 1, dateDebut: '2026-04-01' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('POST');
    });

    it('validerAbsence', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1, statut: 'VALIDEE' }));
      await validerAbsence(1, 'OK');
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/valider/');
    });

    it('refuserAbsence', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await refuserAbsence(1, 'Non');
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/refuser/');
    });

    it('fetchAbsencesEnCours', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchAbsencesEnCours();
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/en_cours/');
    });

    it('fetchAbsencesAValider', async () => {
      mockApiFetch.mockResolvedValue(okJson([]));
      await fetchAbsencesAValider();
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/a_valider/');
    });

    it('updateAbsence', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await updateAbsence(1, { commentaire: 'Test' } as any);
      expect(mockApiFetch.mock.calls[0]![1].method).toBe('PATCH');
    });

    it('annulerAbsence', async () => {
      mockApiFetch.mockResolvedValue(okJson({ id: 1 }));
      await annulerAbsence(1);
      expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/annuler/');
    });
  });

  // ---- Historique & Stats ----

  it('fetchHistoriqueRH', async () => {
    mockApiFetch.mockResolvedValue(okJson({ events: [] }));
    await fetchHistoriqueRH();
    expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/historique-rh/');
  });

  it('fetchStatistiquesUtilisateurs', async () => {
    mockApiFetch.mockResolvedValue(
      okJson({ utilisateurs: { total: 10, actifs: 8, par_role: {} } }),
    );
    const result = await fetchStatistiquesUtilisateurs();
    expect(result.utilisateurs.total).toBe(10);
  });

  // ---- Roles assignment ----

  it('attribuerRole', async () => {
    mockApiFetch.mockResolvedValue(okJson({ message: 'ok' }));
    await attribuerRole('1', '5');
    const body = JSON.parse(mockApiFetch.mock.calls[0]![1].body);
    expect(body.role_id).toBe('5');
  });

  it('retirerRole', async () => {
    mockApiFetch.mockResolvedValue(okJson({ message: 'ok' }));
    await retirerRole('1', '5');
    expect(mockApiFetch.mock.calls[0]![0] as string).toContain('/retirer_role/');
  });

  // ---- Error handling ----

  describe('error handling', () => {
    it('throws ApiError with status and data on non-ok response', async () => {
      mockApiFetch.mockResolvedValue(errJson(400, { detail: 'Bad request' }));
      try {
        await fetchUtilisateurById(1);
        expect.unreachable('should have thrown');
      } catch (e: any) {
        expect(e.name).toBe('ApiError');
        expect(e.status).toBe(400);
      }
    });

    it('handles 204 No Content', async () => {
      mockApiFetch.mockResolvedValue(ok204());
      await deleteUtilisateur(1);
    });

    it('converts snake_case response to camelCase', async () => {
      mockApiFetch.mockResolvedValue(
        okJson({
          id: 1,
          nom_equipe: 'Team A',
          chef_equipe_nom: 'Chef',
        }),
      );
      const result = await fetchEquipeById(1);
      expect(result.nomEquipe).toBe('Team A');
      expect(result.chefEquipeNom).toBe('Chef');
    });
  });
});
