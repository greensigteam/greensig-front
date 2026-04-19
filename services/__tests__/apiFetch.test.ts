import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import {
  apiFetch,
  hasExistingToken,
  clearAuthTokens,
  AUTH_LOGOUT_EVENT,
  API_FORBIDDEN_EVENT,
} from '../api';

describe('hasExistingToken', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when no token', () => {
    expect(hasExistingToken()).toBe(false);
  });

  it('returns true when token exists', () => {
    localStorage.setItem('token', 'abc123');
    expect(hasExistingToken()).toBe(true);
  });
});

describe('clearAuthTokens', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes token, refreshToken, and user from localStorage', () => {
    localStorage.setItem('token', 'abc');
    localStorage.setItem('refreshToken', 'def');
    localStorage.setItem('user', '{"id":1}');

    clearAuthTokens();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('dispatches AUTH_LOGOUT_EVENT', () => {
    const handler = vi.fn();
    window.addEventListener(AUTH_LOGOUT_EVENT, handler);

    clearAuthTokens();

    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_LOGOUT_EVENT, handler);
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('injects Authorization header from localStorage token', async () => {
    localStorage.setItem('token', 'test-token');

    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    await apiFetch('/api/test/');

    const fetchCall = (globalThis.fetch as Mock).mock.calls[0]!;
    expect(fetchCall[1].headers['Authorization']).toBe('Bearer test-token');
  });

  it('sets Content-Type to application/json by default', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    await apiFetch('/api/test/');

    const fetchCall = (globalThis.fetch as Mock).mock.calls[0]!;
    expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
  });

  it('does not set Content-Type for FormData body', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const formData = new FormData();
    formData.append('file', 'test');

    await apiFetch('/api/upload/', { method: 'POST', body: formData });

    const fetchCall = (globalThis.fetch as Mock).mock.calls[0]!;
    expect(fetchCall[1].headers['Content-Type']).toBeUndefined();
  });

  it('attempts token refresh on 401 and retries', async () => {
    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('refreshToken', 'valid-refresh');

    const fetchMock = vi.spyOn(globalThis, 'fetch');

    // First call: 401
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    // Refresh call: success
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ access: 'new-token', refresh: 'new-refresh' }), {
        status: 200,
      }),
    );
    // Retry call: success
    fetchMock.mockResolvedValueOnce(new Response('{"data":"ok"}', { status: 200 }));

    const response = await apiFetch('/api/protected/');

    expect(response.status).toBe(200);
    expect(localStorage.getItem('token')).toBe('new-token');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('clears tokens when refresh fails', async () => {
    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('refreshToken', 'bad-refresh');

    const fetchMock = vi.spyOn(globalThis, 'fetch');

    // First call: 401
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    // Refresh call: fails
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));

    const logoutHandler = vi.fn();
    window.addEventListener(AUTH_LOGOUT_EVENT, logoutHandler);

    await apiFetch('/api/protected/');

    expect(localStorage.getItem('token')).toBeNull();
    expect(logoutHandler).toHaveBeenCalled();

    window.removeEventListener(AUTH_LOGOUT_EVENT, logoutHandler);
  });

  it('emits API_FORBIDDEN_EVENT on 403', async () => {
    localStorage.setItem('token', 'valid-token');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Accès interdit' }), { status: 403 }),
    );

    const handler = vi.fn();
    window.addEventListener(API_FORBIDDEN_EVENT, handler);

    await apiFetch('/api/admin-only/');

    expect(handler).toHaveBeenCalledOnce();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.url).toBe('/api/admin-only/');
    expect(detail.message).toBe('Accès interdit');

    window.removeEventListener(API_FORBIDDEN_EVENT, handler);
  });

  it('clears tokens when no refresh token available on 401', async () => {
    localStorage.setItem('token', 'expired-token');
    // No refresh token set

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 401 }));

    const logoutHandler = vi.fn();
    window.addEventListener(AUTH_LOGOUT_EVENT, logoutHandler);

    await apiFetch('/api/protected/');

    expect(localStorage.getItem('token')).toBeNull();
    expect(logoutHandler).toHaveBeenCalled();

    window.removeEventListener(AUTH_LOGOUT_EVENT, logoutHandler);
  });
});
