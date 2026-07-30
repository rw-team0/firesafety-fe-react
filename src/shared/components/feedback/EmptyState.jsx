// 데이터 없음 공통 표시. action으로 "등록하기" 같은 버튼 추가 가능
export default function EmptyState({ message = '표시할 데이터가 없습니다.', action }) {
  return (
    <div className="u-flex-col u-items-center u-gap-12" style={{ padding: 'var(--space-32)', textAlign: 'center' }}>
      <p className="u-text-muted">{message}</p>
      {action}
    </div>
  )
}
