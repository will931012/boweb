import cors from 'cors'
import express from 'express'
import { notifyDiscordContribution } from './discord.js'
import {
  createUser,
  findUserById,
  findUserByLogin,
  findUserByStateId,
  getAccountSummary,
  initDatabase,
  listRecentContributions,
  listUsers,
  recordContributionBundle,
  WEEKLY_CONTRIBUTION_AMOUNT,
  updateLastLogin,
} from './db.js'

const app = express()
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
let databaseStartupError = null
let databaseInitPromise = null

app.use(
  cors({
    origin: clientOrigin,
  }),
)
app.use(express.json())

const normalizeText = (value) =>
  typeof value === 'string'
    ? value
        .trim()
        .replace(/\s+/g, ' ')
    : ''

const normalizeStateId = (value) =>
  typeof value === 'string'
    ? value
        .trim()
        .replace(/\s+/g, '')
        .toUpperCase()
    : ''

const serializeUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: `${user.firstName} ${user.lastName}`.trim(),
  stateId: user.stateId,
  role: user.role,
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt,
})

const serializeAccount = (account) => ({
  userId: account.userId,
  totalContributed: account.totalContributed,
  paymentCount: account.paymentCount,
  lastPaymentAt: account.lastPaymentAt,
  weeklyContributionAmount: account.weeklyContributionAmount,
  currentWeekPaid: account.currentWeekPaid,
  currentWeekKey: account.currentWeekKey,
})

const normalizeUserId = (value) => {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const ensureDatabaseReady = (response) => {
  if (!databaseStartupError) {
    return true
  }

  response.status(503).json({
    ok: false,
    message: `Base de datos no disponible: ${databaseStartupError.message}`,
  })

  return false
}

const buildAccessSnapshot = async () => {
  const users = await listUsers()
  const now = new Date('2026-07-26T23:59:59.000Z').getTime()
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
  const totalUsers = users.length
  const recentlyCreated = users.filter((user) => {
    const createdAt = new Date(user.createdAt).getTime()
    return now - createdAt <= sevenDaysInMs
  }).length
  const activeToday = users.filter((user) => {
    if (!user.lastLoginAt) {
      return false
    }

    return String(user.lastLoginAt).startsWith('2026-07-26')
  }).length

  return {
    totalUsers,
    recentlyCreated,
    activeToday,
  }
}

export async function initAppDatabase() {
  if (databaseInitPromise) {
    return databaseInitPromise
  }

  databaseInitPromise = initDatabase()
    .then(() => {
      databaseStartupError = null
    })
    .catch((error) => {
      databaseStartupError = error instanceof Error ? error : new Error('Error desconocido de base de datos.')
      console.error('Base de datos no disponible al iniciar:', databaseStartupError)
    })

  return databaseInitPromise
}

app.get('/api/health', (_request, response) => {
  response.json({
    ok: !databaseStartupError,
    message: databaseStartupError
      ? `Backend iniciado sin base de datos: ${databaseStartupError.message}`
      : 'Backend conectado correctamente.',
    databaseReady: !databaseStartupError,
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/access/bootstrap', async (_request, response) => {
  if (!ensureDatabaseReady(response)) {
    return
  }

  try {
    const users = await listUsers()
    const stats = await buildAccessSnapshot()

    response.json({
      ok: true,
      message: 'Pantalla de acceso lista.',
      stats,
      demoUsers: users.map(serializeUser),
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'No se pudo cargar el bootstrap.',
    })
  }
})

app.get('/api/access/account/:userId', async (request, response) => {
  if (!ensureDatabaseReady(response)) {
    return
  }

  const userId = normalizeUserId(request.params.userId)

  if (!userId) {
    response.status(400).json({
      ok: false,
      message: 'User ID invalido.',
    })
    return
  }

  try {
    const account = await getAccountSummary(userId)

    if (!account) {
      response.status(404).json({
        ok: false,
        message: 'No encontramos una cuenta para este usuario.',
      })
      return
    }

    const recentPayments = await listRecentContributions(userId)

    response.json({
      ok: true,
      message: 'Estado de cuenta cargado.',
      account: serializeAccount(account),
      recentPayments,
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'No se pudo cargar la cuenta.',
    })
  }
})

app.post('/api/access/login', async (request, response) => {
  if (!ensureDatabaseReady(response)) {
    return
  }

  const stateId = normalizeStateId(request.body?.stateId)

  if (!stateId) {
    response.status(400).json({
      ok: false,
      message: 'State ID es obligatorio.',
    })
    return
  }

  try {
    const user = await findUserByLogin(stateId)

    if (!user) {
      response.status(401).json({
        ok: false,
        message: 'No encontramos un acceso con ese State ID.',
      })
      return
    }

    const updatedUser = await updateLastLogin(user.id)
    const stats = await buildAccessSnapshot()

    response.json({
      ok: true,
      message: `Bienvenido, ${updatedUser.firstName}. Acceso validado.`,
      user: serializeUser(updatedUser),
      stats,
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'No se pudo procesar el login.',
    })
  }
})

app.post('/api/access/register', async (request, response) => {
  if (!ensureDatabaseReady(response)) {
    return
  }

  const firstName = normalizeText(request.body?.firstName)
  const lastName = normalizeText(request.body?.lastName)
  const stateId = normalizeStateId(request.body?.stateId)

  if (!firstName || !lastName || !stateId) {
    response.status(400).json({
      ok: false,
      message: 'Nombre, apellido y State ID son obligatorios.',
    })
    return
  }

  try {
    const existingUser = await findUserByStateId(stateId)

    if (existingUser) {
      response.status(409).json({
        ok: false,
        message: 'Ese State ID ya esta registrado.',
      })
      return
    }

    const createdUser = await createUser({
      firstName,
      lastName,
      stateId,
    })
    const stats = await buildAccessSnapshot()

    response.status(201).json({
      ok: true,
      message: `Registro creado para ${createdUser.firstName} ${createdUser.lastName}.`,
      user: serializeUser(createdUser),
      stats,
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'No se pudo crear el registro.',
    })
  }
})

app.post('/api/access/weekly-payment', async (request, response) => {
  if (!ensureDatabaseReady(response)) {
    return
  }

  const userId = normalizeUserId(request.body?.userId)
  const includeWeeklyContribution = Boolean(request.body?.includeWeeklyContribution)
  const extraContributionAmount = Number.parseFloat(String(request.body?.extraContributionAmount ?? 0))

  if (!userId) {
    response.status(400).json({
      ok: false,
      message: 'User ID invalido.',
    })
    return
  }

  try {
    const result = await recordContributionBundle(userId, {
      includeWeeklyContribution,
      extraContributionAmount,
    })

    const messageParts = []

    if (includeWeeklyContribution) {
      messageParts.push(`aporte semanal de $${WEEKLY_CONTRIBUTION_AMOUNT}`)
    }

    if (Number.isFinite(extraContributionAmount) && extraContributionAmount > 0) {
      messageParts.push(`dinero extra de $${extraContributionAmount}`)
    }

    response.status(201).json({
      ok: true,
      message: `Se registro ${messageParts.join(' y ')}.`,
      account: result.account ? serializeAccount(result.account) : null,
      payments: result.payments,
      recentPayments: result.recentPayments,
    })

    if (result.account) {
      const user = await findUserById(userId)

      void notifyDiscordContribution({
        user: user ? serializeUser(user) : {
          id: userId,
          firstName: 'Miembro',
          lastName: '',
          fullName: 'Miembro',
          stateId: 'N/A',
          role: 'miembro',
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
        },
        account: result.account,
        payments: result.payments,
      }).catch((error) => {
        console.error('No se pudo enviar la notificacion a Discord:', error)
      })
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'DUPLICATE_WEEKLY_PAYMENT') {
      response.status(409).json({
        ok: false,
        message: error.message,
      })
      return
    }

    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'No se pudo registrar la cuota semanal.',
    })
  }
})

export default app
