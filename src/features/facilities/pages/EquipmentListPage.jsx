import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPanels } from '../api/facilityApi'
import PanelTable from '../components/PanelTable'
import { EQUIPMENT_LIST_PAGE_SIZE } from '../constants/facilityConstants'
import { includesPanelKeyword, PANEL_STATUS_OPTIONS } from '../utils/facilityFormatters'
import { useSite } from '@/features/sites/useSite'
import BaseCard from '@/shared/components/data-display/BaseCard'
import Pagination from '@/shared/components/data-display/Pagination'
import ErrorState from '@/shared/components/feedback/ErrorState'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import FilterBar from '@/shared/components/layout/FilterBar'
import { buildPath, ROUTE_PATHS } from '@/shared/constants/routePaths'
import './FacilityPages.css'

const PAGE_SIZE = EQUIPMENT_LIST_PAGE_SIZE

// 설비 모니터링 화면(SCR-501) — 조회 전용. 등록/수정/삭제는 설비관리(SCR-502)에서만 한다.
export default function EquipmentListPage() {
  const { currentSiteId } = useSite()
  const navigate = useNavigate()
  const requestSeqRef = useRef(0)

  const [panels, setPanels] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  // 분전반 목록 조회
  const load = useCallback(async () => {
    const siteId = currentSiteId
    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq

    setPanels([])
    setPage(1)

    if (!siteId) {
      setLoading(false)
      setLoadError('설비 모니터링은 현장 선택 후 이용할 수 있습니다.')
      return
    }

    setLoading(true)
    setLoadError('')
    try {
      const data = await getPanels({ siteId, status })
      if (requestSeqRef.current !== seq) return
      setPanels(data ?? [])
    } catch (error) {
      if (requestSeqRef.current !== seq) return
      const statusCode = error?.response?.status
      setLoadError(statusCode === 403 ? '현재 현장의 설비를 조회할 권한이 없습니다.' : '설비 모니터링 목록을 불러오지 못했습니다.')
    } finally {
      if (requestSeqRef.current === seq) setLoading(false)
    }
  }, [currentSiteId, status])

  useEffect(() => {
    // 현장/상태가 바뀌면 이전 현장 목록이 남지 않게 즉시 비우고 stale 응답을 무시한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return () => {
      requestSeqRef.current += 1
    }
  }, [load])

  const normalizedKeyword = keyword.trim()
  const filteredPanels = panels.filter((panel) => includesPanelKeyword(panel, normalizedKeyword))
  const totalPages = Math.max(1, Math.ceil(filteredPanels.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedPanels = filteredPanels.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (loadError) return <ErrorState message={loadError} onRetry={load} />

  return (
    <div className="facility-page">
      <BaseCard className="card--filter">
        <FilterBar
          onReset={() => {
            setKeyword('')
            setStatus('')
            setPage(1)
          }}
        >
          <Input
            aria-label="설비 검색"
            placeholder="장비번호, 분전반명, 분전반No"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
          />
          <Select
            aria-label="상태"
            placeholder="전체 상태"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            options={PANEL_STATUS_OPTIONS}
          />
        </FilterBar>
      </BaseCard>

      <PanelTable
        loading={loading}
        panels={pagedPanels}
        onRowClick={(panel) => navigate(buildPath(ROUTE_PATHS.equipmentDetail, { panelId: panel.panelId }))}
        emptyDescription="현재 현장에 등록된 분전반이 없습니다. 설비관리 화면에서 등록할 수 있습니다."
      />

      {!loading && filteredPanels.length > 0 && (
        <div className="facility-list__footer">
          <p className="facility-list__count">
            총 {panels.length}건 중 {filteredPanels.length}건 조회
          </p>
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  )
}
