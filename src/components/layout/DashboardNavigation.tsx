import { Button } from '@radix-ui/themes'
import { AppRoute, AccessUser } from '../../types/app'

type DashboardNavigationProps = {
  currentUser: AccessUser
  route: AppRoute
  isRouteSwitching: boolean
  onNavigate: (route: AppRoute) => void
}

export function DashboardNavigation({
  currentUser,
  route,
  isRouteSwitching,
  onNavigate,
}: DashboardNavigationProps) {
  return (
    <div className="dashboard-nav">
      <Button
        variant={route === '/' ? 'solid' : 'soft'}
        size="2"
        disabled={route === '/' || isRouteSwitching}
        onClick={() => onNavigate('/')}
      >
        Mi cuenta
      </Button>
      {currentUser.role === 'admin' ? (
        <Button
          variant={route === '/admin' ? 'solid' : 'soft'}
          size="2"
          disabled={route === '/admin' || isRouteSwitching}
          onClick={() => onNavigate('/admin')}
        >
          Admin
        </Button>
      ) : null}
    </div>
  )
}
