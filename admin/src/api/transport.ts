import { toastT } from '../i18n/toastMessages';

const boot = () => window.FRKT_BOOT;

/** Build REST URLs for both pretty permalinks and ?rest_route= installations. */
export function restEndpoint(path: string): string {
  const [routePath, query = ''] = path.split('?', 2);
  const url = new URL(boot().root, document.baseURI);
  const suffix = routePath.replace(/^\/+/, '');

  if (url.searchParams.has('rest_route')) {
    const route = url.searchParams.get('rest_route') || '';
    url.searchParams.set('rest_route', `${route.replace(/\/+$/, '')}/${suffix}`);
  } else {
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/${suffix}`;
  }

  new URLSearchParams(query).forEach((value, key) => url.searchParams.append(key, value));
  return url.toString();
}

function currentNonce(): string {
  return String(boot()?.nonce || '');
}

function setNonce(next: string): void {
  const trimmed = String(next || '').trim();
  if (!trimmed || !window.FRKT_BOOT) return;
  window.FRKT_BOOT.nonce = trimmed;
}

function captureNonce(res: Response): void {
  const next = res.headers.get('X-WP-Nonce');
  if (next) setNonce(next);
}

function restNonceEndpoint(): string {
  const ajax =
    typeof (window as Window & { ajaxurl?: string }).ajaxurl === 'string'
      ? (window as Window & { ajaxurl?: string }).ajaxurl!
      : '';
  return ajax
    ? `${ajax}${ajax.includes('?') ? '&' : '?'}action=rest-nonce`
    : '/wp-admin/admin-ajax.php?action=rest-nonce';
}

async function refreshRestNonce(): Promise<string> {
  const res = await fetch(restNonceEndpoint(), {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const text = (await res.text()).trim();
  if (!res.ok || !text || text === '0' || text === '-1' || !/^[a-zA-Z0-9_-]{6,}$/.test(text)) {
    throw new Error(toastT('sessionExpired'));
  }
  setNonce(text);
  return text;
}

function isCookieNonceFailure(res: Response, body: { code?: string; message?: string }): boolean {
  return res.status === 403 &&
    (body.code === 'rest_cookie_invalid_nonce' || /cookie check failed/i.test(String(body.message || '')));
}

export async function request<T>(
  path: string,
  options: { method?: string; data?: unknown; signal?: AbortSignal } = {},
  didRefresh = false
): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = { 'X-WP-Nonce': currentNonce() };
  if (options.data !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(restEndpoint(path), {
    method,
    headers,
    body: options.data !== undefined ? JSON.stringify(options.data) : undefined,
    credentials: 'same-origin',
    signal: options.signal,
  });
  captureNonce(res);

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const body = json as { message?: string; code?: string; data?: { message?: string } };
    if (!didRefresh && !options.signal?.aborted && isCookieNonceFailure(res, body)) {
      await refreshRestNonce();
      return request<T>(path, options, true);
    }
    const message =
      (typeof body.message === 'string' && body.message.trim()) ||
      (typeof body.data?.message === 'string' && body.data.message.trim()) ||
      (typeof body.code === 'string' && body.code) ||
      boot().i18n?.error ||
      toastT('requestFailed');
    const error = new Error(message) as Error & { status?: number; code?: string };
    error.status = res.status;
    error.code = body.code;
    throw error;
  }
  return json as T;
}

export function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
  outerSignal?: AbortSignal
): Promise<T> {
  const ac = new AbortController();
  let timedOut = false;
  const onAbort = () => ac.abort();
  outerSignal?.addEventListener('abort', onAbort, { once: true });
  const timer = window.setTimeout(() => {
    timedOut = true;
    ac.abort();
  }, timeoutMs);

  return run(ac.signal)
    .catch((err: unknown) => {
      const aborted = err instanceof Error && (err.name === 'AbortError' || /abort/i.test(err.message));
      if (aborted && timedOut && !outerSignal?.aborted) throw new Error(timeoutMessage);
      throw err;
    })
    .finally(() => {
      window.clearTimeout(timer);
      outerSignal?.removeEventListener('abort', onAbort);
    });
}

export async function postFormData<T>(
  url: string,
  body: FormData,
  networkError: string,
  didRefresh = false
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'X-WP-Nonce': currentNonce() },
      body,
      credentials: 'same-origin',
    });
  } catch {
    throw new Error(networkError);
  }
  captureNonce(res);

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(
      text?.includes('<')
        ? toastT('requestFailedHtml', { status: res.status })
        : text?.slice(0, 180) || boot().i18n?.error || toastT('requestFailed')
    );
  }

  if (!res.ok) {
    if (!didRefresh && isCookieNonceFailure(res, json as { code?: string; message?: string })) {
      await refreshRestNonce();
      return postFormData<T>(url, body, networkError, true);
    }
    const data = json.data as { message?: string; details?: { message?: string } } | undefined;
    throw new Error(
      (typeof json.message === 'string' && json.message) ||
        data?.message ||
        data?.details?.message ||
        toastT('requestFailedHttp', { status: res.status })
    );
  }
  return json as T;
}
