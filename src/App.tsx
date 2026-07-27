import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Inset,
  Section,
  SegmentedControl,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes'
import {
  Banknote,
  CalendarDays,
  Fingerprint,
  LogOut,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
  Wallet,
} from 'lucide-react'
import { motion } from 'framer-motion'
import heroArt from '../3356B985-EEDA-4D78-BE8D-1DD8A9293B2A.png'

type AccessMode = 'login' | 'register'

type AccessStats = {
  totalUsers: number
  recentlyCreated: number
  activeToday: number
}

type AccessUser = {
  id: number
  firstName: string
  lastName: string
  fullName: string
  stateId: string
  role: string
  createdAt: string
  lastLoginAt: string | null
}

type AccountSummary = {
  userId: number
  totalContributed: number
  paymentCount: number
  lastPaymentAt: string | null
  weeklyContributionAmount: number
  currentWeekPaid: boolean
  currentWeekStatus: 'none' | 'pending' | 'approved' | 'denied'
  currentWeekKey: string
}

type ContributionPayment = {
  id: number
  amount: number
  weekKey: string
  paidAt: string
  kind: 'weekly' | 'extra'
  label: string
}

type AdminMemberTotal = {
  id: number
  userName: string
  stateId: string
  totalAported: number
}

type AdminPendingContribution = {
  id: number
  userId: number
  userName: string
  stateId: string
  amount: number
  weekKey: string
  status: 'pending' | 'approved' | 'denied'
  paidAt: string
}

type BootstrapResponse = {
  ok: boolean
  message: string
  stats: AccessStats
  demoUsers: AccessUser[]
}

type AccessResponse = {
  ok: boolean
  message: string
  stats?: AccessStats
  user?: AccessUser
}

type AccountResponse = {
  ok: boolean
  message: string
  account?: AccountSummary | null
  recentPayments?: ContributionPayment[]
  payments?: ContributionPayment[]
}

type AdminTotalsResponse = {
  ok: boolean
  message: string
  members?: AdminMemberTotal[]
}

type AdminApprovalsResponse = {
  ok: boolean
  message: string
  contributions?: AdminPendingContribution[]
  account?: AccountSummary | null
}

const panelMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
}

const initialStats: AccessStats = {
  totalUsers: 0,
  recentlyCreated: 0,
  activeToday: 0,
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('es-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const SESSION_STORAGE_KEY = 'bo-access-user'

function readStoredUser() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    return JSON.parse(rawValue) as AccessUser
  } catch {
    return null
  }
}

function storeUserSession(user: AccessUser | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!user) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user))
}

function App() {
  const [mode, setMode] = useState<AccessMode>('login')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [stateId, setStateId] = useState('')
  const [submittedMessage, setSubmittedMessage] = useState('Cargando backend...')
  const [errorMessage, setErrorMessage] = useState('')
  const [accountMessage, setAccountMessage] = useState('')
  const [accountError, setAccountError] = useState('')
  const [stats, setStats] = useState<AccessStats>(initialStats)
  const [demoUsers, setDemoUsers] = useState<AccessUser[]>([])
  const [currentUser, setCurrentUser] = useState<AccessUser | null>(null)
  const [account, setAccount] = useState<AccountSummary | null>(null)
  const [recentPayments, setRecentPayments] = useState<ContributionPayment[]>([])
  const [adminMembers, setAdminMembers] = useState<AdminMemberTotal[]>([])
  const [pendingWeeklyApprovals, setPendingWeeklyApprovals] = useState<AdminPendingContribution[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAccount, setIsLoadingAccount] = useState(false)
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false)
  const [isLoadingAdminTable, setIsLoadingAdminTable] = useState(false)
  const [isLoadingAdminApprovals, setIsLoadingAdminApprovals] = useState(false)
  const [reviewingContributionId, setReviewingContributionId] = useState<number | null>(null)
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false)
  const [includeWeeklyContribution, setIncludeWeeklyContribution] = useState(false)
  const [includeExtraContribution, setIncludeExtraContribution] = useState(false)
  const [extraContributionAmount, setExtraContributionAmount] = useState('')

  useEffect(() => {
    const loadBootstrap = async () => {
      const storedUser = readStoredUser()

      if (storedUser) {
        setCurrentUser(storedUser)
        void loadAccount(storedUser.id)
        if (storedUser.role === 'admin') {
          void loadAdminMembers(storedUser.id)
          void loadPendingWeeklyApprovals(storedUser.id)
        }
      }

      try {
        const response = await fetch('/api/access/bootstrap')
        const data = (await response.json()) as BootstrapResponse

        if (!response.ok || !data.ok) {
          throw new Error(data.message ?? 'No se pudo inicializar el acceso.')
        }

        setStats(data.stats)
        setDemoUsers(data.demoUsers)
        setSubmittedMessage(data.message)
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'No se pudo conectar con el backend.',
        )
        setSubmittedMessage('')
      } finally {
        setIsLoading(false)
      }
    }

    void loadBootstrap()
  }, [])

  const loadAccount = async (userId: number) => {
    setIsLoadingAccount(true)
    setAccountError('')

    try {
      const response = await fetch(`/api/access/account/${userId}`)
      const data = (await response.json()) as AccountResponse

      if (!response.ok || !data.ok || !data.account) {
        throw new Error(data.message ?? 'No se pudo cargar el estado de cuenta.')
      }

      setAccount(data.account)
      setRecentPayments(data.recentPayments ?? [])
      setAccountMessage(data.message)
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : 'No se pudo cargar la cuenta del miembro.',
      )
      setAccountMessage('')
    } finally {
      setIsLoadingAccount(false)
    }
  }

  const loadAdminMembers = async (userId: number) => {
    setIsLoadingAdminTable(true)

    try {
      const response = await fetch(`/api/admin/member-totals/${userId}`)
      const data = (await response.json()) as AdminTotalsResponse

      if (!response.ok || !data.ok || !data.members) {
        throw new Error(data.message ?? 'No se pudo cargar la tabla administrativa.')
      }

      setAdminMembers(data.members)
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : 'No se pudo cargar la tabla administrativa.',
      )
      setAdminMembers([])
    } finally {
      setIsLoadingAdminTable(false)
    }
  }

  const loadPendingWeeklyApprovals = async (userId: number) => {
    setIsLoadingAdminApprovals(true)

    try {
      const response = await fetch(`/api/admin/weekly-approvals/${userId}`)
      const data = (await response.json()) as AdminApprovalsResponse

      if (!response.ok || !data.ok || !data.contributions) {
        throw new Error(data.message ?? 'No se pudo cargar la cola de cuotas pendientes.')
      }

      setPendingWeeklyApprovals(data.contributions)
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : 'No se pudo cargar la cola de cuotas pendientes.',
      )
      setPendingWeeklyApprovals([])
    } finally {
      setIsLoadingAdminApprovals(false)
    }
  }

  const headline = useMemo(() => {
    if (mode === 'register') {
      return 'Crea tu acceso con identidad clara desde el primer segundo.'
    }

    return 'Entra al sistema solo con tu State ID.'
  }, [mode])

  const helperCopy = useMemo(() => {
    if (mode === 'register') {
      return 'El backend ya prepara altas nuevas y evita State ID duplicados.'
    }

    return 'El login ya valida contra el backend usando solo State ID.'
  }, [mode])

  const weeklyButtonLabel = useMemo(() => {
    if (!account) {
      return 'Aporte semanal'
    }

    if (account.currentWeekPaid) {
      return `La semana ${account.currentWeekKey} ya fue cubierta`
    }

    return `Aporte semanal ${currencyFormatter.format(account.weeklyContributionAmount)}`
  }, [account])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanFirstName = firstName.trim()
    const cleanLastName = lastName.trim()
    const cleanStateId = stateId.trim()

    if (mode === 'register') {
      if (!cleanFirstName || !cleanLastName || !cleanStateId) {
        setErrorMessage('Completa nombre, apellido y State ID para continuar.')
        setSubmittedMessage('')
        return
      }
    } else if (!cleanStateId) {
      setErrorMessage('Completa State ID para continuar.')
      setSubmittedMessage('')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSubmittedMessage('')

    try {
      const endpoint = mode === 'register' ? '/api/access/register' : '/api/access/login'
      const payload =
        mode === 'register'
          ? { firstName: cleanFirstName, lastName: cleanLastName, stateId: cleanStateId }
          : { stateId: cleanStateId }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as AccessResponse

      if (!response.ok || !data.ok || !data.user || !data.stats) {
        throw new Error(data.message ?? 'No se pudo completar la operacion.')
      }

      setCurrentUser(data.user)
      storeUserSession(data.user)
      setStats(data.stats)
      setSubmittedMessage(data.message)
      setAccountMessage('')
      setAccountError('')

      if (mode === 'register') {
        setDemoUsers((currentUsers) => [...currentUsers, data.user!])
        setLastName('')
      }

      await loadAccount(data.user.id)
      if (data.user.role === 'admin') {
        await loadAdminMembers(data.user.id)
        await loadPendingWeeklyApprovals(data.user.id)
      } else {
        setAdminMembers([])
        setPendingWeeklyApprovals([])
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Error inesperado al procesar el acceso.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWeeklyPayment = async () => {
    if (!currentUser || !account) {
      return
    }

    setIsRegisteringPayment(true)
    setAccountError('')

    try {
      const response = await fetch('/api/access/weekly-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          includeWeeklyContribution,
          extraContributionAmount: includeExtraContribution ? extraContributionAmount : 0,
        }),
      })

      const data = (await response.json()) as AccountResponse

      if (!response.ok || !data.ok || !data.account) {
        throw new Error(data.message ?? 'No se pudo registrar la cuota semanal.')
      }

      setAccount(data.account)
      setRecentPayments(data.recentPayments ?? [])
      setAccountMessage(data.message)
      setIsContributionModalOpen(false)
      setIncludeWeeklyContribution(false)
      setIncludeExtraContribution(false)
      setExtraContributionAmount('')
      if (currentUser.role === 'admin') {
        await loadAdminMembers(currentUser.id)
        await loadPendingWeeklyApprovals(currentUser.id)
      }
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : 'No se pudo registrar el dinero semanal.',
      )
    } finally {
      setIsRegisteringPayment(false)
    }
  }

  const handleLogout = () => {
    storeUserSession(null)
    setCurrentUser(null)
    setAccount(null)
    setRecentPayments([])
    setAdminMembers([])
    setPendingWeeklyApprovals([])
    setAccountMessage('')
    setAccountError('')
    setFirstName('')
    setLastName('')
    setStateId('')
    setIsContributionModalOpen(false)
  }

  const openContributionModal = () => {
    setIncludeWeeklyContribution(account ? !account.currentWeekPaid : true)
    setIncludeExtraContribution(false)
    setExtraContributionAmount('')
    setAccountError('')
    setAccountMessage('')
    setIsContributionModalOpen(true)
  }

  const closeContributionModal = () => {
    if (isRegisteringPayment) {
      return
    }

    setIsContributionModalOpen(false)
  }

  if (currentUser) {
    return (
      <main className="bo-page">
        <div className="bo-grid" />
        <Section size="1" className="bo-shell dashboard-shell">
          <motion.section className="dashboard-hero" {...panelMotion}>
            <Card className="hero-art-card dashboard-banner">
              <div className="dashboard-banner-copy">
                <Badge size="3" radius="full" className="hero-kicker">
                  MEMBER ACCOUNT
                </Badge>
                <Flex justify="between" align="start" gap="4" wrap="wrap">
                  <div>
                    <Heading size="8" className="dashboard-title">
                      {currentUser.fullName}
                    </Heading>
                    <Text as="p" size="3" className="overlay-body">
                      State ID {currentUser.stateId} · Rol {currentUser.role}
                    </Text>
                  </div>

                  <Button variant="soft" color="gray" size="3" onClick={handleLogout}>
                    <LogOut size={16} />
                    Salir
                  </Button>
                </Flex>
              </div>
            </Card>
          </motion.section>

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
                    Abre el popup para marcar aporte semanal entregado y agregar dinero extra si
                    hace falta. El boton sigue disponible aunque la semana ya este cubierta.
                  </Text>
                </div>

                {accountError ? <p className="hero-error access-feedback">{accountError}</p> : null}
                {accountMessage ? (
                  <p className="hero-success access-feedback success">{accountMessage}</p>
                ) : null}

                <Grid columns={{ initial: '1', md: '3' }} gap="3">
                  <Card className="mini-info-card account-stat-card">
                    <span className="section-icon">
                      <Wallet size={18} />
                    </span>
                    <strong>
                      {account ? currencyFormatter.format(account.totalContributed) : '$0.00'}
                    </strong>
                    <p>estado de cuenta total acumulado.</p>
                  </Card>

                  <Card className="mini-info-card account-stat-card">
                    <span className="section-icon">
                      <Banknote size={18} />
                    </span>
                    <strong>{account?.paymentCount ?? 0}</strong>
                    <p>pagos y extras registrados hasta hoy.</p>
                  </Card>

                  <Card className="mini-info-card account-stat-card">
                    <span className="section-icon">
                      <CalendarDays size={18} />
                    </span>
                    <strong>{account?.currentWeekKey ?? 'Sin semana'}</strong>
                    <p>
                      {account?.currentWeekPaid
                        ? 'la semana actual ya tiene aporte semanal.'
                        : 'la semana actual todavia no tiene aporte semanal.'}
                    </p>
                  </Card>
                </Grid>

                <Flex direction={{ initial: 'column', sm: 'row' }} gap="3">
                  <Button
                    size="4"
                    className="weekly-pay-button"
                    disabled={isLoadingAccount || isRegisteringPayment}
                    onClick={openContributionModal}
                  >
                    {isRegisteringPayment ? 'Registrando...' : 'Dar dinero'}
                  </Button>

                  <Card className="mini-info-card account-aside-card">
                    <strong>Aporte semanal fijo</strong>
                    <p>
                      {account
                        ? currencyFormatter.format(account.weeklyContributionAmount)
                        : currencyFormatter.format(1500)}
                    </p>
                  </Card>
                </Flex>

                <Separator size="4" />

                <Grid columns={{ initial: '1', md: '2' }} gap="4">
                  <Card className="mini-info-card recent-payments-card">
                    <strong>Movimientos recientes</strong>
                    <div className="payment-list">
                      {recentPayments.length ? (
                        recentPayments.map((payment) => (
                          <div key={`${payment.kind}-${payment.id}`} className="payment-row">
                            <div>
                              <span>
                                {payment.label} · {payment.weekKey}
                              </span>
                              <small>{dateFormatter.format(new Date(payment.paidAt))}</small>
                            </div>
                            <strong>{currencyFormatter.format(payment.amount)}</strong>
                          </div>
                        ))
                      ) : (
                        <p>No hay pagos semanales registrados todavia.</p>
                      )}
                    </div>
                  </Card>

                  <Card className="mini-info-card recent-payments-card">
                    <strong>Estado del miembro</strong>
                    <div className="member-summary">
                      <div>
                        <span>Ultimo pago</span>
                        <p>
                          {account?.lastPaymentAt
                            ? dateFormatter.format(new Date(account.lastPaymentAt))
                            : 'Todavia no hay pagos'}
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

                {currentUser.role === 'admin' ? (
                  <>
                    <Separator size="4" />
                    <Card className="mini-info-card recent-payments-card">
                      <strong>Tabla administrativa</strong>
                      <div className="admin-table">
                        <div className="admin-table-row admin-table-head">
                          <span>User name</span>
                          <span>State ID</span>
                          <span>Total aported</span>
                        </div>

                        {isLoadingAdminTable ? (
                          <p>Cargando tabla administrativa...</p>
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
                  </>
                ) : null}
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
                  El popup guarda el aporte semanal, el dinero extra, o ambos, y los agrega al
                  estado total del miembro.
                </Text>
              </div>
            </Card>
          </motion.section>
        </Section>

        {isContributionModalOpen ? (
          <div className="contribution-modal-backdrop" onClick={closeContributionModal}>
            <div className="contribution-modal" onClick={(event) => event.stopPropagation()}>
              <Badge size="3" radius="full" className="hero-kicker">
                Registrar aporte
              </Badge>
              <Heading size="6" className="contribution-modal-title">
                Confirma el dinero entregado
              </Heading>
              <Text as="p" size="2" className="access-copy">
                Marca el aporte semanal entregado y activa dinero extra entregado si necesitas
                sumar una cantidad adicional.
              </Text>

              <label className="contribution-check">
                <input
                  type="checkbox"
                  checked={includeWeeklyContribution}
                  disabled={account?.currentWeekPaid}
                  onChange={(event) => setIncludeWeeklyContribution(event.target.checked)}
                />
                <span>
                  Aporte semanal entregado
                  <small>
                    {account?.currentWeekPaid
                      ? `La semana ${account.currentWeekKey} ya fue registrada.`
                      : weeklyButtonLabel}
                  </small>
                </span>
              </label>

              <label className="contribution-check">
                <input
                  type="checkbox"
                  checked={includeExtraContribution}
                  onChange={(event) => setIncludeExtraContribution(event.target.checked)}
                />
                <span>
                  Dinero extra entregado
                  <small>Puedes sumar cualquier monto adicional al estado total.</small>
                </span>
              </label>

              {includeExtraContribution ? (
                <label className="contribution-amount">
                  <span>Monto extra</span>
                  <TextField.Root
                    size="3"
                    type="number"
                    min="0"
                    step="0.01"
                    value={extraContributionAmount}
                    onChange={(event) => setExtraContributionAmount(event.target.value)}
                    placeholder="50.00"
                  />
                </label>
              ) : null}

              <div className="contribution-modal-actions">
                <Button variant="soft" color="gray" size="3" onClick={closeContributionModal}>
                  Cancelar
                </Button>
                <Button size="3" disabled={isRegisteringPayment} onClick={handleWeeklyPayment}>
                  {isRegisteringPayment ? 'Guardando...' : 'Guardar aporte'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    )
  }

  return (
    <main className="bo-page">
      <div className="bo-grid" />
      <Section size="1" className="bo-shell access-shell">
        <motion.section className="access-layout" {...panelMotion}>
          <Card className="hero-art-card access-art-card">
            <Inset clip="padding-box" side="all" pb="current">
              <img src={heroArt} alt="Graffiti Black Oaths" className="hero-art" />
            </Inset>
            <div className="art-overlay-copy">
              <Badge size="3" radius="full" className="hero-kicker">
                BLACK OATHS
              </Badge>
              <Heading size="8" className="overlay-title">
                Zona de acceso
              </Heading>
              <Text as="p" size="3" className="overlay-body">
                El backend del acceso ya esta activo para login y registro con State ID.
              </Text>
            </div>
          </Card>

          <Card className="glow-card access-card">
            <Flex direction="column" gap="5">
              <div>
                <Badge size="3" radius="full" className="hero-kicker">
                  Login / Register
                </Badge>
                <Heading size="8" className="access-title">
                  {headline}
                </Heading>
                <Text as="p" size="3" className="access-copy">
                  {helperCopy}
                </Text>
              </div>

              <SegmentedControl.Root
                value={mode}
                onValueChange={(value) => setMode(value as AccessMode)}
                size="3"
              >
                <SegmentedControl.Item value="login">Iniciar sesion</SegmentedControl.Item>
                <SegmentedControl.Item value="register">Registrarse</SegmentedControl.Item>
              </SegmentedControl.Root>

              <form className="bo-form access-form" onSubmit={handleSubmit}>
                {mode === 'register' ? (
                  <label>
                    <span>Nombre</span>
                    <TextField.Root
                      size="3"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Matias"
                    />
                  </label>
                ) : null}

                {mode === 'register' ? (
                  <label>
                    <span>Apellido</span>
                    <TextField.Root
                      size="3"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Roldan"
                    />
                  </label>
                ) : null}

                <label>
                  <span>State ID</span>
                  <TextField.Root
                    size="3"
                    value={stateId}
                    onChange={(event) => setStateId(event.target.value)}
                    placeholder="BO-2047"
                  />
                </label>

                <Button size="3" type="submit" disabled={isLoading || isSubmitting}>
                  {isSubmitting ? 'Procesando...' : mode === 'register' ? 'Crear acceso' : 'Entrar'}
                </Button>
              </form>

              {errorMessage ? <p className="hero-error access-feedback">{errorMessage}</p> : null}
              {submittedMessage ? (
                <p className="hero-success access-feedback success">{submittedMessage}</p>
              ) : null}

              <Grid columns={{ initial: '1', sm: '3' }} gap="3">
                <Card className="mini-info-card">
                  <span className="section-icon">
                    <Fingerprint size={18} />
                  </span>
                  <strong>{stats.totalUsers}</strong>
                  <p>usuarios totales en el sistema de acceso.</p>
                </Card>

                <Card className="mini-info-card">
                  <span className="section-icon">
                    <ShieldCheck size={18} />
                  </span>
                  <strong>{stats.activeToday}</strong>
                  <p>sesiones activas registradas el 26 de julio de 2026.</p>
                </Card>

                <Card className="mini-info-card">
                  <span className="section-icon">
                    <UserRoundPlus size={18} />
                  </span>
                  <strong>{stats.recentlyCreated}</strong>
                  <p>altas creadas durante los ultimos 7 dias.</p>
                </Card>
              </Grid>
            </Flex>
          </Card>
        </motion.section>

        <motion.section className="access-bottom-strip" {...panelMotion}>
          <div className="bottom-chip">
            <Sparkles size={18} />
            <span>Backend activo para altas, login y validacion de State ID.</span>
          </div>
          <div className="bottom-chip muted">
            <span>Usuarios demo:</span>
            {demoUsers.slice(0, 3).map((user) => (
              <strong key={user.id}>
                {user.firstName} {user.stateId}
              </strong>
            ))}
          </div>
        </motion.section>
      </Section>
    </main>
  )
}

export default App
