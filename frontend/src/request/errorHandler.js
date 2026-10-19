import { notification } from 'antd';
import codeMessage from './codeMessage';

const errorHandler = (error) => {
  if (!navigator.onLine) {
    notification.config({
      duration: 15,
      maxCount: 1,
    });
    notification.error({
      message: 'No internet connection',
      description: 'Cannot connect to the Internet. Please check your network connection.',
    });
    return {
      success: false,
      result: null,
      message: 'Cannot connect to the Internet. Please check your network connection.',
    };
  }

  const { response } = error;

  if (!response) {
    const isTimeout =
      error.code === 'ECONNABORTED' ||
      (error.message && error.message.toLowerCase().includes('timeout'));

    const errorTitle = isTimeout ? 'Server Request Timed Out' : 'Cannot Connect to Server';
    const errorDesc = isTimeout
      ? 'The backend server took too long to respond (timeout 15s). The Render free tier instance may be waking up or database access is unreachable.'
      : 'Unable to reach the backend service. Check network connectivity or verify if the backend service is running.';

    notification.config({
      duration: 12,
      maxCount: 2,
    });
    notification.error({
      message: errorTitle,
      description: errorDesc,
    });
    return {
      success: false,
      result: null,
      message: errorDesc,
    };
  }

  if (response && response.data && response.data.jwtExpired) {
    const result = window.localStorage.getItem('auth');
    const jsonFile = window.localStorage.getItem('isLogout');
    const { isLogout } = (jsonFile && JSON.parse(jsonFile)) || false;
    window.localStorage.removeItem('auth');
    window.localStorage.removeItem('isLogout');
    if (result || isLogout) {
      window.location.href = '/logout';
    }
  }

  if (response && response.status) {
    const isHtml = typeof response.data === 'string' && response.data.includes('<');
    const message = (!isHtml && response.data && response.data.message) || null;

    let errorText = message || codeMessage[response.status];
    if (response.status === 502) {
      errorText = '502 Bad Gateway: Backend web service is unreachable or restarting on Render.';
    } else if (response.status === 503) {
      errorText = message || '503 Service Unavailable: Backend database connection is offline or reconnecting.';
    }

    notification.config({
      duration: 12,
      maxCount: 2,
    });
    notification.error({
      message: `Request error ${response.status}`,
      description: errorText || `Server responded with status ${response.status}`,
    });

    if (response?.data?.error?.name === 'JsonWebTokenError') {
      window.localStorage.removeItem('auth');
      window.localStorage.removeItem('isLogout');
      window.location.href = '/logout';
      return { success: false, result: null, message: errorText };
    }

    if (typeof response.data === 'object' && response.data !== null) {
      return response.data;
    }

    return {
      success: false,
      result: null,
      message: errorText || `Error ${response.status}`,
    };
  } else {
    notification.config({
      duration: 12,
      maxCount: 1,
    });
    notification.error({
      message: 'Problem connecting to server',
      description: error.message || 'Cannot connect to the server. Try again later.',
    });
    return {
      success: false,
      result: null,
      message: error.message || 'Cannot connect to the server. Try again later.',
    };
  }
};

export default errorHandler;
