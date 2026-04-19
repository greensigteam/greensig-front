import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import {
  apiFetch,
  clearAuthTokens,
  API_FORBIDDEN_EVENT,
  type ApiForbiddenEventDetail,
} from '../../services/api';
import { server } from '../mocks/server';

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'initial-token');
    localStorage.setItem('refreshToken', 'initial-refresh');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('injects the Authorization header from localStorage', async () => {
    let captured: string | null = null;
    server.use(
      http.get('/api/ping/', ({ request }) => {
        captured = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    const res = await apiFetch('/api/ping/');
    expect(res.ok).toBe(true);
    expect(captured).toBe('Bearer initial-token');
  });

  it('refreshes the token on 401 and retries the request', async () => {
    let calls = 0;
    server.use(
      http.get('/api/ping/', ({ request }) => {
        calls += 1;
        const auth = request.headers.get('authorization');
        if (auth === 'Bearer initial-token') {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ ok: true, retriedWith: auth });
      }),
    );

    const res = await apiFetch('/api/ping/');
    expect(res.ok).toBe(true);
    expect(calls).toBe(2);
    expect(localStorage.getItem('token')).toBe('refreshed-access-token');
  });

  it('deduplicates the refresh call when several requests hit 401 at once', async () => {
    let refreshCalls = 0;
    server.use(
      http.post('/api/token/refresh/', async () => {
        refreshCalls += 1;
        // simulate latency so parallel requests overlap
        await delay(50);
        return HttpResponse.json({ access: 'refreshed-access-token' });
      }),
      http.get('/api/multi/', ({ request }) => {
        const auth = request.headers.get('authorization');
        if (auth === 'Bearer initial-token') {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ ok: true });
      }),
    );

    const responses = await Promise.all([
      apiFetch('/api/multi/'),
      apiFetch('/api/multi/'),
      apiFetch('/api/multi/'),
      apiFetch('/api/multi/'),
      apiFetch('/api/multi/'),
    ]);

    for (const res of responses) expect(res.ok).toBe(true);
    expect(refreshCalls).toBe(1);
  });

  it('logs out when refresh fails (missing refresh token)', async () => {
    localStorage.removeItem('refreshToken');

    let logoutEmitted = false;
    const onLogout = () => {
      logoutEmitted = true;
    };
    window.addEventListener('auth:logout', onLogout, { once: true });

    server.use(http.get('/api/ping/', () => new HttpResponse(null, { status: 401 })));

    const res = await apiFetch('/api/ping/');
    expect(res.status).toBe(401);
    expect(logoutEmitted).toBe(true);
    expect(localStorage.getItem('token')).toBeNull();

    window.removeEventListener('auth:logout', onLogout);
  });

  it('emits api:forbidden on 403 with the backend error message', async () => {
    server.use(
      http.get('/api/forbidden/', () =>
        HttpResponse.json({ detail: 'Permission refusée — test' }, { status: 403 }),
      ),
    );

    let captured: ApiForbiddenEventDetail | null = null;
    const listener = (event: Event) => {
      captured = (event as CustomEvent<ApiForbiddenEventDetail>).detail;
    };
    window.addEventListener(API_FORBIDDEN_EVENT, listener, { once: true });

    const res = await apiFetch('/api/forbidden/');
    expect(res.status).toBe(403);
    expect(captured).not.toBeNull();
    expect(captured!.message).toBe('Permission refusée — test');
    expect(captured!.url).toBe('/api/forbidden/');

    window.removeEventListener(API_FORBIDDEN_EVENT, listener);
  });

  it('rejects when the request exceeds its abort signal', async () => {
    server.use(
      http.get('/api/slow/', async () => {
        await delay(100);
        return HttpResponse.json({ ok: true });
      }),
    );

    const controller = new AbortController();
    const promise = apiFetch('/api/slow/', { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toThrow();
  });

  it('does not set Content-Type when body is FormData', async () => {
    let capturedContentType: string | null = null;
    server.use(
      http.post('/api/upload/', ({ request }) => {
        capturedContentType = request.headers.get('content-type');
        return HttpResponse.json({ ok: true });
      }),
    );

    const fd = new FormData();
    fd.append('field', 'value');

    const res = await apiFetch('/api/upload/', { method: 'POST', body: fd });
    expect(res.ok).toBe(true);
    // Must be multipart/form-data (browser-set), not application/json.
    expect(capturedContentType).toMatch(/multipart\/form-data/);
  });

  it('clearAuthTokens wipes auth storage and emits auth:logout', () => {
    localStorage.setItem('user', 'anything');
    let emitted = false;
    const listener = () => {
      emitted = true;
    };
    window.addEventListener('auth:logout', listener, { once: true });

    clearAuthTokens();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(emitted).toBe(true);

    window.removeEventListener('auth:logout', listener);
  });
});
