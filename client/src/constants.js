// In production, prioritize the environment variable and ensure /api is present
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Remove trailing slash if present, then ensure it ends with /api
export const API_URL = rawApiUrl.replace(/\/$/, '').endsWith('/api')
    ? rawApiUrl.replace(/\/$/, '')
    : `${rawApiUrl.replace(/\/$/, '')}/api`;

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
