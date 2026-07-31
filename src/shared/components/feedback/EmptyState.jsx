// 데이터 없음 공통 표시. description은 역할별 유도 문구용(읽기전용 사용자에겐 안 넘김), action으로 버튼 추가 가능
export default function EmptyState({ message = '표시할 데이터가 없습니다.', description, action }) {
  return (
    <div className="empty-state">
      <p className="empty-state__message">{message}</p>
      {description && <p className="empty-state__description">{description}</p>}
      {action}
    </div>
  )
}
