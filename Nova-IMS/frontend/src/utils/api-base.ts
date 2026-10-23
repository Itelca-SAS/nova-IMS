import { environment } from '../environments/environment';
import { trimTrailingSlashes } from './text-match';

export function apiBaseUrl(): string {
  return trimTrailingSlashes(String(environment.apiUrl || ''));
}

export function apiUrl(path: string): string {
  const base = apiBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export function socketUrl(): string {
  const base = apiBaseUrl();
  if (base) return base;
  if (globalThis.window !== undefined) return globalThis.window.location.origin;
  return 'http://localhost:3000';
}
