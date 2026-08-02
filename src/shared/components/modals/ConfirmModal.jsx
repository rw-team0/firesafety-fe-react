import BaseModal from './BaseModal'
import Button from '../buttons/Button'

// 삭제/취소 등 실행 전 확인. children으로 요약 카드 등 추가 정보를 끼워 넣을 수 있음 (firesafety-fe 예약취소 모달 형식)
export default function ConfirmModal({
  visible,
  title = '확인',
  message,
  danger = false,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
  children,
}) {
  const accent = danger ? 'var(--color-danger)' : 'var(--color-brand)'

  return (
    <BaseModal
      visible={visible}
      onClose={onCancel} // 배경 클릭/ESC도 취소로 처리
      hideHeader
      className="modal-panel--narrow"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="confirm-modal">
        <span className="confirm-modal__icon" style={{ borderColor: accent, color: accent }}>
          !
        </span>
        <h3 className="confirm-modal__title">{title}</h3>
        {message && <p className="confirm-modal__message">{message}</p>}
        {children && <div className="confirm-modal__extra">{children}</div>}
      </div>
    </BaseModal>
  )
}
