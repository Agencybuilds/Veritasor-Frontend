export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(
    message: string,
    status: number,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = options.code
    this.details = options.details
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL
  if (!configured) return ''
  return configured.replace(/\/+$/, '')
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${baseUrl}${normalizedPath}`

  const headers = new Headers(init.headers)
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...init,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => '')

  if (!response.ok) {
    const errorBody =
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
    const message =
      (typeof errorBody?.message === 'string' && errorBody.message) ||
      (typeof errorBody?.error === 'string' && errorBody.error) ||
      (typeof payload === 'string' && payload.trim()) ||
      `Request failed with status ${response.status}`
    const code = typeof errorBody?.code === 'string' ? errorBody.code : undefined

    throw new ApiError(message, response.status, { code, details: payload })
  }

  return payload as T
}
