// 미구현 화면 공통 자리표시자 (대량 빈 파일 생성 방지)
// title은 DefaultLayout 헤더가 routeConfig 기준으로 이미 보여주므로 여기서 다시 큰 제목으로 반복하지 않는다
export default function PlaceholderPage({ title, scrId }) {
  return (
    <div>
      <p className="u-text-secondary" style={{ marginBottom: 'var(--space-12)' }}>
        {scrId ? `${scrId} — 구현 예정` : '구현 예정'}
      </p>
      <div className="card u-text-muted">{title} 화면은 아직 구현되지 않았습니다.</div>
    </div>
  )
}
