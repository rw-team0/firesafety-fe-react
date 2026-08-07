import { ALERT_SEVERITY_COLOR } from '@/shared/constants/domainColors'

// CAUTION은 경고 삼각형(전역 위험 팝업과 같은 모양), RISK는 팔각형 정지 신호 — 모양 자체로 구분되게 한다
function CautionTriangle() {
  return (
    <path
      d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

function RiskOctagon() {
  return (
    <>
      <path
        d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}

export default function AlertSeverityIcon({ severity, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ color: ALERT_SEVERITY_COLOR[severity] ?? 'var(--color-text-muted)' }}
    >
      {severity === 'RISK' ? <RiskOctagon /> : <CautionTriangle />}
    </svg>
  )
}
