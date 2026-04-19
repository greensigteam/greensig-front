import { expect, test, Page } from '@playwright/test';

/**
 * Mocke /api/token/ et /api/users/me/ avec un payload conforme au backend
 * (champ `roles` array, pas `role` scalaire). Les autres requêtes API sont
 * stubées avec une liste vide pour éviter que le dashboard ne reste bloqué
 * sur un fetch lent.
 */
async function mockBackend(
  page: Page,
  options: { roles: Array<'ADMIN' | 'SUPERVISEUR' | 'CLIENT'>; email?: string },
) {
  const email = options.email ?? `${options.roles[0]?.toLowerCase()}@greensig.test`;

  await page.route('**/api/token/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access: 'test-access', refresh: 'test-refresh' }),
    });
  });

  await page.route('**/api/users/me/', async (route) => {
    const body: Record<string, unknown> = {
      id: 1,
      email,
      nom: 'User',
      prenom: 'Test',
      full_name: 'Test User',
      actif: true,
      derniere_connexion: null,
      date_creation: '2026-01-01T00:00:00Z',
      roles: options.roles,
    };
    if (options.roles.includes('SUPERVISEUR')) {
      body.superviseur_id = 1;
      body.equipes_gerees = [];
    }
    if (options.roles.includes('CLIENT')) {
      body.client_id = 1;
      body.client_structure_id = 1;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/token/') || url.includes('/api/users/me/')) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 0, results: [] }),
    });
  });
}

/** Le LoadingScreen vidéo s'affiche ~2.3s avant que le formulaire de login ne monte. */
const LOGIN_TIMEOUT = 15_000;

test.describe('Login smoke', () => {
  test('login page renders form fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: LOGIN_TIMEOUT });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('SUPERVISEUR login mounts the app shell with admin nav', async ({ page }) => {
    await mockBackend(page, { roles: ['SUPERVISEUR'] });
    await page.goto('/');

    // Attend que le LoadingScreen vidéo se termine et que le formulaire monte.
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: LOGIN_TIMEOUT });

    // Onglet SUPERVISEUR
    await page.getByRole('button', { name: 'SUPERVISEUR', exact: true }).click();
    await page.locator('input[type="email"]').fill('sup@greensig.test');
    await page.locator('input[type="password"]').fill('password');
    await page.getByRole('button', { name: /accéder au portail/i }).click();

    // Le formulaire disparaît (login validé) et la nav superviseur (Sites, RH, Planification…) monte.
    await expect(page.locator('input[type="email"]')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByRole('link', { name: /gestion des sites/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('link', { name: /^planification/i })).toBeVisible();
  });

  test('CLIENT login mounts the client portal', async ({ page }) => {
    await mockBackend(page, { roles: ['CLIENT'] });
    await page.goto('/');

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: LOGIN_TIMEOUT });

    await page.getByRole('button', { name: 'CLIENT', exact: true }).click();
    await page.locator('input[type="email"]').fill('client@greensig.test');
    await page.locator('input[type="password"]').fill('password');
    await page.getByRole('button', { name: /accéder au portail/i }).click();

    // Le formulaire disparaît : authentification réussie, le portail client est monté.
    await expect(page.locator('input[type="email"]')).toHaveCount(0, { timeout: 10_000 });
  });

  test('login with wrong selected role surfaces an error', async ({ page }) => {
    // Backend renvoie CLIENT, mais l'utilisateur sélectionne ADMIN
    await mockBackend(page, { roles: ['CLIENT'] });
    await page.goto('/');

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: LOGIN_TIMEOUT });

    await page.getByRole('button', { name: 'ADMIN', exact: true }).click();
    await page.locator('input[type="email"]').fill('client@greensig.test');
    await page.locator('input[type="password"]').fill('password');
    await page.getByRole('button', { name: /accéder au portail/i }).click();

    // Reste sur la page de login
    await expect(page.getByText(/n'avez pas accès/i)).toBeVisible({ timeout: 5_000 });
    await expect(page).not.toHaveURL(/\/dashboard|\/client\/map/);
  });
});
