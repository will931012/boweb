const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim() || ''
const reminderTimeZone = process.env.DISCORD_REMINDER_TIMEZONE?.trim() || 'America/New_York'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

function buildContributionLines({ user, account, payments, hasWeeklyContribution = false }) {
  const weeklyPayment = payments.find((payment) => payment.kind === 'weekly')
  const extraPayments = payments.filter((payment) => payment.kind === 'extra')
  const extraTotal = extraPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const totalAdded = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const weeklyDelivered = hasWeeklyContribution || Boolean(weeklyPayment)

  return [
    `👤 Miembro: ${user.fullName} (${user.stateId})`,
    `📅 Aporte semanal: ${weeklyDelivered ? formatCurrency(weeklyPayment?.amount ?? 0) : 'No entregado'}`,
    `💵 Dinero extra: ${extraPayments.length ? formatCurrency(extraTotal) : 'No entregado'}`,
    `🧾 Total registrado: ${formatCurrency(totalAdded)}`,
    `🏦 Estado de cuenta total: ${formatCurrency(account.globalTotalContributed ?? 0)}`,
  ]
}

export async function notifyDiscordContribution({
  user,
  account,
  payments,
  hasWeeklyContribution = false,
}) {
  if (!discordWebhookUrl || !payments.length) {
    return
  }

  const lines = buildContributionLines({
    user,
    account,
    payments,
    hasWeeklyContribution,
  })

  const response = await fetch(discordWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: ['🔥 Nuevo movimiento registrado en Black Oaths', ...lines].join('\n'),
      allowed_mentions: {
        parse: [],
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Discord webhook respondio con estado ${response.status}.`)
  }
}

export function getDiscordReminderTimeZone() {
  return reminderTimeZone
}

export async function notifyDiscordMissingWeeklyContributions({
  weekKey,
  missingUsers,
  reminderDate,
}) {
  if (!discordWebhookUrl) {
    return
  }

  const contentLines = [
    `📣 Recordatorio diario de aportes`,
    `🗓️ Fecha: ${reminderDate}`,
    `📅 Semana actual: ${weekKey}`,
  ]

  if (missingUsers.length) {
    contentLines.push(`⚠️ Usuarios pendientes por aportar: ${missingUsers.length}`)
    contentLines.push(
      ...missingUsers.map(
        (user, index) => `🔸 ${index + 1}. ${user.fullName} (${user.stateId}) - ${user.weeklyStatus}`,
      ),
    )
  } else {
    contentLines.push('✅ Todos los usuarios ya estan al dia en la semana actual.')
  }

  const response = await fetch(discordWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: contentLines.join('\n'),
      allowed_mentions: {
        parse: [],
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Discord webhook respondio con estado ${response.status}.`)
  }
}
