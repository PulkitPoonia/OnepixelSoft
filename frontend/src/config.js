/**
 * Central configuration for the Onepixel frontend.
 * This file provides a single source of truth for API URLs and other settings.
 */

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.match(/^192\.168\./)
);

export const API_BASE = import.meta.env.VITE_API_BASE || 
  (isLocalhost ? 'http://localhost:4000' : 'https://onepixelsoft.onrender.com');

// For backwards compatibility or specific use cases
export const API_URL = API_BASE;

console.log('🚀 [CONFIG] API Base URL:', API_BASE);
