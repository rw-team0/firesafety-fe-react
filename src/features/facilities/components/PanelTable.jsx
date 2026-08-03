import DataTable from '@/shared/components/data-display/DataTable'
import Button from '@/shared/components/buttons/Button'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import { formatDateTimeCell, formatOnline, formatPanelStatus } from '../utils/facilityFormatters'

// 분전반 테이블
export default function PanelTable({
  panels,
  loading,
  canManage,
  selectedIds = [],
  onToggle,
  onToggleAll,
  onRowClick,
  onEdit,
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

  if (onEdit) {
    columns.push({
      key: 'actions',
      header: '관리',
      render: (row) => (
        <Button
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation()
            onEdit(row)
          }}
        >
          수정
        </Button>
      ),
    })
  }

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
