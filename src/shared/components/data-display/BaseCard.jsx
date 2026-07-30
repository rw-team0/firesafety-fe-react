// 카드형 컨테이너 공통 틀. header/footer는 선택적
export default function BaseCard({ header, footer, children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`.trim()} {...rest}>
      {header && (
        <div className="u-flex u-justify-between u-items-center" style={{ marginBottom: 'var(--space-12)' }}>
          {header}
        </div>
      )}
      {children}
      {footer && <div style={{ marginTop: 'var(--space-12)' }}>{footer}</div>}
    </section>
  )
}
