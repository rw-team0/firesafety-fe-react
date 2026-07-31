import EmptyState from '../feedback/EmptyState'
import LoadingState from '../feedback/LoadingState'

// columns: [{ key, header, render?(row) }].
// selection(선택): { selectedKeys, allSelected, onToggle(key), onToggleAll() } — 넘기면 체크박스 열 추가
// onRowClick(선택): 행 클릭 시 이동 등 — 체크박스 클릭은 자동으로 전파 차단됨
export default function DataTable({ columns, rows, rowKey, loading, emptyMessage, selection, onRowClick }) {
  if (loading) return <LoadingState label="목록을 불러오는 중입니다..." />
  if (!rows?.length) return <EmptyState message={emptyMessage} />

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            {selection && (
              <th style={{ width: 36, padding: 'var(--space-8) var(--space-12)' }}>
                <input
                  type="checkbox"
                  checked={selection.allSelected}
                  onChange={selection.onToggleAll}
                  aria-label="전체 선택"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  textAlign: 'left',
                  padding: 'var(--space-8) var(--space-12)',
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row)
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{ borderBottom: '1px solid var(--color-border)', cursor: onRowClick ? 'pointer' : undefined }}
              >
                {selection && (
                  <td
                    style={{ padding: 'var(--space-8) var(--space-12)' }}
                    onClick={(event) => event.stopPropagation()} // 체크박스 클릭이 행 클릭(이동)으로 안 번지게
                  >
                    <input
                      type="checkbox"
                      checked={selection.selectedKeys.includes(key)}
                      onChange={() => selection.onToggle(key)}
                      aria-label="선택"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} style={{ padding: 'var(--space-8) var(--space-12)' }}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
