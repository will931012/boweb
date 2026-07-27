import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Inset,
  Section,
  SegmentedControl,
  Text,
  TextField,
} from '@radix-ui/themes'
import { Fingerprint, ShieldCheck, Sparkles, UserRoundPlus } from 'lucide-react'
import { motion } from 'framer-motion'
import heroArt from '../3356B985-EEDA-4D78-BE8D-1DD8A9293B2A.png'

type AccessMode = 'login' | 'register'

type AccessStats = {
  totalUsers: number
  recentlyCreated: number
  activeToday: number
}

type AccessUser = {
  id: number
  firstName: string
  lastName: string
  fullName: string
  stateId: string
  role: string
  createdAt: string
  lastLoginAt: string | null
}

type BootstrapResponse = {
  ok: boolean
  message: string
  stats: AccessStats
  demoUsers: AccessUser[]
}

type AccessResponse = {
  ok: boolean
  message: string
  stats?: AccessStats
  user?: AccessUser
}

const panelMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
}

const initialStats: AccessStats = {
  totalUsers: 0,
  recentlyCreated: 0,
  activeToday: 0,
}

function App() {
  const [mode, setMode] = useState<AccessMode>('login')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [stateId, setStateId] = useState('')
  const [submittedMessage, setSubmittedMessage] = useState('Cargando backend...')
  const [errorMessage, setErrorMessage] = useState('')
  const [stats, setStats] = useState<AccessStats>(initialStats)
  const [demoUsers, setDemoUsers] = useState<AccessUser[]>([])
  const [currentUser, setCurrentUser] = useState<AccessUser | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        const response = await fetch('/api/access/bootstrap')
        const data = (await response.json()) as BootstrapResponse

        if (!response.ok || !data.ok) {
          throw new Error(data.message ?? 'No se pudo inicializar el acceso.')
        }

        setStats(data.stats)
        setDemoUsers(data.demoUsers)
        setSubmittedMessage(data.message)
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'No se pudo conectar con el backend.',
        )
        setSubmittedMessage('')
      } finally {
        setIsLoading(false)
      }
    }

    void loadBootstrap()
  }, [])

  const headline = useMemo(() => {
    if (mode === 'register') {
      return 'Crea tu acceso con identidad clara desde el primer segundo.'
    }

    return 'Entra al sistema solo con tu nombre y tu State ID.'
  }, [mode])

  const helperCopy = useMemo(() => {
    if (mode === 'register') {
      return 'El backend ya prepara altas nuevas y evita State ID duplicados.'
    }

    return 'El login ya valida contra el backend usando solo nombre y State ID.'
  }, [mode])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanFirstName = firstName.trim()
    const cleanLastName = lastName.trim()
    const cleanStateId = stateId.trim()

    if (mode === 'register') {
      if (!cleanFirstName || !cleanLastName || !cleanStateId) {
        setErrorMessage('Completa nombre, apellido y State ID para continuar.')
        setSubmittedMessage('')
        return
      }
    } else if (!cleanFirstName || !cleanStateId) {
      setErrorMessage('Completa nombre y State ID para continuar.')
      setSubmittedMessage('')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSubmittedMessage('')

    try {
      const endpoint = mode === 'register' ? '/api/access/register' : '/api/access/login'
      const payload =
        mode === 'register'
          ? { firstName: cleanFirstName, lastName: cleanLastName, stateId: cleanStateId }
          : { firstName: cleanFirstName, stateId: cleanStateId }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as AccessResponse

      if (!response.ok || !data.ok || !data.user || !data.stats) {
        throw new Error(data.message ?? 'No se pudo completar la operacion.')
      }

      setCurrentUser(data.user)
      setStats(data.stats)
      setSubmittedMessage(data.message)

      if (mode === 'register') {
        setDemoUsers((currentUsers) => [...currentUsers, data.user!])
        setLastName('')
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Error inesperado al procesar el acceso.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="bo-page">
      <div className="bo-grid" />
      <Section size="1" className="bo-shell access-shell">
        <motion.section className="access-layout" {...panelMotion}>
          <Card className="hero-art-card access-art-card">
            <Inset clip="padding-box" side="all" pb="current">
              <img src={heroArt} alt="Graffiti Black Oaths" className="hero-art" />
            </Inset>
            <div className="art-overlay-copy">
              <Badge size="3" radius="full" className="hero-kicker">
                BLACK OATHS
              </Badge>
              <Heading size="8" className="overlay-title">
                Zona de acceso
              </Heading>
              <Text as="p" size="3" className="overlay-body">
                El backend del acceso ya esta activo para login y registro con State ID.
              </Text>
            </div>
          </Card>

          <Card className="glow-card access-card">
            <Flex direction="column" gap="5">
              <div>
                <Badge size="3" radius="full" className="hero-kicker">
                  Login / Register
                </Badge>
                <Heading size="8" className="access-title">
                  {headline}
                </Heading>
                <Text as="p" size="3" className="access-copy">
                  {helperCopy}
                </Text>
              </div>

              <SegmentedControl.Root
                value={mode}
                onValueChange={(value) => setMode(value as AccessMode)}
                size="3"
              >
                <SegmentedControl.Item value="login">Iniciar sesion</SegmentedControl.Item>
                <SegmentedControl.Item value="register">Registrarse</SegmentedControl.Item>
              </SegmentedControl.Root>

              <form className="bo-form access-form" onSubmit={handleSubmit}>
                <label>
                  <span>Nombre</span>
                  <TextField.Root
                    size="3"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Matias"
                  />
                </label>

                {mode === 'register' ? (
                  <label>
                    <span>Apellido</span>
                    <TextField.Root
                      size="3"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Roldan"
                    />
                  </label>
                ) : null}

                <label>
                  <span>State ID</span>
                  <TextField.Root
                    size="3"
                    value={stateId}
                    onChange={(event) => setStateId(event.target.value)}
                    placeholder="BO-2047"
                  />
                </label>

                <Button size="3" type="submit" disabled={isLoading || isSubmitting}>
                  {isSubmitting ? 'Procesando...' : mode === 'register' ? 'Crear acceso' : 'Entrar'}
                </Button>
              </form>

              {errorMessage ? <p className="hero-error access-feedback">{errorMessage}</p> : null}
              {submittedMessage ? (
                <p className="hero-success access-feedback success">{submittedMessage}</p>
              ) : null}

              {currentUser ? (
                <Card className="mini-info-card current-user-card">
                  <strong>{currentUser.fullName}</strong>
                  <p>State ID: {currentUser.stateId}</p>
                  <p>Rol: {currentUser.role}</p>
                </Card>
              ) : null}

              <Grid columns={{ initial: '1', sm: '3' }} gap="3">
                <Card className="mini-info-card">
                  <span className="section-icon">
                    <Fingerprint size={18} />
                  </span>
                  <strong>{stats.totalUsers}</strong>
                  <p>usuarios totales en el sistema de acceso.</p>
                </Card>

                <Card className="mini-info-card">
                  <span className="section-icon">
                    <ShieldCheck size={18} />
                  </span>
                  <strong>{stats.activeToday}</strong>
                  <p>sesiones activas registradas el 26 de julio de 2026.</p>
                </Card>

                <Card className="mini-info-card">
                  <span className="section-icon">
                    <UserRoundPlus size={18} />
                  </span>
                  <strong>{stats.recentlyCreated}</strong>
                  <p>altas creadas durante los ultimos 7 dias.</p>
                </Card>
              </Grid>
            </Flex>
          </Card>
        </motion.section>

        <motion.section className="access-bottom-strip" {...panelMotion}>
          <div className="bottom-chip">
            <Sparkles size={18} />
            <span>Backend activo para altas, login y validacion de State ID.</span>
          </div>
          <div className="bottom-chip muted">
            <span>Usuarios demo:</span>
            {demoUsers.slice(0, 3).map((user) => (
              <strong key={user.id}>
                {user.firstName} {user.stateId}
              </strong>
            ))}
          </div>
        </motion.section>
      </Section>
    </main>
  )
}

export default App
