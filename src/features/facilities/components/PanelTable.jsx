import DataTable from '@/shared/components/data-display/DataTable'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import { formatDateTimeCell, formatOnline, formatPanelStatus } from '../utils/facilityFormatters'

// 분전반 테이블 — 행 클릭으로 상세/관리 모달을 여는 화면에서 공용으로 쓴다.
// 수정은 행 클릭 시 열리는 모달(PanelDetailModal) 안에서 처리하므로 이 테이블 자체에는 수정 버튼 컬럼이 없다.
export default function PanelTable({
  panels,
  loading,
  canManage,
  selectedIds = [],
  onToggle,
  onToggleAll,
  onRowClick,
  emptyDescription,
}) {
  const columns = [
    { key: 'deviceSerial', header: '장비번호', render: (row) => row.deviceSerial || '-' },
    { key: 'name', header: '위치', render: (row) => row.name || '-' },
    { key: 'mNo', header: '분전반No', render: (row) => row.mNo || '-' },
    {
      key: 'status',
      header: '상태',
      render: (row) => <StatusBadge status={row.status} label={formatPanelStatus(row.status)} />,
    },
    { key: 'isOnline', header: '통신 상태', render: (row) => formatOnline(row.isOnline) },
    { key: 'lastCommunicatedAt', header: '최근 통신 시각', render: (row) => formatDateTimeCell(row.lastCommunicatedAt) },
  ]

  return (
    <DataTable
      loading={loading}
      rows={panels}
      rowKey={(row) => row.panelId}
      onRowClick={onRowClick}
      selection={
        canManage
          ? {
              selectedKeys: selectedIds,
              allSelected: panels.length > 0 && panels.every((panel) => selectedIds.includes(panel.panelId)),
              onToggle,
              onToggleAll,
            }
          : undefined
      }
      emptyMessage="현재 현장에 등록된 분전반이 없습니다."
      emptyDescription={emptyDescription}
      columns={columns}
    />
  )
}
