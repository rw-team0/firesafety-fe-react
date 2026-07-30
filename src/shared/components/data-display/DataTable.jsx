import EmptyState from '../feedback/EmptyState'
import LoadingState from '../feedback/LoadingState'

// columns: [{ key, header, render?(row) }]. 정렬/선택 등은 필요해지면 추가 (현재 미구현)
export default function DataTable({ columns, rows, rowKey, loading, emptyMessage }) {
  if (loading) return <LoadingState label="목록을 불러오는 중입니다..." />
  if (!rows?.length) return <EmptyState message={emptyMessage} />

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
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
          {rows.map((row) => (
            <tr key={rowKey(row)} style={{ borderBottom: '1px solid var(--color-border)' }}>
              {columns.map((column) => (
                <td key={column.key} style={{ padding: 'var(--space-8) var(--space-12)' }}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
