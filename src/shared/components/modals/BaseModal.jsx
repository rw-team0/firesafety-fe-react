import { useModalA11y } from '@/shared/hooks/useModalA11y'

export default function BaseModal({
  visible,
  onClose,
  title,
  danger = false,
  closeOnBackdrop = true,
  overlayTop = false,
  hideHeader = false, // ActionResultModal처럼 자체 중앙정렬 헤더를 쓰는 경우 기본 헤더바를 숨김
  children,
  footer,
}) {
  const panelRef = useModalA11y({ visible, onClose }) // 포커스 트랩 + ESC 닫기

  if (!visible) return null // 비표시면 렌더 자체 스킵 (DOM에서 완전히 제거)

  return (
    <div
      className={`modal-overlay ${overlayTop ? 'modal-overlay-top' : ''}`.trim()}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()} // 패널 클릭이 배경 클릭으로 버블링되어 닫히는 것 방지
      >
        {!hideHeader && (
          <div className={`modal-header ${danger ? 'danger' : ''}`.trim()}>
            <span>{title}</span>
            <button type="button" className="modal-close" aria-label="닫기" onClick={onClose}>
              ×
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-actions">{footer}</div>}
      </div>
    </div>
  )
}
