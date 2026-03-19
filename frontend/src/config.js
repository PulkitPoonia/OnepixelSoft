/**
 * Central configuration for the Onepixel frontend.
 * This file provides a single source of truth for API URLs and other settings.
 */

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// For backwards compatibility or specific use cases
export const API_URL = API_BASE;

console.log('🚀 [CONFIG] API Base URL:', API_BASE);
