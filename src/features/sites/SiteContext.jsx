import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { getSites } from './api/siteApi'
import { SiteContext } from './siteContextObject'
import * as siteSession from './siteSession'
import { canAutoEnterSingleSite } from './utils/sitePolicy'

// 선택된 현장의 전역 상태. AuthProvider만 소비, 역참조 없음(AppProviders에서 Auth 안쪽에 중첩)
// 현장 목록/현재 현장 값의 진위는 항상 GET /sites 결과 기준 — sessionStorage 값은 재검증 대상일 뿐
export function SiteProvider({ children }) {
  const { role, isAuthenticated } = useAuth()

  const [sites, setSites] = useState([])
  const [storedSite, setStoredSite] = useState(siteSession.getCurrentSite)
  const [isLoadingSites, setIsLoadingSites] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [siteLoadError, setSiteLoadError] = useState('')

  // 가드가 여러 번 렌더돼도 GET /sites가 중복 호출되지 않도록 진행 중 요청을 공유
  const inflightRef = useRef(null)

  useEffect(() => siteSession.subscribeCurrentSite(setStoredSite), [])

  // 로그아웃 시 siteSession이 현재 현장을 지우지만 목록은 이 Provider 소유 — 다음 사용자에게 이월되지 않게 같이 리셋
  useEffect(() => {
    if (isAuthenticated) return
    inflightRef.current = null
    // 로그아웃은 외부(authSession) 이벤트라 렌더 중엔 알 수 없음 — 여기서 상태를 비우는 게 유일한 지점
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSites([])
    setIsInitialized(false)
    setSiteLoadError('')
  }, [isAuthenticated])

  // 목록 기준으로 저장된 현장을 재검증. 삭제/배정해제된 현장이면 버리고, 단일 배정이면 선택 화면 없이 자동 선택
  const normalize = useCallback(
    (list) => {
      const stored = siteSession.getCurrentSite()
      if (stored) {
        const matched = list.find((site) => site.siteId === stored.siteId)
        if (matched) {
          if (matched.name !== stored.name) siteSession.setCurrentSite(matched) // 이름만 바뀐 경우 갱신
          return
        }
        siteSession.clearCurrentSite()
      }
      if (list.length === 1 && canAutoEnterSingleSite(role)) siteSession.setCurrentSite(list[0])
    },
    [role],
  )

  const loadSites = useCallback(
    async ({ force = false } = {}) => {
      if (inflightRef.current && !force) return inflightRef.current

      setIsLoadingSites(true)
      setSiteLoadError('')
      const request = getSites()
        .then((data) => {
          const list = data ?? []
          setSites(list)
          normalize(list)
          setIsInitialized(true)
          return list
        })
        .catch((error) => {
          // 401은 httpRequester가 재발급/재시도까지 끝낸 뒤에야 여기로 옴 — 여기서 다시 재시도하면 루프됨
          setSiteLoadError(error?.response?.data?.resultMessage ?? '현장 정보를 불러오지 못했습니다.')
          throw error
        })
        .finally(() => {
          setIsLoadingSites(false)
          inflightRef.current = null
        })

      inflightRef.current = request
      return request
    },
    [normalize],
  )

  const refreshSites = useCallback(() => loadSites({ force: true }), [loadSites])

  const selectSite = useCallback((site) => siteSession.setCurrentSite(site), [])
  const clearCurrentSite = useCallback(() => siteSession.clearCurrentSite(), [])

  // 목록을 불러오기 전에도 헤더에 현장명을 그려야 해서 sessionStorage 값으로 우선 채움
  const currentSite = useMemo(() => {
    if (!storedSite) return null
    return sites.find((site) => site.siteId === storedSite.siteId) ?? storedSite
  }, [sites, storedSite])

  const value = useMemo(
    () => ({
      sites,
      currentSite,
      currentSiteId: currentSite?.siteId ?? null,
      isLoadingSites,
      isInitialized,
      siteLoadError,
      loadSites,
      refreshSites,
      selectSite,
      clearCurrentSite,
    }),
    [
      sites,
      currentSite,
      isLoadingSites,
      isInitialized,
      siteLoadError,
      loadSites,
      refreshSites,
      selectSite,
      clearCurrentSite,
    ],
  )

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}
