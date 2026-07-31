import EmptyState from '../feedback/EmptyState'
import LoadingState from '../feedback/LoadingState'

// columns: [{ key, header, render?(row), className? }].
// selection(선택): { selectedKeys, allSelected, onToggle(key), onToggleAll() } — 넘기면 체크박스 열 추가
// onRowClick(선택): 행 클릭 시 이동 등 — 체크박스 클릭은 자동으로 전파 차단됨
// 스타일은 global.css의 .data-table 계열 — 좁은 화면에선 wrap만 가로 스크롤되고 페이지 본문은 안 밀림
export default function DataTable({
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage,
  emptyDescription,
  selection,
  onRowClick,
}) {
  if (loading) return <LoadingState label="목록을 불러오는 중입니다..." />
  if (!rows?.length) return <EmptyState message={emptyMessage} description={emptyDescription} />

  return (
    <div className="data-table__wrap">
      <table className="data-table">
        <thead>
          <tr>
            {selection && (
              <th className="data-table__checkbox-cell">
                <input
                  type="checkbox"
                  checked={selection.allSelected}
                  onChange={selection.onToggleAll}
                  aria-label="전체 선택"
                />
              </th>
            )}
            {columns.map((column) => (
              <th key={column.key} className={column.className}>
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
                className={onRowClick ? 'is-clickable' : undefined}
              >
                {selection && (
                  <td
                    className="data-table__checkbox-cell"
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
                  <td key={column.key} className={column.className}>
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
