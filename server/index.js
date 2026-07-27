import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import app, { initAppDatabase } from './app.js'
import {
  getCurrentWeekKey,
  listUsersMissingWeeklyContribution,
  markDailyDiscordNotificationSent,
} from './db.js'
import { getDiscordReminderTimeZone, notifyDiscordMissingWeeklyContributions } from './discord.js'

const port = Number(process.env.PORT) || 4000
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.resolve(__dirname, '../dist')
app.use(express.static(distPath))

function getReminderDateParts(date = new Date(), timeZone = getDiscordReminderTimeZone()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  )

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parts.hour,
    minute: parts.minute,
  }
}

async function runDailyDiscordReminderCheck() {
  const timeZone = getDiscordReminderTimeZone()
  const reminderParts = getReminderDateParts(new Date(), timeZone)

  if (reminderParts.hour !== '00' || reminderParts.minute !== '00') {
    return
  }

  const weekKey = getCurrentWeekKey()
  const claimed = await markDailyDiscordNotificationSent(
    'missing-weekly-contributions',
    reminderParts.dateKey,
    weekKey,
  )

  if (!claimed) {
    return
  }

  const missingUsers = await listUsersMissingWeeklyContribution(weekKey)

  await notifyDiscordMissingWeeklyContributions({
    weekKey,
    missingUsers,
    reminderDate: reminderParts.dateKey,
  })
}

function startDailyDiscordReminderScheduler() {
  const runCheck = () => {
    void runDailyDiscordReminderCheck().catch((error) => {
      console.error('No se pudo enviar el recordatorio diario de Discord:', error)
    })
  }

  runCheck()
  setInterval(runCheck, 60 * 1000)
}

app.get('*', (request, response) => {
  if (request.path.startsWith('/api')) {
    response.status(404).json({
      ok: false,
      message: 'Ruta API no encontrada.',
    })
    return
  }

  response.sendFile(path.join(distPath, 'index.html'), (error) => {
    if (!error) {
      return
    }

    response.status(503).send(
      'Frontend no generado todavia. Ejecuta "npm run build" o usa "npm run dev" y abre http://localhost:5173.',
    )
  })
})

async function startServer() {
  await initAppDatabase()
  startDailyDiscordReminderScheduler()

  app.listen(port, () => {
    console.log(`BoWebsite backend running on http://localhost:${port}`)
  })
}

startServer().catch((error) => {
  console.error('No se pudo iniciar el backend:', error)
  process.exit(1)
})
