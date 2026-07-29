export type AccessMode = 'login' | 'register'

export type AppRoute = '/' | '/admin'

export type AccessStats = {
  totalUsers: number
  recentlyCreated: number
  activeToday: number
}

export type AccessUser = {
  id: number
  firstName: string
  lastName: string
  fullName: string
  stateId: string
  role: string
  createdAt: string
  lastLoginAt: string | null
}

export type AccountSummary = {
  userId: number
  totalContributed: number
  globalTotalContributed: number
  totalExpenses: number
  availableBalance: number
  paymentCount: number
  lastPaymentAt: string | null
  weeklyContributionAmount: number
  currentWeekPaid: boolean
  currentWeekStatus: 'none' | 'pending' | 'approved' | 'denied'
  currentWeekKey: string
}

export type ContributionPayment = {
  id: number
  amount: number
  weekKey: string
  paidAt: string
  kind: 'weekly' | 'extra'
  label: string
  status: 'pending' | 'approved' | 'denied'
}

export type AdminMemberTotal = {
  id: number
  userName: string
  stateId: string
  totalAported: number
}

export type AdminPendingContribution = {
  id: number
  userId: number
  userName: string
  stateId: string
  amount: number
  weekKey: string
  status: 'pending' | 'approved' | 'denied'
  paidAt: string
  kind: 'weekly' | 'extra'
  label: string
}

export type AdminExpense = {
  id: number
  amount: number
  reason: string
  createdAt: string
  createdByUserId: number
  createdByName: string
}

export type BootstrapResponse = {
  ok: boolean
  message: string
  stats: AccessStats
  demoUsers: AccessUser[]
}

export type AccessResponse = {
  ok: boolean
  message: string
  stats?: AccessStats
  user?: AccessUser
}

export type AccountResponse = {
  ok: boolean
  message: string
  account?: AccountSummary | null
  recentPayments?: ContributionPayment[]
  payments?: ContributionPayment[]
}

export type AdminTotalsResponse = {
  ok: boolean
  message: string
  members?: AdminMemberTotal[]
}

export type AdminApprovalsResponse = {
  ok: boolean
  message: string
  contributions?: AdminPendingContribution[]
  account?: AccountSummary | null
}

export type AdminExpensesResponse = {
  ok: boolean
  message: string
  account?: AccountSummary | null
  expense?: AdminExpense
  expenses?: AdminExpense[]
}
