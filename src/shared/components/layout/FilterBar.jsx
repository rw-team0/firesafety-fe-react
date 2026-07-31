// 필터 필드 구성은 화면마다 다름 → 레이아웃 틀만 제공, children으로 조합
// 스타일은 global.css의 .filter-bar — 좁은 화면에서 필드가 눌리지 않게 min-width를 거기서 잡음
export default function FilterBar({ children, actions }) {
  return (
    <div className="filter-bar">
      <div className="filter-bar__fields">{children}</div>
      {actions && <div className="filter-bar__actions">{actions}</div>}
    </div>
  )
}
