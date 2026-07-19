export const getBackendUrls = () => {
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    const wsUrl = envApiUrl.replace(/^http/, 'ws');
    return {
      apiBase: envApiUrl,
      wsBase: wsUrl
    };
  }
  
  if (import.meta.env.DEV) {
    // In development mode, backend is usually on port 8080 of the same host
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const apiBase = `${protocol}//${hostname}:8080`;
    const wsBase = apiBase.replace(/^http/, 'ws');
    return { apiBase, wsBase };
  } else {
    // In production, default to same origin if VITE_API_URL isn't set
    const apiBase = window.location.origin;
    const wsBase = apiBase.replace(/^http/, 'ws');
    return { apiBase, wsBase };
  }
};

export const { apiBase: API_BASE, wsBase: WS_BASE } = getBackendUrls();
