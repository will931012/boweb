const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim() || ''

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

function buildContributionLines({ user, account, payments }) {
  const weeklyPayment = payments.find((payment) => payment.kind === 'weekly')
  const extraPayments = payments.filter((payment) => payment.kind === 'extra')
  const extraTotal = extraPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const totalAdded = payments.reduce((sum, payment) => sum + payment.amount, 0)

  return [
    `Miembro: ${user.fullName} (${user.stateId})`,
    `Aporte semanal: ${weeklyPayment ? formatCurrency(weeklyPayment.amount) : 'No entregado'}`,
    `Dinero extra: ${extraPayments.length ? formatCurrency(extraTotal) : 'No entregado'}`,
    `Total registrado: ${formatCurrency(totalAdded)}`,
    `Estado de cuenta total: ${formatCurrency(account.totalContributed)}`,
  ]
}

export async function notifyDiscordContribution({ user, account, payments }) {
  if (!discordWebhookUrl || !payments.length) {
    return
  }

  const lines = buildContributionLines({ user, account, payments })

  const response = await fetch(discordWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: [
        'Nuevo movimiento registrado en Black Oaths',
        ...lines,
      ].join('\n'),
      allowed_mentions: {
        parse: [],
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Discord webhook respondio con estado ${response.status}.`)
  }
}
