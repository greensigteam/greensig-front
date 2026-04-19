import { ApiError } from './api';
export { ApiError };

export function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      const value = obj[key];
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[snakeKey] = camelToSnake(value as Record<string, unknown>);
      } else {
        result[snakeKey] = value;
      }
    }
  }
  return result;
}

export function snakeToCamel<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => snakeToCamel(item)) as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = snakeToCamel((obj as Record<string, unknown>)[key]);
      }
    }
    return result as T;
  }
  return obj as T;
}

export function buildQueryParams(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      params.append(snakeKey, String(value));
    }
  }
  return params.toString();
}

export async function fetchApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await import('./api').then((m) =>
    m.apiFetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }),
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ApiError(response.statusText, response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();
  return snakeToCamel<T>(data);
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const USERS_API_URL = `${API_BASE_URL}/users`;
