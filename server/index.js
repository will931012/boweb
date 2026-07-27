import path from 'path'
import { fileURLToPath } from 'url'
import app, { initAppDatabase } from './app.js'

const port = Number(process.env.PORT) || 4000
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.resolve(__dirname, '../dist')
app.use(express.static(distPath))

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

  app.listen(port, () => {
    console.log(`BoWebsite backend running on http://localhost:${port}`)
  })
}

startServer().catch((error) => {
  console.error('No se pudo iniciar el backend:', error)
  process.exit(1)
})
