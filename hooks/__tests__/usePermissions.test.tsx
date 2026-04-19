import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  checkPermission,
  getRoleLabel,
  hasAnyRole,
  isAdminUser,
  usePermissions,
} from '../usePermissions';
import type { Role, User } from '../../types';

const makeUser = (role: Role, id = '1'): User => ({
  id,
  name: `${role} user`,
  email: `${role.toLowerCase()}@example.com`,
  role,
});

describe('usePermissions — role flags', () => {
  it('returns null role and false flags when user is null', () => {
    const { result } = renderHook(() => usePermissions(null));
    expect(result.current.role).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSuperviseur).toBe(false);
    expect(result.current.isClient).toBe(false);
  });

  it.each([
    ['ADMIN', 'isAdmin'],
    ['SUPERVISEUR', 'isSuperviseur'],
    ['CLIENT', 'isClient'],
  ] as const)('sets %s flag for role %s', (role, flag) => {
    const { result } = renderHook(() => usePermissions(makeUser(role)));
    expect(result.current[flag]).toBe(true);
    expect(result.current.role).toBe(role);
  });
});

describe('usePermissions — global action flags', () => {
  it('only ADMIN can import / access admin / manage users', () => {
    const admin = renderHook(() => usePermissions(makeUser('ADMIN'))).result.current;
    const sup = renderHook(() => usePermissions(makeUser('SUPERVISEUR'))).result.current;
    const client = renderHook(() => usePermissions(makeUser('CLIENT'))).result.current;

    expect(admin.canImport).toBe(true);
    expect(sup.canImport).toBe(false);
    expect(client.canImport).toBe(false);

    expect(admin.canAccessAdmin).toBe(true);
    expect(sup.canAccessAdmin).toBe(false);
    expect(admin.canManageUsers).toBe(true);
    expect(sup.canManageUsers).toBe(false);
  });

  it('every authenticated role can export', () => {
    for (const role of ['ADMIN', 'SUPERVISEUR', 'CLIENT'] as const) {
      const { result } = renderHook(() => usePermissions(makeUser(role)));
      expect(result.current.canExport).toBe(true);
    }
  });

  it('only ADMIN and SUPERVISEUR can edit geometry / access reporting / create tasks', () => {
    const admin = renderHook(() => usePermissions(makeUser('ADMIN'))).result.current;
    const sup = renderHook(() => usePermissions(makeUser('SUPERVISEUR'))).result.current;
    const client = renderHook(() => usePermissions(makeUser('CLIENT'))).result.current;

    expect(admin.canEditGeometry).toBe(true);
    expect(sup.canEditGeometry).toBe(true);
    expect(client.canEditGeometry).toBe(false);

    expect(sup.canAccessReporting).toBe(true);
    expect(client.canAccessReporting).toBe(false);

    expect(sup.canCreateTask).toBe(true);
    expect(client.canCreateTask).toBe(false);

    // Monthly report is admin-only
    expect(sup.canAccessMonthlyReport).toBe(false);
    expect(admin.canAccessMonthlyReport).toBe(true);
  });
});

describe('usePermissions — site resource checks', () => {
  const site = { superviseur: 42 };
  const otherSite = { superviseur: 99 };

  it('ADMIN can edit/view/delete any site', () => {
    const { result } = renderHook(() => usePermissions(makeUser('ADMIN')));
    expect(result.current.canEditSite(site)).toBe(true);
    expect(result.current.canDeleteSite(site)).toBe(true);
    expect(result.current.canViewSite(site)).toBe(true);
  });

  it('SUPERVISEUR can only edit/view their own sites (by superviseur id)', () => {
    const { result } = renderHook(() =>
      usePermissions(makeUser('SUPERVISEUR'), { superviseur_id: 42 }),
    );
    expect(result.current.canEditSite(site)).toBe(true);
    expect(result.current.canEditSite(otherSite)).toBe(false);
    expect(result.current.canViewSite(site)).toBe(true);
    // SUPERVISEUR cannot delete sites at all
    expect(result.current.canDeleteSite(site)).toBe(false);
  });

  it('falls back to superviseur_id field when superviseur is missing', () => {
    const { result } = renderHook(() =>
      usePermissions(makeUser('SUPERVISEUR'), { superviseur_id: 7 }),
    );
    expect(result.current.ownsSite({ superviseur_id: 7 })).toBe(true);
    expect(result.current.ownsSite({ superviseur_id: 8 })).toBe(false);
  });

  it('CLIENT can view site via matching client_structure_id', () => {
    const { result } = renderHook(() =>
      usePermissions(makeUser('CLIENT'), { client_structure_id: 5 }),
    );
    expect(result.current.canViewSite({ structure_client: 5 })).toBe(true);
    expect(result.current.canViewSite({ structure_client: 6 })).toBe(false);
    // CLIENT cannot edit or delete
    expect(result.current.canEditSite({ superviseur: null })).toBe(false);
    expect(result.current.canDeleteSite({ superviseur: null })).toBe(false);
  });

  it('ownsStructure falls back to structure_client_id field', () => {
    const { result } = renderHook(() =>
      usePermissions(makeUser('CLIENT'), { client_structure_id: 5 }),
    );
    expect(result.current.ownsStructure({ structure_client_id: 5 })).toBe(true);
    expect(result.current.ownsStructure({ structure_client_id: 6 })).toBe(false);
  });
});

describe('usePermissions — reclamation checks', () => {
  it('creator (matching userId) can edit and delete their own reclamation', () => {
    const { result } = renderHook(() => usePermissions(makeUser('CLIENT', '3')));
    expect(result.current.canEditReclamation({ createur: 3 })).toBe(true);
    expect(result.current.canDeleteReclamation({ createur: 3 })).toBe(true);
  });

  it('accepts stringified createur id', () => {
    const { result } = renderHook(() => usePermissions(makeUser('CLIENT', '3')));
    expect(result.current.canEditReclamation({ createur: '3' })).toBe(true);
  });

  it('non-creator non-admin cannot edit/delete', () => {
    const { result } = renderHook(() => usePermissions(makeUser('CLIENT', '3')));
    expect(result.current.canEditReclamation({ createur: 9 })).toBe(false);
    expect(result.current.canDeleteReclamation({ createur: 9 })).toBe(false);
  });

  it('SUPERVISEUR can edit reclamation on a supervised site', () => {
    const { result } = renderHook(() =>
      usePermissions(makeUser('SUPERVISEUR', '1'), { superviseur_id: 42 }),
    );
    expect(result.current.canEditReclamation({ site: { superviseur: 42 } })).toBe(true);
    expect(result.current.canEditReclamation({ site: { superviseur: 99 } })).toBe(false);
  });
});

describe('usePermissions — absence validation', () => {
  it('ADMIN can always validate', () => {
    const { result } = renderHook(() => usePermissions(makeUser('ADMIN')));
    expect(result.current.canValidateAbsence({ operateur: 1 })).toBe(true);
    expect(result.current.canValidateAbsence({ operateur: null })).toBe(true);
  });

  it('SUPERVISEUR validates only when absence.operateur is an object under their supervision', () => {
    const { result } = renderHook(() =>
      usePermissions(makeUser('SUPERVISEUR'), { superviseur_id: 42 }),
    );
    expect(result.current.canValidateAbsence({ operateur: { superviseur: 42 } })).toBe(true);
    expect(result.current.canValidateAbsence({ operateur: { superviseur: 99 } })).toBe(false);
    // Bare id is NOT enough — requires full object
    expect(result.current.canValidateAbsence({ operateur: 42 })).toBe(false);
  });

  it('CLIENT cannot validate absences', () => {
    const { result } = renderHook(() => usePermissions(makeUser('CLIENT')));
    expect(result.current.canValidateAbsence({ operateur: { superviseur: 1 } })).toBe(false);
  });
});

describe('usePermissions — misc resource permissions', () => {
  it('canCreateReclamation is always true', () => {
    for (const role of ['ADMIN', 'SUPERVISEUR', 'CLIENT'] as const) {
      const { result } = renderHook(() => usePermissions(makeUser(role)));
      expect(result.current.canCreateReclamation).toBe(true);
    }
  });

  it('canValidateTask is admin-only', () => {
    expect(renderHook(() => usePermissions(makeUser('ADMIN'))).result.current.canValidateTask).toBe(
      true,
    );
    expect(
      renderHook(() => usePermissions(makeUser('SUPERVISEUR'))).result.current.canValidateTask,
    ).toBe(false);
  });

  it('SUPERVISEUR can edit/delete inventory items without site ownership check', () => {
    const { result } = renderHook(() =>
      usePermissions(makeUser('SUPERVISEUR'), { superviseur_id: 1 }),
    );
    expect(result.current.canEditInventoryItem({ site: 99 })).toBe(true);
    expect(result.current.canDeleteInventoryItem({ site: 99 })).toBe(true);
  });
});

describe('checkPermission / hasAnyRole / isAdminUser / getRoleLabel', () => {
  it('checkPermission returns false for null role', () => {
    expect(checkPermission(null, ['ADMIN'])).toBe(false);
  });

  it('checkPermission returns true only when role is in list', () => {
    expect(checkPermission('SUPERVISEUR', ['SUPERVISEUR', 'ADMIN'])).toBe(true);
    expect(checkPermission('CLIENT', ['ADMIN'])).toBe(false);
  });

  it('hasAnyRole handles null user and role matching', () => {
    expect(hasAnyRole(null, ['ADMIN'])).toBe(false);
    expect(hasAnyRole(makeUser('ADMIN'), ['ADMIN', 'SUPERVISEUR'])).toBe(true);
    expect(hasAnyRole(makeUser('CLIENT'), ['ADMIN'])).toBe(false);
  });

  it('isAdminUser only returns true for ADMIN', () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(makeUser('CLIENT'))).toBe(false);
    expect(isAdminUser(makeUser('ADMIN'))).toBe(true);
  });

  it('getRoleLabel returns French labels', () => {
    expect(getRoleLabel('ADMIN')).toBe('Administrateur');
    expect(getRoleLabel('SUPERVISEUR')).toBe('Superviseur');
    expect(getRoleLabel('CLIENT')).toBe('Client');
  });
});
