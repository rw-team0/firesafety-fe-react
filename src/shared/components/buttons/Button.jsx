const VARIANTS = ['primary', 'secondary', 'danger', 'ghost']

// variant 제한 집합 + loading 상태 스피너 포함한 공통 버튼
export default function Button({
  variant = 'primary',
  type = 'button',
  disabled = false,
  loading = false,
  children,
  className = '',
  ...rest
}) {
  const resolvedVariant = VARIANTS.includes(variant) ? variant : 'primary' // 잘못된 값 방어 → primary 대체

  return (
    <button
      type={type}
      className={`btn btn-${resolvedVariant} ${className}`.trim()}
      disabled={disabled || loading} // 로딩 중 중복 클릭 방지
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}
