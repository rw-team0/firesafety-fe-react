// 처음/이전/페이지번호(윈도우 단위)/다음/마지막, 하단 중앙 정렬 (firesafety-fe BasePagination.vue 형식)
// page/totalPages는 1-base
export default function Pagination({ page, totalPages, onChange, pageWindow = 10 }) {
  if (totalPages <= 1) return null

  const isFirstPage = page <= 1
  const isLastPage = page >= totalPages

  // 현재 페이지가 속한 윈도우(예: 1~10, 11~20)만 노출
  const windowStart = Math.floor((page - 1) / pageWindow) * pageWindow + 1
  const windowEnd = Math.min(windowStart + pageWindow - 1, totalPages)
  const pageNumbers = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i)

  function goTo(nextPage) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return
    onChange(nextPage)
  }

  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button
        type="button"
        className="pagination__button"
        disabled={isFirstPage}
        aria-label="처음 페이지로 이동"
        onClick={() => goTo(1)}
      >
        «
      </button>
      <button
        type="button"
        className="pagination__button"
        disabled={isFirstPage}
        aria-label="이전 페이지로 이동"
        onClick={() => goTo(page - 1)}
      >
        ‹
      </button>

      {pageNumbers.map((n) => (
        <button
          key={n}
          type="button"
          className={`pagination__page ${n === page ? 'is-active' : ''}`.trim()}
          aria-current={n === page ? 'page' : undefined}
          onClick={() => goTo(n)}
        >
          {n}
        </button>
      ))}

      <button
        type="button"
        className="pagination__button"
        disabled={isLastPage}
        aria-label="다음 페이지로 이동"
        onClick={() => goTo(page + 1)}
      >
        ›
      </button>
      <button
        type="button"
        className="pagination__button"
        disabled={isLastPage}
        aria-label="마지막 페이지로 이동"
        onClick={() => goTo(totalPages)}
      >
        »
      </button>
    </nav>
  )
}
