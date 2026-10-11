const rawBackend = import.meta.env.VITE_BACKEND_SERVER
  ? import.meta.env.VITE_BACKEND_SERVER.replace(/\/+$/, '')
  : '';

export const API_BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE == 'remote'
    ? (rawBackend ? `${rawBackend}/api/` : '/api/')
    : 'http://localhost:8888/api/';
export const BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE
    ? (rawBackend ? `${rawBackend}/` : '/')
    : 'http://localhost:8888/';

export const WEBSITE_URL = import.meta.env.PROD
  ? import.meta.env.VITE_WEBSITE_URL || 'http://cloud.idurarapp.com/'
  : 'http://localhost:3000/';
export const DOWNLOAD_BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE
    ? (rawBackend ? `${rawBackend}/download/` : '/download/')
    : 'http://localhost:8888/download/';
export const ACCESS_TOKEN_NAME = 'x-auth-token';

export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL
  ? import.meta.env.VITE_FILE_BASE_URL.replace(/\/+$/, '') + '/'
  : rawBackend
  ? `${rawBackend}/`
  : 'http://localhost:8888/';

//  console.log(
//    '🚀 Welcome to IDURAR ERP CRM! Did you know that we also offer commercial customization services? Contact us at hello@idurarapp.com for more information.'
//  );
