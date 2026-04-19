import { useMemo } from 'react';
import { User, Role } from '../types';

/**
 * Interface pour les ressources avec propriété superviseur
 * (Sites, Tâches assignées à un superviseur, etc.)
 */
interface SupervisedResource {
  superviseur?: number | null;
  superviseur_id?: number | null;
}

/**
 * Interface pour les ressources liées à une structure client
 */
interface StructureResource {
  structure_client?: number | null;
  structure_client_id?: number | null;
}

/**
 * Interface pour les ressources liées à un site
 */
interface SiteResource {
  site?: number | { id: number } | null;
  site_id?: number | null;
}

/**
 * Permissions object returned by usePermissions hook
 */
export interface Permissions {
  // Role checks
  isAdmin: boolean;
  isSuperviseur: boolean;
  isClient: boolean;
  role: Role | null;

  // General action permissions
  canImport: boolean;
  canExport: boolean;
  canEditGeometry: boolean; // Opérations géométriques (simplify, merge, split, buffer)
  canAccessAdmin: boolean;
  canManageUsers: boolean;
  canManageStructures: boolean;

  // Sites
  canCreateSite: boolean;
  canEditSite: (site: SupervisedResource) => boolean;
  canDeleteSite: (site: SupervisedResource) => boolean;
  canViewSite: (site: SupervisedResource & StructureResource) => boolean;

  // Teams / Équipes
  canCreateTeam: boolean;
  canEditTeam: (team: SupervisedResource & SiteResource) => boolean;
  canDeleteTeam: (team: SupervisedResource & SiteResource) => boolean;

  // Operators / Opérateurs
  canCreateOperateur: boolean;
  canEditOperateur: (operateur: SupervisedResource) => boolean;
  canDeleteOperateur: (operateur: SupervisedResource) => boolean;

  // Tasks / Tâches
  canCreateTask: boolean;
  canEditTask: (task: SiteResource & SupervisedResource) => boolean;
  canDeleteTask: (task: SiteResource & SupervisedResource) => boolean;
  canValidateTask: boolean;

  // Reclamations
  canCreateReclamation: boolean;
  canEditReclamation: (reclamation: {
    createur?: number | string;
    site?: SupervisedResource;
  }) => boolean;
  canDeleteReclamation: (reclamation: { createur?: number | string }) => boolean;

  // Absences
  canCreateAbsence: boolean;
  canValidateAbsence: (absence: { operateur?: SupervisedResource | number | null }) => boolean;

  // Reporting
  canAccessReporting: boolean;
  canAccessMonthlyReport: boolean;

  // Inventory
  canCreateInventoryItem: boolean;
  canEditInventoryItem: (item: SiteResource) => boolean;
  canDeleteInventoryItem: (item: SiteResource) => boolean;

  // Helper to check if user owns/supervises a site
  ownsSite: (site: SupervisedResource) => boolean;
  ownsStructure: (resource: StructureResource) => boolean;
}

/**
 * Extended user info that might come from the API with additional details
 */
interface ExtendedUserInfo {
  superviseur_id?: number;
  client_structure_id?: number;
}

/**
 * Hook to get permissions based on user role
 *
 * Usage:
 * ```tsx
 * const { isAdmin, canCreateTask, canEditSite } = usePermissions(user);
 *
 * if (canEditSite(selectedSite)) {
 *   // Show edit button
 * }
 * ```
 *
 * @param user - The current user object
 * @param extendedInfo - Optional extended user info (superviseur_id, client_structure_id)
 * @returns Permissions object with role checks and action permissions
 */
export function usePermissions(user: User | null, extendedInfo?: ExtendedUserInfo): Permissions {
  return useMemo(() => {
    const role = user?.role ?? null;
    const isAdmin = role === 'ADMIN';
    const isSuperviseur = role === 'SUPERVISEUR';
    const isClient = role === 'CLIENT';
    const userId = user?.id ? parseInt(user.id, 10) : null;
    const superviseurId = extendedInfo?.superviseur_id;
    const clientStructureId = extendedInfo?.client_structure_id;

    // Helper functions for ownership checks
    const ownsSite = (site: SupervisedResource): boolean => {
      if (!site) return false;
      if (isAdmin) return true;
      if (isSuperviseur && superviseurId) {
        const siteSuperviseur = site.superviseur ?? site.superviseur_id;
        return siteSuperviseur === superviseurId;
      }
      return false;
    };

    const ownsStructure = (resource: StructureResource): boolean => {
      if (!resource) return false;
      if (isAdmin) return true;
      if (isClient && clientStructureId) {
        const structureId = resource.structure_client ?? resource.structure_client_id;
        return structureId === clientStructureId;
      }
      return false;
    };

    const ownsViaSupervision = (resource: SupervisedResource): boolean => {
      if (!resource) return false;
      if (isAdmin) return true;
      if (isSuperviseur && superviseurId) {
        const resourceSuperviseur = resource.superviseur ?? resource.superviseur_id;
        return resourceSuperviseur === superviseurId;
      }
      return false;
    };

    return {
      // Role checks
      isAdmin,
      isSuperviseur,
      isClient,
      role,

      // General action permissions
      canImport: isAdmin, // Seul ADMIN peut importer des données GIS
      canExport: isAdmin || isSuperviseur || isClient, // Tous les rôles peuvent exporter (données filtrées par structure pour CLIENT)
      canEditGeometry: isAdmin || isSuperviseur, // Opérations géométriques
      canAccessAdmin: isAdmin,
      canManageUsers: isAdmin,
      canManageStructures: isAdmin,

      // Sites
      canCreateSite: isAdmin,
      canEditSite: (site) => {
        if (isAdmin) return true;
        if (isSuperviseur) return ownsSite(site);
        return false;
      },
      canDeleteSite: (_site) => {
        if (isAdmin) return true;
        // SUPERVISEUR cannot delete sites, only ADMIN
        return false;
      },
      canViewSite: (site) => {
        if (isAdmin) return true;
        if (isSuperviseur) return ownsSite(site);
        if (isClient) return ownsStructure(site);
        return false;
      },

      // Teams / Équipes
      canCreateTeam: isAdmin,
      canEditTeam: (team) => {
        if (isAdmin) return true;
        // SUPERVISEUR can edit teams on their supervised sites
        if (isSuperviseur) return ownsViaSupervision(team);
        return false;
      },
      canDeleteTeam: (_team) => {
        if (isAdmin) return true;
        return false;
      },

      // Operators / Opérateurs
      canCreateOperateur: isAdmin,
      canEditOperateur: (operateur) => {
        if (isAdmin) return true;
        if (isSuperviseur) return ownsViaSupervision(operateur);
        return false;
      },
      canDeleteOperateur: (_operateur) => {
        if (isAdmin) return true;
        return false;
      },

      // Tasks / Tâches
      canCreateTask: isAdmin || isSuperviseur,
      canEditTask: (task) => {
        if (isAdmin) return true;
        if (isSuperviseur) {
          // Check if task is on a supervised site
          return ownsViaSupervision(task);
        }
        return false;
      },
      canDeleteTask: (task) => {
        if (isAdmin) return true;
        if (isSuperviseur) return ownsViaSupervision(task);
        return false;
      },
      canValidateTask: isAdmin,

      // Reclamations
      canCreateReclamation: true, // All authenticated users can create
      canEditReclamation: (reclamation) => {
        if (isAdmin) return true;
        if (isSuperviseur && reclamation.site) {
          return ownsViaSupervision(reclamation.site);
        }
        // Creator can edit their own reclamation
        if (reclamation.createur && userId) {
          const createurId =
            typeof reclamation.createur === 'string'
              ? parseInt(reclamation.createur, 10)
              : reclamation.createur;
          return createurId === userId;
        }
        return false;
      },
      canDeleteReclamation: (reclamation) => {
        if (isAdmin) return true;
        // Only creator or admin can delete
        if (reclamation.createur && userId) {
          const createurId =
            typeof reclamation.createur === 'string'
              ? parseInt(reclamation.createur, 10)
              : reclamation.createur;
          return createurId === userId;
        }
        return false;
      },

      // Absences
      canCreateAbsence: isAdmin || isSuperviseur,
      canValidateAbsence: (absence) => {
        if (isAdmin) return true;
        if (isSuperviseur && absence.operateur && typeof absence.operateur === 'object') {
          return ownsViaSupervision(absence.operateur);
        }
        return false;
      },

      // Reporting
      canAccessReporting: isAdmin || isSuperviseur,
      canAccessMonthlyReport: isAdmin,

      // Inventory
      canCreateInventoryItem: isAdmin || isSuperviseur,
      canEditInventoryItem: (_item) => {
        if (isAdmin) return true;
        if (isSuperviseur) {
          // Would need to check site supervision
          // For now, allow if user is superviseur
          return true;
        }
        return false;
      },
      canDeleteInventoryItem: (_item) => {
        if (isAdmin) return true;
        if (isSuperviseur) return true;
        return false;
      },

      // Helper functions
      ownsSite,
      ownsStructure,
    };
  }, [user, extendedInfo]);
}

/**
 * Simple permission check without user context
 * Useful for quick inline checks
 */
export function checkPermission(role: Role | null, allowedRoles: Role[]): boolean {
  if (!role) return false;
  return allowedRoles.includes(role);
}

/**
 * Check if user is at least one of the specified roles
 */
export function hasAnyRole(user: User | null, roles: Role[]): boolean {
  if (!user?.role) return false;
  return roles.includes(user.role);
}

/**
 * Check if user has admin privileges
 */
export function isAdminUser(user: User | null): boolean {
  return user?.role === 'ADMIN';
}

/**
 * Get display label for a role
 */
export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    ADMIN: 'Administrateur',
    SUPERVISEUR: 'Superviseur',
    CLIENT: 'Client',
  };
  return labels[role] || role;
}

export default usePermissions;
