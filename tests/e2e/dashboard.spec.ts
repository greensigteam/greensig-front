import { expect, test, Page } from '@playwright/test';

/**
 * Pré-injecte un token + un mock de /api/users/me/ pour atterrir directement
 * sur /dashboard sans passer par le formulaire de login.
 */
async function authenticateAs(page: Page, role: 'ADMIN' | 'SUPERVISEUR') {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-access');
    localStorage.setItem('refreshToken', 'test-refresh');
  });

  await page.route('**/api/users/me/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        email: `${role.toLowerCase()}@greensig.test`,
        nom: 'User',
        prenom: 'Test',
        full_name: 'Test User',
        actif: true,
        derniere_connexion: null,
        date_creation: '2026-01-01T00:00:00Z',
        roles: [role],
        ...(role === 'SUPERVISEUR' ? { superviseur_id: 1, equipes_gerees: [] } : {}),
      }),
    });
  });

  await page.route('**/api/**', async (route) => {
    if (route.request().url().includes('/api/users/me/')) {
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

test.describe('Dashboard smoke', () => {
  test('ADMIN dashboard mounts without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await authenticateAs(page, 'ADMIN');
    await page.goto('/dashboard');

    // L'app monte (pas de redirection vers /login)
    await expect(page).toHaveURL(/\/dashboard/);

    // Filter expected noise (404s on stub endpoints, websocket warnings, etc.)
    const real = errors.filter(
      (e) =>
        !e.includes('Failed to load resource') &&
        !e.includes('WebSocket') &&
        !e.includes('favicon'),
    );
    expect(real, `Erreurs JS inattendues : \n${real.join('\n')}`).toEqual([]);
  });
});
