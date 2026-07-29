export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init)
  const data = (await response.json()) as T & { ok?: boolean; message?: string }

  if (!response.ok || data.ok === false) {
    throw new Error(data.message ?? 'No se pudo completar la solicitud.')
  }

  return data
}
