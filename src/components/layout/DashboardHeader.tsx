import { Badge, Button, Card, Flex, Heading, Section, Text } from '@radix-ui/themes'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { ReactNode } from 'react'
import { AccessUser, AppRoute } from '../../types/app'
import { DashboardNavigation } from './DashboardNavigation'

const panelMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
}

const pageMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -18 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
}

type DashboardHeaderProps = {
  currentUser: AccessUser
  route: AppRoute
  isRouteSwitching: boolean
  onNavigate: (route: AppRoute) => void
  onLogout: () => void
  children: ReactNode
}

export function DashboardHeader({
  currentUser,
  route,
  isRouteSwitching,
  onNavigate,
  onLogout,
  children,
}: DashboardHeaderProps) {
  return (
    <main className="bo-page">
      <div className="bo-grid" />
      <Section size="1" className="bo-shell dashboard-shell">
        <motion.section className="dashboard-hero" {...panelMotion}>
          <Card className="hero-art-card dashboard-banner">
            <div className="dashboard-banner-copy">
              <div className="dashboard-topbar">
                <Badge size="3" radius="full" className="hero-kicker">
                  {route === '/admin' ? 'ADMIN PANEL' : 'MEMBER ACCOUNT'}
                </Badge>
                <DashboardNavigation
                  currentUser={currentUser}
                  route={route}
                  isRouteSwitching={isRouteSwitching}
                  onNavigate={onNavigate}
                />
              </div>

              <Flex justify="between" align="start" gap="4" wrap="wrap">
                <div>
                  <Heading size="8" className="dashboard-title">
                    {currentUser.fullName}
                  </Heading>
                  <Text as="p" size="3" className="overlay-body">
                    State ID {currentUser.stateId} - Rol {currentUser.role}
                  </Text>
                </div>

                <Button variant="soft" color="gray" size="3" onClick={onLogout}>
                  <LogOut size={16} />
                  Salir
                </Button>
              </Flex>
            </div>
          </Card>
        </motion.section>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={route} {...pageMotion}>
            {children}
          </motion.div>
        </AnimatePresence>
      </Section>
    </main>
  )
}
