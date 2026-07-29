import {
  Badge,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Inset,
  SegmentedControl,
  Section,
  Text,
  TextField,
} from '@radix-ui/themes'
import { motion } from 'framer-motion'
import { Fingerprint, ShieldCheck, Sparkles, UserRoundPlus } from 'lucide-react'
import { FormEvent } from 'react'
import heroArt from '../../3356B985-EEDA-4D78-BE8D-1DD8A9293B2A.png'
import { FeedbackMessage } from '../components/common/FeedbackMessage'
import { AccessMode, AccessStats, AccessUser } from '../types/app'

const panelMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
}

type AccessRouteProps = {
  mode: AccessMode
  firstName: string
  lastName: string
  stateId: string
  headline: string
  helperCopy: string
  stats: AccessStats
  demoUsers: AccessUser[]
  submittedMessage: string
  errorMessage: string
  isLoading: boolean
  isSubmitting: boolean
  onModeChange: (mode: AccessMode) => void
  onFirstNameChange: (value: string) => void
  onLastNameChange: (value: string) => void
  onStateIdChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function AccessRoute(props: AccessRouteProps) {
  const {
    mode,
    firstName,
    lastName,
    stateId,
    headline,
    helperCopy,
    stats,
    demoUsers,
    submittedMessage,
    errorMessage,
    isLoading,
    isSubmitting,
    onModeChange,
    onFirstNameChange,
    onLastNameChange,
    onStateIdChange,
    onSubmit,
  } = props

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

              <SegmentedControl.Root value={mode} onValueChange={(value) => onModeChange(value as AccessMode)} size="3">
                <SegmentedControl.Item value="login">Iniciar sesion</SegmentedControl.Item>
                <SegmentedControl.Item value="register">Registrarse</SegmentedControl.Item>
              </SegmentedControl.Root>

              <form className="bo-form access-form" onSubmit={onSubmit}>
                {mode === 'register' ? (
                  <label>
                    <span>Nombre</span>
                    <TextField.Root size="3" value={firstName} onChange={(event) => onFirstNameChange(event.target.value)} placeholder="Matias" />
                  </label>
                ) : null}

                {mode === 'register' ? (
                  <label>
                    <span>Apellido</span>
                    <TextField.Root size="3" value={lastName} onChange={(event) => onLastNameChange(event.target.value)} placeholder="Roldan" />
                  </label>
                ) : null}

                <label>
                  <span>State ID</span>
                  <TextField.Root
                    size="3"
                    type={mode === 'login' ? 'password' : 'text'}
                    value={stateId}
                    onChange={(event) => onStateIdChange(event.target.value)}
                    placeholder={mode === 'login' ? '****' : 'BO-2047'}
                    autoComplete={mode === 'login' ? 'current-password' : 'off'}
                  />
                </label>

                <Button size="3" type="submit" disabled={isLoading || isSubmitting}>
                  {isSubmitting ? 'Procesando...' : mode === 'register' ? 'Crear acceso' : 'Entrar'}
                </Button>
              </form>

              {errorMessage ? <FeedbackMessage tone="error" message={errorMessage} /> : null}
              {submittedMessage ? <FeedbackMessage tone="success" message={submittedMessage} /> : null}

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
