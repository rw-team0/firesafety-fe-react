// 화면 상단 제목+부제+우측 액션 버튼 영역 공통 틀
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="u-flex u-items-center u-justify-between" style={{ marginBottom: 'var(--space-20)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--font-size-title)', fontWeight: 700 }}>{title}</h1>
        {subtitle && <p className="u-text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="u-flex u-gap-8">{actions}</div>}
    </header>
  )
}
