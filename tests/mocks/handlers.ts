import { http, HttpResponse } from 'msw';

const API_BASE = '/api';

export const defaultUser = {
  id: 1,
  username: 'admin@greensig.test',
  email: 'admin@greensig.test',
  first_name: 'Admin',
  last_name: 'Test',
  role: 'ADMIN',
  is_staff: true,
};

export const handlers = [
  http.post(`${API_BASE}/token/`, async ({ request }) => {
    const body = (await request.json()) as { username?: string };
    const username = body?.username ?? defaultUser.username;
    let role: 'ADMIN' | 'SUPERVISEUR' | 'CLIENT' = 'ADMIN';
    if (username.includes('superviseur')) role = 'SUPERVISEUR';
    else if (username.includes('client')) role = 'CLIENT';
    return HttpResponse.json({
      access: 'test-access-token',
      refresh: 'test-refresh-token',
      user: { ...defaultUser, username, email: username, role },
    });
  }),

  http.post(`${API_BASE}/token/refresh/`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { refresh?: string };
    if (!body?.refresh) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({ access: 'refreshed-access-token' });
  }),

  http.get(`${API_BASE}/users/me/`, () => HttpResponse.json(defaultUser)),

  http.get(`${API_BASE}/sites/`, () =>
    HttpResponse.json({
      count: 0,
      next: null,
      previous: null,
      results: { type: 'FeatureCollection', features: [] },
    }),
  ),

  http.get(`${API_BASE}/taches/`, () => HttpResponse.json([])),

  http.get(`${API_BASE}/reclamations/`, () =>
    HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
  ),

  http.get(`${API_BASE}/inventory/`, () => HttpResponse.json({ count: 0, results: [] })),

  http.get(`${API_BASE}/statistics/`, () =>
    HttpResponse.json({
      vegetation: {},
      hydraulique: {},
      interventions: {},
    }),
  ),

  http.get(`${API_BASE}/kpis/`, () => HttpResponse.json({ kpis: [] })),

  http.get(`${API_BASE}/equipes/`, () => HttpResponse.json({ count: 0, results: [] })),

  http.get(`${API_BASE}/utilisateurs/`, () => HttpResponse.json({ count: 0, results: [] })),

  http.get(`${API_BASE}/superviseurs/`, () => HttpResponse.json({ count: 0, results: [] })),

  http.get(`${API_BASE}/operateurs/`, () => HttpResponse.json({ count: 0, results: [] })),

  http.get(`${API_BASE}/roles/`, () =>
    HttpResponse.json([
      { id: 1, nom: 'ADMIN' },
      { id: 2, nom: 'SUPERVISEUR' },
      { id: 3, nom: 'CLIENT' },
    ]),
  ),
];
