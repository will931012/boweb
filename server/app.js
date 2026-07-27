import cors from 'cors'
import express from 'express'
import {
  createUser,
  findUserByLogin,
  findUserByStateId,
  initDatabase,
  listUsers,
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

app.post('/api/access/login', async (request, response) => {
  if (!ensureDatabaseReady(response)) {
    return
  }

  const firstName = normalizeText(request.body?.firstName)
  const stateId = normalizeStateId(request.body?.stateId)

  if (!firstName || !stateId) {
    response.status(400).json({
      ok: false,
      message: 'Nombre y State ID son obligatorios.',
    })
    return
  }

  try {
    const user = await findUserByLogin(firstName, stateId)

    if (!user) {
      response.status(401).json({
        ok: false,
        message: 'No encontramos un acceso con ese nombre y State ID.',
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

export default app
