const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Resolve backend server URL from build-time environment variable
const envBackend =
  import.meta.env.VITE_BACKEND_SERVER ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_RAILWAY_URL ||
  '';

// Clean backend URL to prevent double '/api' prefixes and trailing slashes
const cleanBackend = envBackend
  ? envBackend.replace(/\/api\/?$/, '').replace(/\/+$/, '')
  : '';

// Use configured backend URL, or localhost in development, or relative path in production
const rawBackend = cleanBackend
  ? cleanBackend
  : (isLocalhost ? 'http://localhost:8888' : '');

export const API_BASE_URL = `${rawBackend}/api/`;

export const BASE_URL = `${rawBackend}/`;

export const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL
  ? import.meta.env.VITE_WEBSITE_URL.replace(/\/+$/, '') + '/'
  : (isLocalhost ? 'http://localhost:3000/' : '/');

export const DOWNLOAD_BASE_URL = `${rawBackend}/download/`;

export const ACCESS_TOKEN_NAME = 'x-auth-token';

export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL
  ? import.meta.env.VITE_FILE_BASE_URL.replace(/\/+$/, '') + '/'
  : `${rawBackend}/`;

//  console.log(
//    '🚀 Welcome to IDURAR ERP CRM! Did you know that we also offer commercial customization services? Contact us at hello@idurarapp.com for more information.'
//  );
