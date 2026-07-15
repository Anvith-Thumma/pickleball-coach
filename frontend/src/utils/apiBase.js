// Falls back to '' (relative paths) when VITE_API_URL is unset, which keeps
// local dev working unchanged through Vite's /api proxy (vite.config.js).
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}
