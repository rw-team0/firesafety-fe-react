import { formatInspectionDateTime, formatInspectionResult, getInspectionResultColor } from '../utils/inspectionFormatters'
import Button from '@/shared/components/buttons/Button'
import DataTable from '@/shared/components/data-display/DataTable'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import BaseModal from '@/shared/components/modals/BaseModal'

// 점검 이력 상세 모달
export default function InspectionHistoryDetailModal({ visible, history, onClose }) {
  if (!history) return null

  const columns = [
    { key: 'itemName', header: '점검 항목' },
    {
      key: 'result',
      header: '결과',
      render: (item) => (
        <StatusBadge
          status={item.result}
          label={formatInspectionResult(item.result)}
          color={getInspectionResultColor(item.result)}
        />
      ),
    },
  ]

  return (
    <BaseModal
      visible={visible}
      title="점검 이력 상세"
      onClose={onClose}
      className="facility-modal inspection-modal"
      footer={
        <Button variant="primary" onClick={onClose}>
          확인
        </Button>
      }
    >
      <div className="facility-modal__body">
        <div className="facility-modal__grid">
          <div>
            <span className="facility-modal__grid-label">점검일시</span>
            <span className="facility-modal__grid-value">{formatInspectionDateTime(history.inspectedAt)}</span>
          </div>
          <div>
            <span className="facility-modal__grid-label">점검자</span>
            <span className="facility-modal__grid-value">{history.inspectorName || '-'}</span>
          </div>
          <div className="facility-modal__grid-full">
            <span className="facility-modal__grid-label">비고</span>
            <span className="facility-modal__grid-value">{history.note || '-'}</span>
          </div>
        </div>

        <h4 className="facility-modal__section-title">항목별 결과</h4>
        <div className="inspection-apply-table">
          <DataTable
            columns={columns}
            rows={history.results ?? []}
            rowKey={(item) => item.itemId}
            emptyMessage="점검 결과 항목이 없습니다."
          />
        </div>
      </div>
    </BaseModal>
  )
}
