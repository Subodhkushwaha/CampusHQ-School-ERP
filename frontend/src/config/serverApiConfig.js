const rawBackend = import.meta.env.VITE_BACKEND_SERVER
  ? import.meta.env.VITE_BACKEND_SERVER.replace(/\/+$/, '')
  : '';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = rawBackend
  ? `${rawBackend}/api/`
  : (isLocalhost ? 'http://localhost:8888/api/' : '/api/');

export const BASE_URL = rawBackend
  ? `${rawBackend}/`
  : (isLocalhost ? 'http://localhost:8888/' : '/');

export const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL
  ? import.meta.env.VITE_WEBSITE_URL.replace(/\/+$/, '') + '/'
  : (isLocalhost ? 'http://localhost:3000/' : '/');

export const DOWNLOAD_BASE_URL = rawBackend
  ? `${rawBackend}/download/`
  : (isLocalhost ? 'http://localhost:8888/download/' : '/download/');

export const ACCESS_TOKEN_NAME = 'x-auth-token';

export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL
  ? import.meta.env.VITE_FILE_BASE_URL.replace(/\/+$/, '') + '/'
  : (rawBackend ? `${rawBackend}/` : (isLocalhost ? 'http://localhost:8888/' : '/'));

//  console.log(
//    '🚀 Welcome to IDURAR ERP CRM! Did you know that we also offer commercial customization services? Contact us at hello@idurarapp.com for more information.'
//  );
