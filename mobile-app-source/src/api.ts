export const API_BASE = 'https://nguyenron.com/fuehrerschein-backend/api';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isAuthError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    const randomPart = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    id = 'ios-' + randomPart;
    localStorage.setItem('device_id', id);
  }
  return id;
}

const sleep = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

function friendlyNetworkMessage() {
  return 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.';
}

export async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const url = new URL(API_BASE + '/' + path.replace(/^\//, ''));

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...((options.headers as Record<string, string> | undefined) || {})
  };

  // Không đưa token vào URL để tránh token xuất hiện trong log, lịch sử hoặc proxy.
  if (token) headers.Authorization = `Bearer ${token}`;

  const maxAttempts = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url.toString(), {
        ...options,
        headers,
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        const error = new ApiError(data.message || `HTTP ${res.status}`, res.status);
        // Lỗi xác thực / dữ liệu đầu vào không nên retry.
        if (res.status >= 400 && res.status < 500) throw error;
        lastError = error;
      } else {
        return data;
      }
    } catch (error:any) {
      if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }
      lastError = error?.name === 'AbortError'
        ? new ApiError('Kết nối máy chủ quá thời gian. Vui lòng thử lại.')
        : new ApiError(error?.message || friendlyNetworkMessage());
    } finally {
      window.clearTimeout(timeout);
    }

    if (attempt < maxAttempts) {
      await sleep(350 * attempt);
    }
  }

  if (lastError instanceof ApiError) throw lastError;
  throw new ApiError(friendlyNetworkMessage());
}
