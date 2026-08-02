import { useState } from 'react'
import { searchAddress } from '../api/siteApi'
import Button from '@/shared/components/buttons/Button'
import Input from '@/shared/components/forms/Input'
import Pagination from '@/shared/components/data-display/Pagination'
import BaseModal from '@/shared/components/modals/BaseModal'
import EmptyState from '@/shared/components/feedback/EmptyState'
import '../pages/sitePageShell.css'

const PAGE_SIZE = 5

// 현장 등록/수정 공용 — 키워드로 도로명주소 검색 후 목록+페이지네이션에서 하나를 고르는 모달
export default function AddressSearchModal({ visible, onClose, onSelect }) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1) // Pagination은 1-base, 서버 요청 시 -1
  const [results, setResults] = useState(null)
  const [totalPages, setTotalPages] = useState(1)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  async function runSearch(nextPage) {
    if (!keyword.trim()) return
    setSearching(true)
    setError('')
    try {
      const data = await searchAddress(keyword.trim(), { page: nextPage - 1, size: PAGE_SIZE })
      setResults(data.content ?? [])
      setTotalPages(Math.max(data.totalPages ?? 1, 1))
      setPage(nextPage)
    } catch {
      setError('주소 검색에 실패했습니다.')
      setResults(null)
    } finally {
      setSearching(false)
    }
  }

  function handleSearchClick() {
    runSearch(1)
  }

  function handlePageChange(nextPage) {
    runSearch(nextPage)
  }

  function handleSelect(item) {
    onSelect(item)
    handleClose()
  }

  function handleClose() {
    setKeyword('')
    setResults(null)
    setPage(1)
    setError('')
    onClose()
  }

  return (
    <BaseModal visible={visible} onClose={handleClose} title="주소 검색" overlayTop>
      <div className="site-form__body">
        <div className="account-form__email-row">
          <Input
            label="검색어"
            placeholder="예: 효목동"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSearchClick()
              }
            }}
          />
          <Button type="button" variant="primary" loading={searching} onClick={handleSearchClick}>
            검색
          </Button>
        </div>

        {error && (
          <div className="banner banner-danger" role="alert">
            {error}
          </div>
        )}

        {results && results.length === 0 && <EmptyState message="검색 결과가 없습니다." />}

        {results && results.length > 0 && (
          <>
            <div className="site-form__address-results">
              {results.map((item, index) => (
                <button
                  type="button"
                  key={`${item.address}-${index}`}
                  className="site-form__address-result"
                  onClick={() => handleSelect(item)}
                >
                  <span>{item.address}</span>
                  <span className="site-form__address-result-zip">{item.zipCode}</span>
                </button>
              ))}
            </div>
            {/* 모달 폭이 좁아 기본 10단위 윈도우면 가로 스크롤이 생김 — 5단위로 축소 */}
            <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} pageWindow={5} />
          </>
        )}
      </div>
    </BaseModal>
  )
}
