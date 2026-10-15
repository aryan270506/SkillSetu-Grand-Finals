// Backend location. Override with EXPO_PUBLIC_API_ORIGIN (e.g. http://192.168.1.10:8000)
// when running on a device that cannot reach 127.0.0.1.
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN || 'http://127.0.0.1:8000';
export const API_BASE = `${API_ORIGIN}/api/v1`;
