let nextId = 1;
const uid = () => nextId++;

type Role = 'ADMIN' | 'SUPERVISEUR' | 'CLIENT';

export interface UserFactory {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_staff: boolean;
  is_active: boolean;
}

export function makeUser(overrides: Partial<UserFactory> = {}): UserFactory {
  const id = overrides.id ?? uid();
  return {
    id,
    username: `user${id}@greensig.test`,
    email: `user${id}@greensig.test`,
    first_name: 'Test',
    last_name: `User${id}`,
    role: 'SUPERVISEUR',
    is_staff: false,
    is_active: true,
    ...overrides,
  };
}

export function makeAdmin(overrides: Partial<UserFactory> = {}): UserFactory {
  return makeUser({ role: 'ADMIN', is_staff: true, ...overrides });
}

export function makeSuperviseur(overrides: Partial<UserFactory> = {}): UserFactory {
  return makeUser({ role: 'SUPERVISEUR', ...overrides });
}

export function makeClient(overrides: Partial<UserFactory> = {}): UserFactory {
  return makeUser({ role: 'CLIENT', ...overrides });
}

export interface SiteFactory {
  id: number;
  nom: string;
  client: number | null;
  surface: number;
  geometry: { type: 'Polygon'; coordinates: number[][][] };
}

export function makeSite(overrides: Partial<SiteFactory> = {}): SiteFactory {
  const id = overrides.id ?? uid();
  return {
    id,
    nom: `Site ${id}`,
    client: null,
    surface: 1000,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        ],
      ],
    },
    ...overrides,
  };
}

export interface EquipeFactory {
  id: number;
  nom_equipe: string;
  chef_equipe: number | null;
  superviseur: number | null;
  membres: number[];
}

export function makeEquipe(overrides: Partial<EquipeFactory> = {}): EquipeFactory {
  const id = overrides.id ?? uid();
  return {
    id,
    nom_equipe: `Equipe ${id}`,
    chef_equipe: null,
    superviseur: null,
    membres: [],
    ...overrides,
  };
}

export interface TacheFactory {
  id: number;
  titre: string;
  description: string;
  statut: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE' | 'REPORTEE';
  priorite: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';
  date_debut_planifiee: string;
  date_fin_planifiee: string;
  site: number | null;
  equipe: number | null;
  distributions_charge: unknown[];
}

export function makeTache(overrides: Partial<TacheFactory> = {}): TacheFactory {
  const id = overrides.id ?? uid();
  return {
    id,
    titre: `Tache ${id}`,
    description: '',
    statut: 'PLANIFIEE',
    priorite: 'MOYENNE',
    date_debut_planifiee: '2026-01-01T08:00:00Z',
    date_fin_planifiee: '2026-01-01T17:00:00Z',
    site: null,
    equipe: null,
    distributions_charge: [],
    ...overrides,
  };
}

export interface ReclamationFactory {
  id: number;
  titre: string;
  description: string;
  statut: 'NOUVELLE' | 'EN_COURS' | 'EN_ATTENTE_VALIDATION_CLOTURE' | 'CLOTUREE' | 'REJETEE';
  client: number | null;
  site: number | null;
  date_creation: string;
  auto_cloturee: boolean;
}

export function makeReclamation(overrides: Partial<ReclamationFactory> = {}): ReclamationFactory {
  const id = overrides.id ?? uid();
  return {
    id,
    titre: `Reclamation ${id}`,
    description: '',
    statut: 'NOUVELLE',
    client: null,
    site: null,
    date_creation: '2026-01-01T08:00:00Z',
    auto_cloturee: false,
    ...overrides,
  };
}

export interface DistributionChargeFactory {
  id: number;
  tache: number;
  equipe: number | null;
  date_debut: string;
  date_fin: string;
  charge: number;
  statut: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE' | 'REPORTEE';
}

export function makeDistributionCharge(
  overrides: Partial<DistributionChargeFactory> = {},
): DistributionChargeFactory {
  const id = overrides.id ?? uid();
  return {
    id,
    tache: 1,
    equipe: null,
    date_debut: '2026-01-01T08:00:00Z',
    date_fin: '2026-01-01T17:00:00Z',
    charge: 1,
    statut: 'A_FAIRE',
    ...overrides,
  };
}

export function resetFactoryIds() {
  nextId = 1;
}
