import { ACTION_COLOR, getFacilityLogDetailRows } from '../utils/facilityAuditLog'
import BaseModal from '@/shared/components/modals/BaseModal'
import Button from '@/shared/components/buttons/Button'
// 계정 관리이력 상세 모달과 레이아웃이 완전히 같아(eyebrow/heading/grid/history) 클래스를 그대로 재사용한다
import '@/features/accounts/components/AccountModal.css'

// 설비 변경 이력 표에서 행을 누르면 뜨는 상세 — 복구 기능은 없다(설비 삭제는 복구 API 자체가 없음)
export default function FacilityAuditLogDetailModal({ visible, log, targetName, actorName, onClose }) {
  if (!log) return null

  const rows = getFacilityLogDetailRows(log)

  const footer = (
    <Button variant="secondary" onClick={onClose}>
      닫기
    </Button>
  )

  return (
    <BaseModal visible={visible} onClose={onClose} title="변경 이력 상세" className="modal-panel--wide" footer={footer}>
      <div className="account-modal__eyebrow">{log.createdAt?.replace('T', ' ')}</div>
      <div className="account-modal__heading">
        <h3>
          {log.targetTypeLabel} · {targetName}
        </h3>
        <span className="badge" style={{ color: ACTION_COLOR[log.action], background: 'var(--color-surface-muted)' }}>
          {log.actionLabel}
        </span>
      </div>

      <div className="account-modal__body">
        <div className="account-modal__grid">
          <div>
            <span className="account-modal__grid-label">처리자</span>
            <p className="account-modal__grid-value">{actorName}</p>
          </div>
          <div>
            <span className="account-modal__grid-label">처리 시각</span>
            <p className="account-modal__grid-value">{log.createdAt?.replace('T', ' ') ?? '-'}</p>
          </div>
        </div>

        <h4 className="account-modal__section-title">변경 내용</h4>
        {rows.length === 0 && <p className="u-text-muted">변경사항이 없습니다.</p>}
        {rows.length > 0 && (
          <ul className="account-modal__history">
            {rows.map((row) => (
              <li key={row.label} className="account-modal__history-row">
                <span className="account-modal__history-date">{row.label}</span>
                <span>{row.before != null ? `${row.before} → ${row.after}` : row.after}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BaseModal>
  )
}
