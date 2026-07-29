import { Badge, Button, Heading, Text, TextField } from '@radix-ui/themes'
import { AccountSummary } from '../../types/app'

type ContributionModalProps = {
  account: AccountSummary | null
  includeWeeklyContribution: boolean
  includeExtraContribution: boolean
  extraContributionAmount: string
  weeklyButtonLabel: string
  isRegisteringPayment: boolean
  onClose: () => void
  onSubmit: () => void
  onWeeklyChange: (checked: boolean) => void
  onExtraChange: (checked: boolean) => void
  onExtraAmountChange: (value: string) => void
}

export function ContributionModal({
  account,
  includeWeeklyContribution,
  includeExtraContribution,
  extraContributionAmount,
  weeklyButtonLabel,
  isRegisteringPayment,
  onClose,
  onSubmit,
  onWeeklyChange,
  onExtraChange,
  onExtraAmountChange,
}: ContributionModalProps) {
  return (
    <div className="contribution-modal-backdrop" onClick={onClose}>
      <div className="contribution-modal" onClick={(event) => event.stopPropagation()}>
        <Badge size="3" radius="full" className="hero-kicker">
          Registrar aporte
        </Badge>
        <Heading size="6" className="contribution-modal-title">
          Confirma el dinero entregado
        </Heading>
        <Text as="p" size="2" className="access-copy">
          Marca el aporte semanal entregado y activa dinero extra si necesitas sumar una cantidad
          adicional. Todo quedara pendiente de aprobacion del admin.
        </Text>

        <label className="contribution-check">
          <input
            type="checkbox"
            checked={includeWeeklyContribution}
            disabled={account?.currentWeekStatus === 'approved' || account?.currentWeekStatus === 'pending'}
            onChange={(event) => onWeeklyChange(event.target.checked)}
          />
          <span>
            Aporte semanal entregado
            <small>
              {account?.currentWeekStatus === 'approved'
                ? `La semana ${account.currentWeekKey} ya fue aprobada.`
                : account?.currentWeekStatus === 'pending'
                  ? `La semana ${account.currentWeekKey} esta esperando revision del admin.`
                  : weeklyButtonLabel}
            </small>
          </span>
        </label>

        <label className="contribution-check">
          <input
            type="checkbox"
            checked={includeExtraContribution}
            onChange={(event) => onExtraChange(event.target.checked)}
          />
          <span>
            Dinero extra entregado
            <small>Tambien quedara pendiente hasta la aprobacion del admin.</small>
          </span>
        </label>

        {includeExtraContribution ? (
          <label className="contribution-amount">
            <span>Monto extra</span>
            <TextField.Root
              size="3"
              type="number"
              min="0"
              step="0.01"
              value={extraContributionAmount}
              onChange={(event) => onExtraAmountChange(event.target.value)}
              placeholder="50.00"
            />
          </label>
        ) : null}

        <div className="contribution-modal-actions">
          <Button variant="soft" color="gray" size="3" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="3" disabled={isRegisteringPayment} onClick={onSubmit}>
            {isRegisteringPayment ? 'Guardando...' : 'Guardar aporte'}
          </Button>
        </div>
      </div>
    </div>
  )
}
