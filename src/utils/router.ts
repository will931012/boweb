import { AppRoute } from '../types/app'

export function getCurrentRoute(): AppRoute {
  if (typeof window === 'undefined') {
    return '/'
  }

  return window.location.pathname === '/admin' ? '/admin' : '/'
}

export function pushRoute(currentRoute: AppRoute, nextRoute: AppRoute, onChange: (route: AppRoute) => void) {
  if (typeof window === 'undefined' || currentRoute === nextRoute) {
    return
  }

  window.history.pushState({}, '', nextRoute)
  onChange(nextRoute)
}
