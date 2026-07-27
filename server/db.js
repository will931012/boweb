import pg from 'pg'

const { Pool } = pg

let pool = null

function getPool() {
  if (pool) {
    return pool
  }

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL no esta definido. Configura la base de datos antes de iniciar la API.')
  }

  const needsSsl = !/localhost|127\.0\.0\.1/i.test(connectionString)

  pool = new Pool({
    connectionString,
    ssl: needsSsl
      ? {
          rejectUnauthorized: false,
        }
      : false,
  })

  return pool
}

const seedUsers = [
  {
    firstName: 'Matias',
    lastName: 'Roldan',
    stateId: 'BO-2047',
    role: 'jefe',
    createdAt: '2026-07-21T15:20:00.000Z',
    lastLoginAt: '2026-07-26T13:10:00.000Z',
  },
  {
    firstName: 'Sofia',
    lastName: 'Benitez',
    stateId: 'BO-1772',
    role: 'tesoreria',
    createdAt: '2026-07-20T10:40:00.000Z',
    lastLoginAt: '2026-07-25T23:18:00.000Z',
  },
  {
    firstName: 'Nico',
    lastName: 'Ibarra',
    stateId: 'BO-1108',
    role: 'miembro',
    createdAt: '2026-07-18T22:10:00.000Z',
    lastLoginAt: null,
  },
]

export async function initDatabase() {
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS access_users (
      id BIGSERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      state_id TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'miembro',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ NULL
    )
  `)

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM access_users')

  if (rows[0]?.count > 0) {
    return
  }

  for (const user of seedUsers) {
    await pool.query(
      `
        INSERT INTO access_users (first_name, last_name, state_id, role, created_at, last_login_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [user.firstName, user.lastName, user.stateId, user.role, user.createdAt, user.lastLoginAt],
    )
  }
}

export async function listUsers() {
  const pool = getPool()
  const result = await pool.query(`
    SELECT
      id,
      first_name AS "firstName",
      last_name AS "lastName",
      state_id AS "stateId",
      role,
      created_at AS "createdAt",
      last_login_at AS "lastLoginAt"
    FROM access_users
    ORDER BY id ASC
  `)

  return result.rows
}

export async function findUserByLogin(firstName, stateId) {
  const pool = getPool()
  const result = await pool.query(
    `
      SELECT
        id,
        first_name AS "firstName",
        last_name AS "lastName",
        state_id AS "stateId",
        role,
        created_at AS "createdAt",
        last_login_at AS "lastLoginAt"
      FROM access_users
      WHERE LOWER(first_name) = LOWER($1)
        AND UPPER(state_id) = UPPER($2)
      LIMIT 1
    `,
    [firstName, stateId],
  )

  return result.rows[0] ?? null
}

export async function findUserByStateId(stateId) {
  const pool = getPool()
  const result = await pool.query(
    `
      SELECT
        id,
        first_name AS "firstName",
        last_name AS "lastName",
        state_id AS "stateId",
        role,
        created_at AS "createdAt",
        last_login_at AS "lastLoginAt"
      FROM access_users
      WHERE UPPER(state_id) = UPPER($1)
      LIMIT 1
    `,
    [stateId],
  )

  return result.rows[0] ?? null
}

export async function createUser({ firstName, lastName, stateId, role = 'miembro' }) {
  const pool = getPool()
  const result = await pool.query(
    `
      INSERT INTO access_users (first_name, last_name, state_id, role)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        first_name AS "firstName",
        last_name AS "lastName",
        state_id AS "stateId",
        role,
        created_at AS "createdAt",
        last_login_at AS "lastLoginAt"
    `,
    [firstName, lastName, stateId, role],
  )

  return result.rows[0]
}

export async function updateLastLogin(userId) {
  const pool = getPool()
  const result = await pool.query(
    `
      UPDATE access_users
      SET last_login_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        first_name AS "firstName",
        last_name AS "lastName",
        state_id AS "stateId",
        role,
        created_at AS "createdAt",
        last_login_at AS "lastLoginAt"
    `,
    [userId],
  )

  return result.rows[0] ?? null
}
