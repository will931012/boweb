import { AccessUser } from '../types/app'

const SESSION_STORAGE_KEY = 'bo-access-user'

export function readStoredUser() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY)
    return rawValue ? (JSON.parse(rawValue) as AccessUser) : null
  } catch {
    return null
  }
}

export function storeUserSession(user: AccessUser | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!user) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user))
}
