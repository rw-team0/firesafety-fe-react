// 모바일 미구현 화면 공통 자리표시자 — PlaceholderPage(PC)와 로직은 같아 보여도 항상 별도 컴포넌트로 유지
// (모바일 화면은 PC와 절대 컴포넌트를 공유하지 않는다는 방침, MobileLoginPage/MobileSiteSelectPage와 동일 원칙)
export default function MobilePlaceholderPage({ title, scrId }) {
  return (
    <div>
      <p className="u-text-secondary" style={{ marginBottom: 'var(--space-12)' }}>
        {scrId ? `${scrId} — 구현 예정` : '구현 예정'}
      </p>
      <div className="card u-text-muted">{title} 화면은 아직 구현되지 않았습니다.</div>
    </div>
  )
}
