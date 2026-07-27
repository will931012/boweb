import pg from 'pg'

const { Pool } = pg

let pool = null
export const WEEKLY_CONTRIBUTION_AMOUNT = 5000

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
    role: 'admin',
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

async function ensureAccountTotals(client, userId) {
  await client.query(
    `
      INSERT INTO account_totals (
        user_id,
        total_contributed,
        weekly_total,
        extra_total,
        payment_count,
        weekly_payment_count,
        extra_payment_count,
        last_payment_at
      )
      VALUES ($1, 0, 0, 0, 0, 0, 0, NULL)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId],
  )
}

function mapAccountSummary(row) {
  return {
    userId: row.userId,
    totalContributed: toCurrencyNumber(row.totalContributed),
    globalTotalContributed: toCurrencyNumber(row.globalTotalContributed),
    paymentCount: row.paymentCount,
    lastPaymentAt: row.lastPaymentAt,
    weeklyContributionAmount: toCurrencyNumber(row.weeklyContributionAmount),
    currentWeekPaid: row.currentWeekPaid,
    currentWeekStatus: row.currentWeekStatus ?? 'none',
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
    status: row.status ?? 'approved',
  }
}

function mapPendingWeeklyContribution(row) {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    stateId: row.stateId,
    amount: toCurrencyNumber(row.amount),
    weekKey: row.weekKey,
    status: row.status,
    paidAt: row.paidAt,
    kind: row.kind,
    label: row.label,
  }
}

function mapMissingWeeklyContribution(row) {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName.trim(),
    stateId: row.stateId,
    role: row.role,
    weeklyStatus: row.weeklyStatus ?? 'none',
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
    CREATE TABLE IF NOT EXISTS account_totals (
      user_id BIGINT PRIMARY KEY REFERENCES access_users(id) ON DELETE CASCADE,
      total_contributed NUMERIC(12, 2) NOT NULL DEFAULT 0,
      weekly_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
      extra_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
      payment_count INT NOT NULL DEFAULT 0,
      weekly_payment_count INT NOT NULL DEFAULT 0,
      extra_payment_count INT NOT NULL DEFAULT 0,
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
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_at TIMESTAMPTZ NULL,
      reviewed_by BIGINT NULL REFERENCES access_users(id) ON DELETE SET NULL,
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, week_key)
    )
  `)

  await pool.query(`
    ALTER TABLE weekly_contributions
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  `)

  await pool.query(`
    ALTER TABLE weekly_contributions
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL
  `)

  await pool.query(`
    ALTER TABLE weekly_contributions
    ADD COLUMN IF NOT EXISTS reviewed_by BIGINT NULL REFERENCES access_users(id) ON DELETE SET NULL
  `)

  await pool.query(`
    UPDATE weekly_contributions
    SET status = 'approved'
    WHERE status IS NULL OR status NOT IN ('pending', 'approved', 'denied')
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS extra_contributions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES access_users(id) ON DELETE CASCADE,
      amount NUMERIC(12, 2) NOT NULL,
      note TEXT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_at TIMESTAMPTZ NULL,
      reviewed_by BIGINT NULL REFERENCES access_users(id) ON DELETE SET NULL,
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    ALTER TABLE extra_contributions
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  `)

  await pool.query(`
    ALTER TABLE extra_contributions
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL
  `)

  await pool.query(`
    ALTER TABLE extra_contributions
    ADD COLUMN IF NOT EXISTS reviewed_by BIGINT NULL REFERENCES access_users(id) ON DELETE SET NULL
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS discord_daily_notifications (
      id BIGSERIAL PRIMARY KEY,
      notification_type TEXT NOT NULL,
      notification_date TEXT NOT NULL,
      week_key TEXT NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (notification_type, notification_date)
    )
  `)

  await pool.query(`
    UPDATE extra_contributions
    SET status = 'approved'
    WHERE status IS NULL OR status NOT IN ('pending', 'approved', 'denied')
  `)

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM access_users')

  if (rows[0]?.count > 0) {
    await pool.query(`
      UPDATE access_users
      SET role = 'admin'
      WHERE state_id = 'BO-2047'
        AND role <> 'admin'
    `)

    await pool.query(`
      INSERT INTO user_accounts (user_id)
      SELECT id
      FROM access_users
      ON CONFLICT (user_id) DO NOTHING
    `)
    await pool.query(`
      INSERT INTO account_totals (user_id)
      SELECT id
      FROM access_users
      ON CONFLICT (user_id) DO NOTHING
    `)
    await pool.query(`
      UPDATE account_totals totals
      SET
        weekly_total = COALESCE(weekly_data.weekly_total, 0),
        extra_total = COALESCE(extra_data.extra_total, 0),
        total_contributed = COALESCE(weekly_data.weekly_total, 0) + COALESCE(extra_data.extra_total, 0),
        weekly_payment_count = COALESCE(weekly_data.weekly_payment_count, 0),
        extra_payment_count = COALESCE(extra_data.extra_payment_count, 0),
        payment_count = COALESCE(weekly_data.weekly_payment_count, 0) + COALESCE(extra_data.extra_payment_count, 0),
        last_payment_at = CASE
          WHEN weekly_data.last_payment_at IS NULL AND extra_data.last_payment_at IS NULL THEN NULL
          ELSE GREATEST(
            COALESCE(weekly_data.last_payment_at, to_timestamp(0)),
            COALESCE(extra_data.last_payment_at, to_timestamp(0))
          )
        END,
        updated_at = NOW()
      FROM (
        SELECT
          user_id,
          SUM(amount) AS weekly_total,
          COUNT(*)::int AS weekly_payment_count,
          MAX(paid_at) AS last_payment_at
        FROM weekly_contributions
        WHERE status = 'approved'
        GROUP BY user_id
      ) weekly_data
      FULL OUTER JOIN (
        SELECT
          user_id,
          SUM(amount) AS extra_total,
          COUNT(*)::int AS extra_payment_count,
          MAX(paid_at) AS last_payment_at
        FROM extra_contributions
        WHERE status = 'approved'
        GROUP BY user_id
      ) extra_data ON extra_data.user_id = weekly_data.user_id
      WHERE totals.user_id = COALESCE(weekly_data.user_id, extra_data.user_id)
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

    await pool.query(
      `
        INSERT INTO account_totals (user_id)
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

export async function listMemberTotals() {
  const pool = getPool()
  const result = await pool.query(
    `
      SELECT
        users.id,
        users.first_name AS "firstName",
        users.last_name AS "lastName",
        users.state_id AS "stateId",
        CONCAT(users.first_name, ' ', users.last_name) AS "fullName",
        totals.total_contributed::float8 AS "totalAported"
      FROM access_users users
      INNER JOIN account_totals totals ON totals.user_id = users.id
      ORDER BY totals.total_contributed DESC, users.created_at ASC
    `,
  )

  return result.rows.map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName.trim(),
    stateId: row.stateId,
    totalAported: toCurrencyNumber(row.totalAported),
  }))
}

export function getCurrentWeekKey(date = new Date()) {
  return buildWeekKey(date)
}

export async function listUsersMissingWeeklyContribution(weekKey = buildWeekKey()) {
  const pool = getPool()
  const result = await pool.query(
    `
      SELECT
        users.id,
        users.first_name AS "firstName",
        users.last_name AS "lastName",
        CONCAT(users.first_name, ' ', users.last_name) AS "fullName",
        users.state_id AS "stateId",
        users.role,
        weekly.status AS "weeklyStatus"
      FROM access_users users
      LEFT JOIN weekly_contributions weekly
        ON weekly.user_id = users.id
       AND weekly.week_key = $1
      WHERE weekly.id IS NULL OR weekly.status = 'denied'
      ORDER BY users.first_name ASC, users.last_name ASC, users.id ASC
    `,
    [weekKey],
  )

  return result.rows.map(mapMissingWeeklyContribution)
}

export async function markDailyDiscordNotificationSent(notificationType, notificationDate, weekKey) {
  const pool = getPool()
  const result = await pool.query(
    `
      INSERT INTO discord_daily_notifications (notification_type, notification_date, week_key)
      VALUES ($1, $2, $3)
      ON CONFLICT (notification_type, notification_date) DO NOTHING
      RETURNING id
    `,
    [notificationType, notificationDate, weekKey],
  )

  return Boolean(result.rows[0])
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
  await ensureAccountTotals(pool, result.rows[0].id)

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
  await ensureAccountTotals(pool, userId)

  const currentWeekKey = buildWeekKey()
  const result = await pool.query(
    `
      SELECT
        totals.user_id AS "userId",
        totals.total_contributed::float8 AS "totalContributed",
        (
          SELECT COALESCE(SUM(all_totals.total_contributed), 0)::float8
          FROM account_totals all_totals
        ) AS "globalTotalContributed",
        totals.payment_count AS "paymentCount",
        totals.last_payment_at AS "lastPaymentAt",
        $2::float8 AS "weeklyContributionAmount",
        EXISTS (
          SELECT 1
          FROM weekly_contributions wc
          WHERE wc.user_id = totals.user_id
            AND wc.week_key = $3
            AND wc.status = 'approved'
        ) AS "currentWeekPaid",
        COALESCE((
          SELECT wc.status
          FROM weekly_contributions wc
          WHERE wc.user_id = totals.user_id
            AND wc.week_key = $3
          LIMIT 1
        ), 'none') AS "currentWeekStatus",
        $3 AS "currentWeekKey"
      FROM account_totals totals
      WHERE totals.user_id = $1
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
          'Aporte semanal' AS label,
          status
        FROM weekly_contributions
        WHERE user_id = $1

        UNION ALL

        SELECT
          id,
          amount::float8 AS amount,
          'Extra' AS "weekKey",
          paid_at AS "paidAt",
          'extra' AS kind,
          'Dinero extra' AS label,
          status
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
    await ensureAccountTotals(client, userId)

    const createdPayments = []

    if (includeWeeklyContribution) {
      const existingWeekly = await client.query(
        `
          SELECT id, status
          FROM weekly_contributions
          WHERE user_id = $1
            AND week_key = $2
          LIMIT 1
        `,
        [userId, weekKey],
      )

      let weeklyResult

      if (!existingWeekly.rows[0]) {
        weeklyResult = await client.query(
          `
            INSERT INTO weekly_contributions (user_id, amount, week_key, status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING
              id,
              amount::float8 AS amount,
              week_key AS "weekKey",
              paid_at AS "paidAt",
              'weekly' AS kind,
              'Aporte semanal' AS label,
              status
          `,
          [userId, WEEKLY_CONTRIBUTION_AMOUNT, weekKey],
        )
      } else if (existingWeekly.rows[0].status === 'denied') {
        weeklyResult = await client.query(
          `
            UPDATE weekly_contributions
            SET
              amount = $2,
              status = 'pending',
              reviewed_at = NULL,
              reviewed_by = NULL,
              paid_at = NOW()
            WHERE id = $1
            RETURNING
              id,
              amount::float8 AS amount,
              week_key AS "weekKey",
              paid_at AS "paidAt",
              'weekly' AS kind,
              'Aporte semanal' AS label,
              status
          `,
          [existingWeekly.rows[0].id, WEEKLY_CONTRIBUTION_AMOUNT],
        )
      } else {
        const duplicateError = new Error(
          existingWeekly.rows[0].status === 'approved'
            ? 'La cuota semanal de esta semana ya fue aprobada.'
            : 'La cuota semanal de esta semana ya esta pendiente de aprobacion.',
        )
        duplicateError.name = 'DUPLICATE_WEEKLY_PAYMENT'
        throw duplicateError
      }

      createdPayments.push(mapContributionRow(weeklyResult.rows[0]))
    }

    if (hasExtraContribution) {
      const extraResult = await client.query(
        `
          INSERT INTO extra_contributions (user_id, amount, status)
          VALUES ($1, $2, 'pending')
          RETURNING
            id,
            amount::float8 AS amount,
            'Extra' AS "weekKey",
            paid_at AS "paidAt",
            'extra' AS kind,
            'Dinero extra' AS label,
            status
        `,
        [userId, normalizedExtraAmount],
      )

      createdPayments.push(mapContributionRow(extraResult.rows[0]))
    }

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

export async function listPendingWeeklyContributions() {
  const pool = getPool()
  const result = await pool.query(
    `
      SELECT *
      FROM (
        SELECT
          wc.id,
          wc.user_id AS "userId",
          CONCAT(users.first_name, ' ', users.last_name) AS "userName",
          users.state_id AS "stateId",
          wc.amount::float8 AS amount,
          wc.week_key AS "weekKey",
          wc.status,
          wc.paid_at AS "paidAt",
          'weekly' AS kind,
          'Aporte semanal' AS label
        FROM weekly_contributions wc
        INNER JOIN access_users users ON users.id = wc.user_id
        WHERE wc.status = 'pending'

        UNION ALL

        SELECT
          ec.id,
          ec.user_id AS "userId",
          CONCAT(users.first_name, ' ', users.last_name) AS "userName",
          users.state_id AS "stateId",
          ec.amount::float8 AS amount,
          'Extra' AS "weekKey",
          ec.status,
          ec.paid_at AS "paidAt",
          'extra' AS kind,
          'Dinero extra' AS label
        FROM extra_contributions ec
        INNER JOIN access_users users ON users.id = ec.user_id
        WHERE ec.status = 'pending'
      ) contributions
      ORDER BY "paidAt" ASC
    `,
  )

  return result.rows.map(mapPendingWeeklyContribution)
}

export async function reviewContribution({ contributionId, adminUserId, action, kind }) {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const contributionResult = await client.query(
      kind === 'weekly'
        ? `
            SELECT
              id,
              user_id AS "userId",
              amount::float8 AS amount,
              week_key AS "weekKey",
              status
            FROM weekly_contributions
            WHERE id = $1
            LIMIT 1
          `
        : `
            SELECT
              id,
              user_id AS "userId",
              amount::float8 AS amount,
              'Extra' AS "weekKey",
              status
            FROM extra_contributions
            WHERE id = $1
            LIMIT 1
          `,
      [contributionId],
    )

    const contribution = contributionResult.rows[0]

    if (!contribution) {
      throw new Error('No encontramos esa cuota semanal.')
    }

    if (contribution.status !== 'pending') {
      throw new Error('Esta cuota semanal ya fue revisada.')
    }

    const nextStatus = action === 'approve' ? 'approved' : 'denied'

    await client.query(
      kind === 'weekly'
        ? `
            UPDATE weekly_contributions
            SET
              status = $2,
              reviewed_at = NOW(),
              reviewed_by = $3
            WHERE id = $1
          `
        : `
            UPDATE extra_contributions
            SET
              status = $2,
              reviewed_at = NOW(),
              reviewed_by = $3
            WHERE id = $1
          `,
      [contributionId, nextStatus, adminUserId],
    )

    if (action === 'approve') {
      await ensureUserAccount(client, contribution.userId)
      await ensureAccountTotals(client, contribution.userId)

      await client.query(
        `
          UPDATE account_totals
          SET
            total_contributed = total_contributed + $2,
            weekly_total = weekly_total + $3,
            extra_total = extra_total + $4,
            payment_count = payment_count + 1,
            weekly_payment_count = weekly_payment_count + $5,
            extra_payment_count = extra_payment_count + $6,
            last_payment_at = NOW(),
            updated_at = NOW()
          WHERE user_id = $1
        `,
        [
          contribution.userId,
          contribution.amount,
          kind === 'weekly' ? contribution.amount : 0,
          kind === 'extra' ? contribution.amount : 0,
          kind === 'weekly' ? 1 : 0,
          kind === 'extra' ? 1 : 0,
        ],
      )

      await client.query(
        `
          UPDATE user_accounts
          SET
            total_contributed = total_contributed + $2,
            payment_count = payment_count + 1,
            last_payment_at = NOW(),
            updated_at = NOW()
        WHERE user_id = $1
      `,
        [contribution.userId, contribution.amount],
      )
    }

    await client.query('COMMIT')

    return {
      approvedPayment:
        action === 'approve'
          ? {
              id: contributionId,
              amount: toCurrencyNumber(contribution.amount),
              weekKey: kind === 'weekly' ? contribution.weekKey ?? '' : 'Extra',
              paidAt: new Date().toISOString(),
              kind,
              label: kind === 'weekly' ? 'Aporte semanal' : 'Dinero extra',
              status: 'approved',
              hasWeeklyContribution: kind === 'weekly',
            }
          : null,
      userId: contribution.userId,
      account: await getAccountSummary(contribution.userId),
      pendingContributions: await listPendingWeeklyContributions(),
      action: nextStatus,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
