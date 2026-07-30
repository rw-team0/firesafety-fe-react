import PageHeader from '@/shared/components/layout/PageHeader'

// 미구현 화면 공통 자리표시자 (대량 빈 파일 생성 방지)
export default function PlaceholderPage({ title, scrId }) {
  return (
    <div>
      <PageHeader title={title} subtitle={scrId ? `${scrId} — 구현 예정` : '구현 예정'} />
      <div className="card u-text-muted">이 화면은 아직 구현되지 않았습니다.</div>
    </div>
  )
}
