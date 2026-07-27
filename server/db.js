import pg from 'pg'

const { Pool } = pg

let pool = null
export const WEEKLY_CONTRIBUTION_AMOUNT = 1500

function toCurrencyNumber(value) {
  return Number.parseFloat(value ?? 0)
}

function buildWeekKey(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7)

  return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}

function buildPoolConfig(connectionString) {
  const parsedUrl = new URL(connectionString)
  const isLocalhost = /^(localhost|127\.0\.0\.1)$/i.test(parsedUrl.hostname)

  parsedUrl.searchParams.delete('ssl')
  parsedUrl.searchParams.delete('sslmode')
  parsedUrl.searchParams.delete('sslcert')
  parsedUrl.searchParams.delete('sslkey')
  parsedUrl.searchParams.delete('sslrootcert')

  return {
    connectionString: parsedUrl.toString(),
    ssl: isLocalhost
      ? false
      : {
          rejectUnauthorized: false,
        },
  }
}

function getPool() {
  if (pool) {
    return pool
  }

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL no esta definido. Configura la base de datos antes de iniciar la API.')
  }

  pool = new Pool(buildPoolConfig(connectionString))

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

async function ensureUserAccount(client, userId) {
  await client.query(
    `
      INSERT INTO user_accounts (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId],
  )
}

function mapAccountSummary(row) {
  return {
    userId: row.userId,
    totalContributed: toCurrencyNumber(row.totalContributed),
    paymentCount: row.paymentCount,
    lastPaymentAt: row.lastPaymentAt,
    weeklyContributionAmount: toCurrencyNumber(row.weeklyContributionAmount),
    currentWeekPaid: row.currentWeekPaid,
    currentWeekKey: row.currentWeekKey,
  }
}

function mapContributionRow(row) {
  return {
    id: row.id,
    amount: toCurrencyNumber(row.amount),
    weekKey: row.weekKey,
    paidAt: row.paidAt,
    kind: row.kind,
    label: row.label,
  }
}

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_accounts (
      user_id BIGINT PRIMARY KEY REFERENCES access_users(id) ON DELETE CASCADE,
      total_contributed NUMERIC(12, 2) NOT NULL DEFAULT 0,
      payment_count INT NOT NULL DEFAULT 0,
      last_payment_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS weekly_contributions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES access_users(id) ON DELETE CASCADE,
      amount NUMERIC(12, 2) NOT NULL,
      week_key TEXT NOT NULL,
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, week_key)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS extra_contributions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES access_users(id) ON DELETE CASCADE,
      amount NUMERIC(12, 2) NOT NULL,
      note TEXT NULL,
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM access_users')

  if (rows[0]?.count > 0) {
    await pool.query(`
      INSERT INTO user_accounts (user_id)
      SELECT id
      FROM access_users
      ON CONFLICT (user_id) DO NOTHING
    `)
    return
  }

  for (const user of seedUsers) {
    const result = await pool.query(
      `
        INSERT INTO access_users (first_name, last_name, state_id, role, created_at, last_login_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [user.firstName, user.lastName, user.stateId, user.role, user.createdAt, user.lastLoginAt],
    )

    await pool.query(
      `
        INSERT INTO user_accounts (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [result.rows[0].id],
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

export async function findUserByLogin(stateId) {
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

export async function findUserById(userId) {
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
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
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

  await ensureUserAccount(pool, result.rows[0].id)

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

export async function getAccountSummary(userId) {
  const pool = getPool()
  await ensureUserAccount(pool, userId)

  const currentWeekKey = buildWeekKey()
  const result = await pool.query(
    `
      SELECT
        ua.user_id AS "userId",
        ua.total_contributed::float8 AS "totalContributed",
        ua.payment_count AS "paymentCount",
        ua.last_payment_at AS "lastPaymentAt",
        $2::float8 AS "weeklyContributionAmount",
        EXISTS (
          SELECT 1
          FROM weekly_contributions wc
          WHERE wc.user_id = ua.user_id
            AND wc.week_key = $3
        ) AS "currentWeekPaid",
        $3 AS "currentWeekKey"
      FROM user_accounts ua
      WHERE ua.user_id = $1
      LIMIT 1
    `,
    [userId, WEEKLY_CONTRIBUTION_AMOUNT, currentWeekKey],
  )

  if (!result.rows[0]) {
    return null
  }

  return mapAccountSummary(result.rows[0])
}

export async function listRecentContributions(userId, limit = 6) {
  const pool = getPool()
  const result = await pool.query(
    `
      SELECT *
      FROM (
        SELECT
          id,
          amount::float8 AS amount,
          week_key AS "weekKey",
          paid_at AS "paidAt",
          'weekly' AS kind,
          'Aporte semanal' AS label
        FROM weekly_contributions
        WHERE user_id = $1

        UNION ALL

        SELECT
          id,
          amount::float8 AS amount,
          'Extra' AS "weekKey",
          paid_at AS "paidAt",
          'extra' AS kind,
          'Dinero extra' AS label
        FROM extra_contributions
        WHERE user_id = $1
      ) contributions
      ORDER BY "paidAt" DESC
      LIMIT $2
    `,
    [userId, limit],
  )

  return result.rows.map(mapContributionRow)
}

export async function recordWeeklyContribution(userId, amount = WEEKLY_CONTRIBUTION_AMOUNT) {
  return recordContributionBundle(userId, {
    includeWeeklyContribution: true,
    extraContributionAmount: 0,
  })
}

export async function recordContributionBundle(
  userId,
  { includeWeeklyContribution = false, extraContributionAmount = 0 },
) {
  const pool = getPool()
  const client = await pool.connect()
  const weekKey = buildWeekKey()
  const normalizedExtraAmount = Number.parseFloat(String(extraContributionAmount || 0))
  const hasExtraContribution = Number.isFinite(normalizedExtraAmount) && normalizedExtraAmount > 0

  if (!includeWeeklyContribution && !hasExtraContribution) {
    throw new Error('Selecciona un aporte semanal o ingresa dinero extra.')
  }

  try {
    await client.query('BEGIN')
    await ensureUserAccount(client, userId)

    const createdPayments = []
    let totalAmount = 0

    if (includeWeeklyContribution) {
      const weeklyResult = await client.query(
        `
          INSERT INTO weekly_contributions (user_id, amount, week_key)
          VALUES ($1, $2, $3)
          RETURNING
            id,
            amount::float8 AS amount,
            week_key AS "weekKey",
            paid_at AS "paidAt",
            'weekly' AS kind,
            'Aporte semanal' AS label
        `,
        [userId, WEEKLY_CONTRIBUTION_AMOUNT, weekKey],
      )

      createdPayments.push(mapContributionRow(weeklyResult.rows[0]))
      totalAmount += WEEKLY_CONTRIBUTION_AMOUNT
    }

    if (hasExtraContribution) {
      const extraResult = await client.query(
        `
          INSERT INTO extra_contributions (user_id, amount)
          VALUES ($1, $2)
          RETURNING
            id,
            amount::float8 AS amount,
            'Extra' AS "weekKey",
            paid_at AS "paidAt",
            'extra' AS kind,
            'Dinero extra' AS label
        `,
        [userId, normalizedExtraAmount],
      )

      createdPayments.push(mapContributionRow(extraResult.rows[0]))
      totalAmount += normalizedExtraAmount
    }

    await client.query(
      `
        UPDATE user_accounts
        SET
          total_contributed = total_contributed + $2,
          payment_count = payment_count + $3,
          last_payment_at = NOW(),
          updated_at = NOW()
        WHERE user_id = $1
      `,
      [userId, totalAmount, createdPayments.length],
    )

    await client.query('COMMIT')

    return {
      payments: createdPayments,
      account: await getAccountSummary(userId),
      recentPayments: await listRecentContributions(userId),
    }
  } catch (error) {
    await client.query('ROLLBACK')

    if (error instanceof Error && 'code' in error && error.code === '23505') {
      const duplicateError = new Error('La cuota semanal de esta semana ya fue registrada.')
      duplicateError.name = 'DUPLICATE_WEEKLY_PAYMENT'
      throw duplicateError
    }

    throw error
  } finally {
    client.release()
  }
}
