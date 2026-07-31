// 필터 필드 구성은 화면마다 다름 → 레이아웃 틀만 제공, children으로 조합
export default function FilterBar({ children, actions }) {
  return (
    <div
      className="u-flex u-items-center u-justify-between u-gap-16 u-flex-wrap"
      style={{ marginBottom: 'var(--space-16)' }}
    >
      <div className="u-flex u-items-center u-gap-12 u-flex-wrap">{children}</div>
      {actions && <div className="u-flex u-gap-8 u-flex-wrap">{actions}</div>}
    </div>
  )
}
