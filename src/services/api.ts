// Custom Fetch-based API Client for SMO IT CORE

const getDynamicApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return `http://${currentHost}:5006/api/v1`;
    }
  }
  return envUrl || `http://${currentHost}:5006/api/v1`;
};

export const API_BASE_URL = getDynamicApiUrl();

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('smo_token');
  
  // Setup headers
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Set JSON Content-Type unless we're sending FormData (which sets its own boundary)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Construct URL with query parameters cleanly
  const cleanBaseUrl = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  let url = `${cleanBaseUrl}${cleanPath}`;
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryStr = searchParams.toString();
    if (queryStr) {
      url += `?${queryStr}`;
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // If 401 Unauthorized, automatically log out
    if (response.status === 401) {
      localStorage.removeItem('smo_token');
      localStorage.removeItem('smo_user');
      window.dispatchEvent(new Event('auth_change'));
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: Ha ocurrido un error inesperado`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText || 'Error inesperado'}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText || 'Error de conexión o formato'}`;
      }
      throw new Error(errorMessage);
    }

    // For 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json() as T;
  } catch (error: any) {
    console.error(`API Error on ${path}:`, error);
    throw error;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => 
    request<T>(path, { ...options, method: 'GET' }),
    
  post: <T>(path: string, body?: any, options?: RequestOptions) => 
    request<T>(path, { 
      ...options, 
      method: 'POST', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
    
  put: <T>(path: string, body?: any, options?: RequestOptions) => 
    request<T>(path, { 
      ...options, 
      method: 'PUT', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),

  patch: <T>(path: string, body?: any, options?: RequestOptions) => 
    request<T>(path, { 
      ...options, 
      method: 'PATCH', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
    
  delete: <T>(path: string, options?: RequestOptions) => 
    request<T>(path, { ...options, method: 'DELETE' }),
};
