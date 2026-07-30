import { Badge, Button, Card, Flex, Grid, Heading, Text, TextField } from '@radix-ui/themes'
import { motion } from 'framer-motion'
import { Banknote, ReceiptText, ShieldCheck, Wallet } from 'lucide-react'
import { FeedbackMessage } from '../components/common/FeedbackMessage'
import {
  AccountSummary,
  AdminExpense,
  AdminMemberTotal,
  AdminPendingContribution,
  AccessUser,
} from '../types/app'
import { currencyFormatter, dateFormatter } from '../utils/format'

const panelMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
}

type AdminRouteProps = {
  currentUser: AccessUser
  account: AccountSummary | null
  adminMembers: AdminMemberTotal[]
  pendingApprovals: AdminPendingContribution[]
  adminExpenses: AdminExpense[]
  accountMessage: string
  accountError: string
  expenseAmount: string
  expenseReason: string
  isLoadingAdminTable: boolean
  isLoadingAdminApprovals: boolean
  isLoadingAdminExpenses: boolean
  isRegisteringExpense: boolean
  resendingExpenseId: number | null
  reviewingContributionKey: string | null
  onReviewContribution: (contribution: AdminPendingContribution, action: 'approve' | 'deny') => void
  onExpenseAmountChange: (value: string) => void
  onExpenseReasonChange: (value: string) => void
  onExpenseSubmit: () => void
  onResendExpenseMessage: (expenseId: number) => void
}

export function AdminRoute({
  currentUser,
  account,
  adminMembers,
  pendingApprovals,
  adminExpenses,
  accountMessage,
  accountError,
  expenseAmount,
  expenseReason,
  isLoadingAdminTable,
  isLoadingAdminApprovals,
  isLoadingAdminExpenses,
  isRegisteringExpense,
  resendingExpenseId,
  reviewingContributionKey,
  onReviewContribution,
  onExpenseAmountChange,
  onExpenseReasonChange,
  onExpenseSubmit,
  onResendExpenseMessage,
}: AdminRouteProps) {
  if (currentUser.role !== 'admin') {
    return (
      <motion.section {...panelMotion}>
        <Card className="glow-card dashboard-account-card">
          <p className="hero-error">Solo el rol admin puede entrar a esta pagina.</p>
        </Card>
      </motion.section>
    )
  }

  return (
    <motion.section className="admin-layout" {...panelMotion}>
      <Card className="glow-card dashboard-account-card">
        <Flex direction="column" gap="5">
          <div>
            <Badge size="3" radius="full" className="hero-kicker">
              Admin approvals
            </Badge>
            <Heading size="8" className="access-title">
              Gastos, aprobaciones y control general.
            </Heading>
            <Text as="p" size="3" className="access-copy">
              Aqui el admin puede aprobar aportes, registrar gastos y revisar el balance actual.
            </Text>
          </div>

          {accountError ? <FeedbackMessage tone="error" message={accountError} /> : null}
          {accountMessage ? <FeedbackMessage tone="success" message={accountMessage} /> : null}

          <Grid columns={{ initial: '1', md: '4' }} gap="3">
            <Card className="mini-info-card account-stat-card">
              <span className="section-icon">
                <Wallet size={18} />
              </span>
              <strong>{account ? currencyFormatter.format(account.globalTotalContributed) : '$0.00'}</strong>
              <p>total aprobado entre todos los usuarios.</p>
            </Card>

            <Card className="mini-info-card account-stat-card">
              <span className="section-icon">
                <ReceiptText size={18} />
              </span>
              <strong>{account ? currencyFormatter.format(account.totalExpenses) : '$0.00'}</strong>
              <p>gastos declarados por administracion.</p>
            </Card>

            <Card className="mini-info-card account-stat-card">
              <span className="section-icon">
                <Banknote size={18} />
              </span>
              <strong>{account ? currencyFormatter.format(account.availableBalance) : '$0.00'}</strong>
              <p>balance disponible despues de descontar gastos.</p>
            </Card>

            <Card className="mini-info-card account-stat-card">
              <span className="section-icon">
                <ShieldCheck size={18} />
              </span>
              <strong>{pendingApprovals.length}</strong>
              <p>aportes pendientes esperando revision del admin.</p>
            </Card>
          </Grid>

          <Grid columns={{ initial: '1', lg: '2' }} gap="4">
            <Card className="mini-info-card recent-payments-card">
              <strong>Declarar gasto</strong>
              <div className="expense-form">
                <label>
                  <span>Cantidad</span>
                  <TextField.Root
                    size="3"
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenseAmount}
                    onChange={(event) => onExpenseAmountChange(event.target.value)}
                    placeholder="150.00"
                  />
                </label>

                <label>
                  <span>Motivo</span>
                  <TextField.Root
                    size="3"
                    value={expenseReason}
                    onChange={(event) => onExpenseReasonChange(event.target.value)}
                    placeholder="Compra de material, gasolina, evento..."
                  />
                </label>

                <Button size="3" disabled={isRegisteringExpense} onClick={onExpenseSubmit}>
                  {isRegisteringExpense ? 'Guardando...' : 'Registrar gasto'}
                </Button>
              </div>
            </Card>

            <Card className="mini-info-card recent-payments-card">
              <strong>Gastos recientes</strong>
              <div className={`payment-list ${isLoadingAdminExpenses ? 'is-loading' : ''}`} aria-busy={isLoadingAdminExpenses}>
                {isLoadingAdminExpenses ? (
                  <>
                    <div className="payment-row skeleton-row" />
                    <div className="payment-row skeleton-row" />
                  </>
                ) : adminExpenses.length ? (
                  adminExpenses.map((expense) => (
                    <div key={expense.id} className="payment-row">
                      <div>
                        <span>{expense.reason}</span>
                        <small>
                          {expense.createdByName} - {dateFormatter.format(new Date(expense.createdAt))}
                        </small>
                        <div className="expense-resend-action">
                          <Button
                            size="1"
                            variant="soft"
                            disabled={resendingExpenseId === expense.id}
                            onClick={() => onResendExpenseMessage(expense.id)}
                          >
                            {resendingExpenseId === expense.id ? 'Enviando...' : 'Enviar mensaje'}
                          </Button>
                        </div>
                      </div>
                      <strong>{currencyFormatter.format(expense.amount)}</strong>
                    </div>
                  ))
                ) : (
                  <p>No hay gastos registrados todavia.</p>
                )}
              </div>
            </Card>
          </Grid>

          <Card className="mini-info-card recent-payments-card">
            <strong>Aportes pendientes</strong>
            <div className={`admin-table ${isLoadingAdminApprovals ? 'is-loading' : ''}`} aria-busy={isLoadingAdminApprovals}>
              <div className="admin-table-row admin-table-head admin-approval-row">
                <span>User name</span>
                <span>State ID</span>
                <span>Tipo</span>
                <span>Semana</span>
                <span>Monto</span>
                <span>Acciones</span>
              </div>

              {isLoadingAdminApprovals ? (
                <>
                  <div className="admin-table-row admin-approval-row admin-approval-row-wide skeleton-row" />
                  <div className="admin-table-row admin-approval-row admin-approval-row-wide skeleton-row" />
                </>
              ) : pendingApprovals.length ? (
                pendingApprovals.map((contribution) => {
                  const contributionKey = `${contribution.kind}-${contribution.id}`
                  return (
                    <div key={contributionKey} className="admin-table-row admin-approval-row admin-approval-row-wide">
                      <span>{contribution.userName}</span>
                      <span>{contribution.stateId}</span>
                      <span>{contribution.label}</span>
                      <span>{contribution.weekKey}</span>
                      <strong>{currencyFormatter.format(contribution.amount)}</strong>
                      <div className="admin-actions">
                        <Button
                          size="2"
                          color="green"
                          disabled={reviewingContributionKey === contributionKey}
                          onClick={() => onReviewContribution(contribution, 'approve')}
                        >
                          Aceptar
                        </Button>
                        <Button
                          size="2"
                          color="red"
                          variant="soft"
                          disabled={reviewingContributionKey === contributionKey}
                          onClick={() => onReviewContribution(contribution, 'deny')}
                        >
                          Denegar
                        </Button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p>No hay aportes pendientes.</p>
              )}
            </div>
          </Card>

          <Card className="mini-info-card recent-payments-card">
            <strong>Tabla administrativa</strong>
            <div className={`admin-table ${isLoadingAdminTable ? 'is-loading' : ''}`} aria-busy={isLoadingAdminTable}>
              <div className="admin-table-row admin-table-head">
                <span>User name</span>
                <span>State ID</span>
                <span>Total aported</span>
              </div>

              {isLoadingAdminTable ? (
                <>
                  <div className="admin-table-row skeleton-row" />
                  <div className="admin-table-row skeleton-row" />
                  <div className="admin-table-row skeleton-row" />
                </>
              ) : adminMembers.length ? (
                adminMembers.map((member) => (
                  <div key={member.id} className="admin-table-row">
                    <span>{member.userName}</span>
                    <span>{member.stateId}</span>
                    <strong>{currencyFormatter.format(member.totalAported)}</strong>
                  </div>
                ))
              ) : (
                <p>No hay miembros para mostrar todavia.</p>
              )}
            </div>
          </Card>
        </Flex>
      </Card>
    </motion.section>
  )
}
