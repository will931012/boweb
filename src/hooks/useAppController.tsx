import { FormEvent, useEffect, useMemo, useState } from 'react'
import { fetchJson } from '../services/api'
import {
  AccessMode,
  AccessResponse,
  AccessStats,
  AccessUser,
  AccountResponse,
  AccountSummary,
  AdminApprovalsResponse,
  AdminExpense,
  AdminExpensesResponse,
  AdminMemberTotal,
  AdminPendingContribution,
  AdminTotalsResponse,
  AppRoute,
  BootstrapResponse,
  ContributionPayment,
} from '../types/app'
import { currencyFormatter } from '../utils/format'
import { getCurrentRoute, pushRoute } from '../utils/router'
import { readStoredUser, storeUserSession } from '../utils/session'

const initialStats: AccessStats = {
  totalUsers: 0,
  recentlyCreated: 0,
  activeToday: 0,
}

export function useAppController() {
  const [route, setRoute] = useState<AppRoute>(getCurrentRoute)
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
  const [pendingApprovals, setPendingApprovals] = useState<AdminPendingContribution[]>([])
  const [adminExpenses, setAdminExpenses] = useState<AdminExpense[]>([])
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseReason, setExpenseReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAccount, setIsLoadingAccount] = useState(false)
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false)
  const [isLoadingAdminTable, setIsLoadingAdminTable] = useState(false)
  const [isLoadingAdminApprovals, setIsLoadingAdminApprovals] = useState(false)
  const [isLoadingAdminExpenses, setIsLoadingAdminExpenses] = useState(false)
  const [isRegisteringExpense, setIsRegisteringExpense] = useState(false)
  const [resendingExpenseId, setResendingExpenseId] = useState<number | null>(null)
  const [reviewingContributionKey, setReviewingContributionKey] = useState<string | null>(null)
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false)
  const [includeWeeklyContribution, setIncludeWeeklyContribution] = useState(false)
  const [includeExtraContribution, setIncludeExtraContribution] = useState(false)
  const [extraContributionAmount, setExtraContributionAmount] = useState('')

  useEffect(() => {
    const handlePopState = () => setRoute(getCurrentRoute())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const loadAccount = async (userId: number) => {
    setIsLoadingAccount(true)
    setAccountError('')

    try {
      const data = await fetchJson<AccountResponse>(`/api/access/account/${userId}`)
      setAccount(data.account ?? null)
      setRecentPayments(data.recentPayments ?? [])
      setAccountMessage(data.message)
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'No se pudo cargar la cuenta del miembro.')
      setAccountMessage('')
    } finally {
      setIsLoadingAccount(false)
    }
  }

  const loadAdminMembers = async (userId: number) => {
    setIsLoadingAdminTable(true)

    try {
      const data = await fetchJson<AdminTotalsResponse>(`/api/admin/member-totals/${userId}`)
      setAdminMembers(data.members ?? [])
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'No se pudo cargar la tabla administrativa.')
      setAdminMembers([])
    } finally {
      setIsLoadingAdminTable(false)
    }
  }

  const loadPendingApprovals = async (userId: number) => {
    setIsLoadingAdminApprovals(true)

    try {
      const data = await fetchJson<AdminApprovalsResponse>(`/api/admin/contribution-approvals/${userId}`)
      setPendingApprovals(data.contributions ?? [])
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'No se pudo cargar la cola de aportes pendientes.')
      setPendingApprovals([])
    } finally {
      setIsLoadingAdminApprovals(false)
    }
  }

  const loadAdminExpenses = async (userId: number) => {
    setIsLoadingAdminExpenses(true)

    try {
      const data = await fetchJson<AdminExpensesResponse>(`/api/admin/expenses/${userId}`)
      setAdminExpenses(data.expenses ?? [])
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'No se pudieron cargar los gastos administrativos.')
      setAdminExpenses([])
    } finally {
      setIsLoadingAdminExpenses(false)
    }
  }

  useEffect(() => {
    const loadBootstrap = async () => {
      const storedUser = readStoredUser()

      if (storedUser) {
        setCurrentUser(storedUser)
        void loadAccount(storedUser.id)
        if (storedUser.role === 'admin') {
          void loadAdminMembers(storedUser.id)
          void loadPendingApprovals(storedUser.id)
          void loadAdminExpenses(storedUser.id)
        }
      }

      try {
        const data = await fetchJson<BootstrapResponse>('/api/access/bootstrap')
        setStats(data.stats)
        setDemoUsers(data.demoUsers)
        setSubmittedMessage(data.message)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo conectar con el backend.')
        setSubmittedMessage('')
      } finally {
        setIsLoading(false)
      }
    }

    void loadBootstrap()
  }, [])

  const navigateTo = (nextRoute: AppRoute) => pushRoute(route, nextRoute, setRoute)

  const headline = useMemo(
    () =>
      mode === 'register'
        ? 'Crea tu acceso con identidad clara desde el primer segundo.'
        : 'Entra al sistema solo con tu State ID.',
    [mode],
  )

  const helperCopy = useMemo(
    () =>
      mode === 'register'
        ? 'El backend ya prepara altas nuevas y evita State ID duplicados.'
        : 'El login ya valida contra el backend usando solo State ID.',
    [mode],
  )

  const weeklyButtonLabel = useMemo(() => {
    if (!account) {
      return 'Aporte semanal'
    }

    if (account.currentWeekStatus === 'approved') {
      return `La semana ${account.currentWeekKey} ya fue cubierta`
    }

    if (account.currentWeekStatus === 'pending') {
      return `La semana ${account.currentWeekKey} esta pendiente de aprobacion`
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

      const data = await fetchJson<AccessResponse>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!data.user || !data.stats) {
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
        setFirstName('')
        setLastName('')
      }

      await loadAccount(data.user.id)

      if (data.user.role === 'admin') {
        await Promise.all([
          loadAdminMembers(data.user.id),
          loadPendingApprovals(data.user.id),
          loadAdminExpenses(data.user.id),
        ])
      } else {
        setAdminMembers([])
        setPendingApprovals([])
        setAdminExpenses([])
      }

      navigateTo('/')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error inesperado al procesar el acceso.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContributionSubmit = async () => {
    if (!currentUser || !account) {
      return
    }

    setIsRegisteringPayment(true)
    setAccountError('')

    try {
      const data = await fetchJson<AccountResponse>('/api/access/weekly-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          includeWeeklyContribution,
          extraContributionAmount: includeExtraContribution ? extraContributionAmount : 0,
        }),
      })

      setAccount(data.account ?? null)
      setRecentPayments(data.recentPayments ?? [])
      setAccountMessage(data.message)
      setIsContributionModalOpen(false)
      setIncludeWeeklyContribution(false)
      setIncludeExtraContribution(false)
      setExtraContributionAmount('')

      if (currentUser.role === 'admin') {
        await Promise.all([
          loadAdminMembers(currentUser.id),
          loadPendingApprovals(currentUser.id),
          loadAdminExpenses(currentUser.id),
        ])
      }
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'No se pudo registrar el aporte.')
    } finally {
      setIsRegisteringPayment(false)
    }
  }

  const handleReviewContribution = async (
    contribution: AdminPendingContribution,
    action: 'approve' | 'deny',
  ) => {
    if (!currentUser || currentUser.role !== 'admin') {
      return
    }

    const contributionKey = `${contribution.kind}-${contribution.id}`
    setReviewingContributionKey(contributionKey)
    setAccountError('')

    try {
      const data = await fetchJson<AdminApprovalsResponse>(
        `/api/admin/contribution-approvals/${contribution.kind}/${contribution.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUserId: currentUser.id, action }),
        },
      )

      setPendingApprovals(data.contributions ?? [])
      setAccountMessage(data.message)
      await Promise.all([loadAdminMembers(currentUser.id), loadAccount(currentUser.id)])
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'No se pudo revisar el aporte.')
    } finally {
      setReviewingContributionKey(null)
    }
  }

  const handleExpenseSubmit = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      return
    }

    setIsRegisteringExpense(true)
    setAccountError('')

    try {
      const data = await fetchJson<AdminExpensesResponse>('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          amount: expenseAmount,
          reason: expenseReason,
        }),
      })

      setAccount(data.account ?? null)
      setAdminExpenses(data.expenses ?? [])
      setAccountMessage(data.message)
      setExpenseAmount('')
      setExpenseReason('')
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'No se pudo registrar el gasto.')
    } finally {
      setIsRegisteringExpense(false)
    }
  }

  const handleResendExpenseMessage = async (expenseId: number) => {
    if (!currentUser || currentUser.role !== 'admin') {
      return
    }

    setResendingExpenseId(expenseId)
    setAccountError('')

    try {
      const data = await fetchJson<AdminExpensesResponse>(`/api/admin/expenses/${expenseId}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
        }),
      })

      setAccount(data.account ?? null)
      setAccountMessage(data.message)
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : 'No se pudo reenviar el mensaje del gasto.',
      )
    } finally {
      setResendingExpenseId(null)
    }
  }

  const handleLogout = () => {
    storeUserSession(null)
    setCurrentUser(null)
    setAccount(null)
    setRecentPayments([])
    setAdminMembers([])
    setPendingApprovals([])
    setAdminExpenses([])
    setAccountMessage('')
    setAccountError('')
    setFirstName('')
    setLastName('')
    setStateId('')
    setExpenseAmount('')
    setExpenseReason('')
    setIsContributionModalOpen(false)
    navigateTo('/')
  }

  const openContributionModal = () => {
    setIncludeWeeklyContribution(
      account ? account.currentWeekStatus === 'none' || account.currentWeekStatus === 'denied' : true,
    )
    setIncludeExtraContribution(false)
    setExtraContributionAmount('')
    setAccountError('')
    setAccountMessage('')
    setIsContributionModalOpen(true)
  }

  const closeContributionModal = () => {
    if (!isRegisteringPayment) {
      setIsContributionModalOpen(false)
    }
  }

  return {
    route,
    mode,
    firstName,
    lastName,
    stateId,
    submittedMessage,
    errorMessage,
    accountMessage,
    accountError,
    stats,
    demoUsers,
    currentUser,
    account,
    recentPayments,
    adminMembers,
    pendingApprovals,
    adminExpenses,
    expenseAmount,
    expenseReason,
    isSubmitting,
    isLoading,
    isLoadingAccount,
    isRegisteringPayment,
    isLoadingAdminTable,
    isLoadingAdminApprovals,
    isLoadingAdminExpenses,
    isRegisteringExpense,
    resendingExpenseId,
    reviewingContributionKey,
    isContributionModalOpen,
    includeWeeklyContribution,
    includeExtraContribution,
    extraContributionAmount,
    headline,
    helperCopy,
    weeklyButtonLabel,
    isRouteSwitching: isLoadingAccount || isLoadingAdminTable || isLoadingAdminApprovals || isLoadingAdminExpenses,
    setMode,
    setFirstName,
    setLastName,
    setStateId,
    setExpenseAmount,
    setExpenseReason,
    setIncludeWeeklyContribution,
    setIncludeExtraContribution,
    setExtraContributionAmount,
    navigateTo,
    handleSubmit,
    handleContributionSubmit,
    handleReviewContribution,
    handleExpenseSubmit,
    handleResendExpenseMessage,
    handleLogout,
    openContributionModal,
    closeContributionModal,
  }
}
