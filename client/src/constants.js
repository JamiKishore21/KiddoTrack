// In production, the backend might be on a different domain
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Socket URL is typically the same as the base backend URL
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
