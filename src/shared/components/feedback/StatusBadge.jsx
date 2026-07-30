import { STATUS_BADGE_COLOR } from '@/shared/constants/domainColors'

const BG_BY_COLOR = {
  'var(--color-success)': 'var(--color-success-bg)',
  'var(--color-warning)': 'var(--color-warning-bg)',
  'var(--color-danger)': 'var(--color-danger-bg)',
  'var(--color-offline)': 'var(--color-offline-bg)',
}

// status: NORMAL/CAUTION/RISK/OFFLINE/UNCONFIRMED/CONFIRMED/RESOLVED
// label은 항상 호출부에서 지정 (같은 값이라도 화면마다 표기 다를 수 있음)
export default function StatusBadge({ status, label, color }) {
  const resolvedColor = color ?? STATUS_BADGE_COLOR[status] ?? 'var(--color-text-muted)'
  const background = BG_BY_COLOR[resolvedColor] ?? 'var(--color-surface-muted)'

  return (
    <span className="badge" style={{ color: resolvedColor, background }}>
      {label ?? status}
    </span>
  )
}
