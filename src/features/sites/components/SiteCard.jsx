import Button from '@/shared/components/buttons/Button'
import './SiteCard.css'

// 카드 전체가 입장 버튼 역할 — 관리 버튼은 클릭이 카드까지 올라가지 않도록 stopPropagation
export default function SiteCard({ site, manageable = false, isCurrent = false, onEnter, onEdit, onDelete }) {
  function stopAnd(handler) {
    return (event) => {
      event.stopPropagation()
      handler(site)
    }
  }

  return (
    <div
      className={`site-card ${isCurrent ? 'is-current' : ''}`.trim()}
      role="button"
      tabIndex={0}
      aria-label={`${site.name} 현장 선택`}
      onClick={() => onEnter(site)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onEnter(site)
        }
      }}
    >
      <div className="site-card__head">
        <h3 className="site-card__name">{site.name}</h3>
        {isCurrent && <span className="site-card__badge">선택됨</span>}
      </div>

      <div className="site-card__meta">
        <p className="site-card__address">{site.address || '주소 미등록'}</p>
        {site.zipCode && <p className="site-card__zip">우편번호 {site.zipCode}</p>}
        {/* panelCount는 상세 응답에만 있어 목록 카드에서는 표시 안 함(백엔드 SiteListRes 확인) */}
      </div>

      <div className="site-card__actions">
        {/* 관리 액션은 ghost로 낮춰서 주요 액션(입장)과 시각적으로 구분 */}
        {manageable && (
          <div className="site-card__manage">
            <Button variant="ghost" onClick={stopAnd(onEdit)}>
              수정
            </Button>
            <Button variant="ghost" className="site-card__delete" onClick={stopAnd(onDelete)}>
              삭제
            </Button>
          </div>
        )}
        <Button variant="primary" onClick={stopAnd(onEnter)}>
          입장
        </Button>
      </div>
    </div>
  )
}
