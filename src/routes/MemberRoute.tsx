import { Badge, Button, Card, Flex, Grid, Heading, Inset, Separator, Text } from '@radix-ui/themes'
import { motion } from 'framer-motion'
import { Banknote, CalendarDays, Wallet } from 'lucide-react'
import heroArt from '../../3356B985-EEDA-4D78-BE8D-1DD8A9293B2A.png'
import { FeedbackMessage } from '../components/common/FeedbackMessage'
import { AccountSummary, AccessUser, ContributionPayment } from '../types/app'
import { currencyFormatter, dateFormatter } from '../utils/format'

const panelMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
}

type MemberRouteProps = {
  currentUser: AccessUser
  account: AccountSummary | null
  recentPayments: ContributionPayment[]
  accountMessage: string
  accountError: string
  isLoadingAccount: boolean
  isRegisteringPayment: boolean
  onOpenContributionModal: () => void
}

export function MemberRoute({
  currentUser,
  account,
  recentPayments,
  accountMessage,
  accountError,
  isLoadingAccount,
  isRegisteringPayment,
  onOpenContributionModal,
}: MemberRouteProps) {
  return (
    <motion.section className="dashboard-layout" {...panelMotion}>
      <Card className="glow-card dashboard-account-card">
        <Flex direction="column" gap="5">
          <div>
            <Badge size="3" radius="full" className="hero-kicker">
              Cuenta semanal
            </Badge>
            <Heading size="8" className="access-title">
              Estado total y aporte de la semana.
            </Heading>
            <Text as="p" size="3" className="access-copy">
              Abre el popup para registrar aporte semanal y dinero extra. Ambos quedaran
              pendientes hasta que el admin los apruebe.
            </Text>
          </div>

          {accountError ? <FeedbackMessage tone="error" message={accountError} /> : null}
          {accountMessage ? <FeedbackMessage tone="success" message={accountMessage} /> : null}

          <Grid columns={{ initial: '1', md: '3' }} gap="3">
            <Card className="mini-info-card account-stat-card">
              <span className="section-icon">
                <Wallet size={18} />
              </span>
              <strong>{account ? currencyFormatter.format(account.globalTotalContributed) : '$0.00'}</strong>
              <p>estado de cuenta total aprobado.</p>
            </Card>

            <Card className="mini-info-card account-stat-card">
              <span className="section-icon">
                <Banknote size={18} />
              </span>
              <strong>{account?.paymentCount ?? 0}</strong>
              <p>aportes aprobados registrados hasta hoy.</p>
            </Card>

            <Card className="mini-info-card account-stat-card">
              <span className="section-icon">
                <CalendarDays size={18} />
              </span>
              <strong>{account?.currentWeekKey ?? 'Sin semana'}</strong>
              <p>
                {account?.currentWeekStatus === 'approved'
                  ? 'la semana actual ya tiene aporte semanal aprobado.'
                  : account?.currentWeekStatus === 'pending'
                    ? 'la semana actual tiene una cuota pendiente de aprobacion.'
                    : 'la semana actual todavia no tiene aporte semanal.'}
              </p>
            </Card>
          </Grid>

          <Flex direction={{ initial: 'column', sm: 'row' }} gap="3">
            <Button
              size="4"
              className="weekly-pay-button"
              disabled={isLoadingAccount || isRegisteringPayment}
              onClick={onOpenContributionModal}
            >
              {isRegisteringPayment ? 'Registrando...' : 'Dar dinero'}
            </Button>

            <Card className="mini-info-card account-aside-card">
              <strong>Aporte semanal fijo</strong>
              <p>
                {account
                  ? currencyFormatter.format(account.weeklyContributionAmount)
                  : currencyFormatter.format(5000)}
              </p>
            </Card>
          </Flex>

          <Separator size="4" />

          <Grid columns={{ initial: '1', md: '2' }} gap="4">
            <Card className="mini-info-card recent-payments-card">
              <strong>Movimientos recientes</strong>
              <div className={`payment-list ${isLoadingAccount ? 'is-loading' : ''}`} aria-busy={isLoadingAccount}>
                {isLoadingAccount ? (
                  <>
                    <div className="payment-row skeleton-row" />
                    <div className="payment-row skeleton-row" />
                    <div className="payment-row skeleton-row" />
                  </>
                ) : recentPayments.length ? (
                  recentPayments.map((payment) => (
                    <div key={`${payment.kind}-${payment.id}`} className="payment-row">
                      <div>
                        <span>
                          {payment.label} - {payment.weekKey} - {payment.status}
                        </span>
                        <small>{dateFormatter.format(new Date(payment.paidAt))}</small>
                      </div>
                      <strong>{currencyFormatter.format(payment.amount)}</strong>
                    </div>
                  ))
                ) : (
                  <p>No hay movimientos registrados todavia.</p>
                )}
              </div>
            </Card>

            <Card className="mini-info-card recent-payments-card">
              <strong>Estado del miembro</strong>
              <div className={`member-summary ${isLoadingAccount ? 'is-loading' : ''}`} aria-busy={isLoadingAccount}>
                <div>
                  <span>Ultimo pago aprobado</span>
                  <p>
                    {account?.lastPaymentAt
                      ? dateFormatter.format(new Date(account.lastPaymentAt))
                      : 'Todavia no hay pagos aprobados'}
                  </p>
                </div>
                <div>
                  <span>Usuario</span>
                  <p>{currentUser.fullName}</p>
                </div>
                <div>
                  <span>State ID</span>
                  <p>{currentUser.stateId}</p>
                </div>
              </div>
            </Card>
          </Grid>
        </Flex>
      </Card>

      <Card className="hero-art-card dashboard-art-card">
        <Inset clip="padding-box" side="all" pb="current">
          <img src={heroArt} alt="Graffiti Black Oaths" className="hero-art" />
        </Inset>
        <div className="art-overlay-copy">
          <Badge size="3" radius="full" className="hero-kicker">
            Weekly Control
          </Badge>
          <Heading size="8" className="overlay-title">
            Caja semanal.
          </Heading>
          <Text as="p" size="3" className="overlay-body">
            Todos los aportes quedan pendientes hasta la aprobacion del admin.
          </Text>
        </div>
      </Card>
    </motion.section>
  )
}
