import { ACTION_COLOR, getLogDetailRows } from '../utils/auditLog'
import Button from '@/shared/components/buttons/Button'
import BaseModal from '@/shared/components/modals/BaseModal'
import './AccountModal.css'

// 관리이력 표에서 행을 누르면 뜨는 상세 — 변경 내용 컬럼을 표에서 빼는 대신 여기서 필드별로 보여준다
export default function AuditLogDetailModal({ visible, log, targetName, actorName, onClose, onRestore }) {
  if (!log) return null

  const rows = getLogDetailRows(log)

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        닫기
      </Button>
      {log.action === 'DELETE' && (
        <Button variant="primary" onClick={() => onRestore(log.targetUserId)}>
          복구
        </Button>
      )}
    </>
  )

  return (
    <BaseModal visible={visible} onClose={onClose} title="관리이력 상세" className="modal-panel--wide" footer={footer}>
      <div className="account-modal__eyebrow">{log.createdAt?.replace('T', ' ')}</div>
      <div className="account-modal__heading">
        <h3>{targetName}</h3>
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
