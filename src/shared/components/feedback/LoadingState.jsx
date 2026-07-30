// 목록/화면 로딩 중 공통 표시
export default function LoadingState({ label = '불러오는 중입니다...' }) {
  return (
    <div className="u-flex u-items-center u-gap-8" role="status" style={{ padding: 'var(--space-32)' }}>
      <span className="spinner" aria-hidden="true" />
      <span className="u-text-secondary">{label}</span>
    </div>
  )
}
