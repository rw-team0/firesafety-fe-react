// 필터 필드 구성은 화면마다 다름 → 레이아웃 틀만 제공, children으로 조합
// 스타일은 global.css의 .filter-bar — 좁은 화면에서 필드가 눌리지 않게 min-width를 거기서 잡음
// onReset을 넘긴 화면만 필드 바로 뒤에 초기화 버튼이 붙는다(넘기지 않으면 기존 화면과 동일)
export default function FilterBar({ children, actions, onReset, resetLabel = '초기화' }) {
  return (
    <div className="filter-bar">
      <div className="filter-bar__fields">
        {children}
        {onReset && (
          // 아이콘만 두면 버튼이 커 보이지 않음 — 텍스트는 title/aria-label로만 제공
          <button type="button" className="filter-bar__reset" onClick={onReset} aria-label={resetLabel} title={resetLabel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 12a9 9 0 1 1 3 6.7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M3 21v-6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      {actions && <div className="filter-bar__actions">{actions}</div>}
    </div>
  )
}
