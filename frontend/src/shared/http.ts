// JSON requests to the Phoenix API with the page's CSRF token.

export const csrfToken = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    /** The response body (usually `{ errors: … }` or `{ error: … }`). */
    readonly data: Record<string, unknown>,
  ) {
    super(`HTTP ${status}`);
  }
}

/** Sends JSON, returns the parsed JSON body; non-2xx responses throw HttpError with the body. */
export async function requestJson<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new HttpError(response.status, data);
  return data as T;
}
