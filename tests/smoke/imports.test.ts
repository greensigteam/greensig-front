import { describe, expect, it } from 'vitest';

describe('module imports', () => {
  it('core types module loads', async () => {
    const mod = await import('../../types');
    expect(mod).toBeDefined();
  });

  it('constants module loads', async () => {
    const mod = await import('../../constants');
    expect(mod).toBeDefined();
  });

  it('api service loads with auth helpers', async () => {
    const mod = await import('../../services/api');
    expect(typeof mod.apiFetch).toBe('function');
    expect(typeof mod.clearAuthTokens).toBe('function');
    expect(mod.API_FORBIDDEN_EVENT).toBe('api:forbidden');
  });

  it('query client config loads', async () => {
    const mod = await import('../../lib/queryClient');
    expect(mod).toBeDefined();
  });

  it('query keys hierarchy loads', async () => {
    const mod = await import('../../lib/queryKeys');
    expect(mod.queryKeys).toBeDefined();
  });
});
