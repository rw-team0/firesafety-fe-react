import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { confirmAlert, getAlerts } from '@/features/alerts/api/alertApi'
import { formatAlertType } from '@/features/alerts/utils/alertFormatters'
import { useAuth } from '@/features/auth/useAuth'
import { getDashboardSummary } from '@/features/dashboard/api/dashboardApi'
import { useSite } from '@/features/sites/useSite'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { ALERT_SEVERITY_LABELS } from '@/shared/constants/domainLabels'
import { ROUTE_PATHS, buildPath } from '@/shared/constants/routePaths'
import { isInAppAlertsMuted } from '@/shared/utils/notificationPrefs'
import { createMonitoringSocket } from './monitoringSocket'
import { MonitoringContext } from './monitoringContextObject'

const POLL_INTERVAL_MS = 15000
// 경보 1건 처리(확인/조치완료)마다 WS 메시지가 1개씩 오므로, 일괄 처리 중 짧은 시간에 메시지가 몰리면
// 그만큼 getDashboardSummary GET도 폭주한다 — 메시지가 잠잠해질 때까지 기다렸다가 한 번만 새로고침한다
const WS_REFRESH_DEBOUNCE_MS = 800
// 최신 미확인 경보 중 팝업 심각도와 일치하는 항목을 찾기 위한 조회 크기 — 같은 분전반에 RISK/CAUTION이 섞여 있을 수 있음
const ALERT_TYPE_LOOKUP_SIZE = 10

// 팝업/경보음 등 상태 전환별 표시 정책. RISK는 기존 그대로, CAUTION은 톤만 다르고 경보음·자동확인은 하지 않는다.
const STATUS_POPUP_CONFIG = {
  RISK: { title: '위험 상태가 감지되었습니다.', tone: 'danger', beep: true, autoConfirm: true },
  CAUTION: { title: '주의 상태가 감지되었습니다.', tone: 'warning', beep: false, autoConfirm: false },
}

// 실시간 관제 상태(통신상태/미확인알림/위험전환 팝업)를 앱 전체에서 공유(REQ-201, FUNC-201-07/08).
// 로그인 세션 내내 떠있는 AppProviders에서 한 번만 연결해 어느 화면에 있든 위험 전환을 감지한다(../firesafety-fe monitoring.js와 동일 설계).
// 요약/위험감지 기준은 앱 전체가 "현재 선택 현장" 단일 컨텍스트로 동작하는 이 프로젝트 구조에 맞춰 currentSiteId로 스코프한다
// (Vue 원본은 사용자의 담당 현장 전체를 합산했지만, 이 앱은 화면 전부가 SiteProvider의 currentSiteId를 SSOT로 쓰기 때문).
export function MonitoringProvider({ children }) {
  const { role, isAuthenticated } = useAuth()
  const { sites, currentSiteId } = useSite()
  const navigate = useNavigate()
  const location = useLocation()

  const [wsConnected, setWsConnected] = useState(false)
  const [unreadAlertCount, setUnreadAlertCount] = useState(0)
  const [summary, setSummary] = useState(null)
  // { severity: 'RISK' | 'CAUTION', panelId, panelName, alertType }
  const [statusPopup, setStatusPopup] = useState(null)
  const [refreshedAt, setRefreshedAt] = useState(0)

  const pollTimerRef = useRef(null)
  const previousStatusIdsRef = useRef({ RISK: new Set(), CAUTION: new Set() })
  const currentSiteIdRef = useRef(currentSiteId)

  useEffect(() => {
    currentSiteIdRef.current = currentSiteId
  }, [currentSiteId])

  // 웹은 팝업+경보음(../firesafety-fe 프론트가이드 7.5절과 동일). 자동재생 정책으로 실패할 수 있어 방어적으로 감싼다
  const playAlertBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      osc.frequency.value = 880
      osc.connect(ctx.destination)
      osc.start()
      setTimeout(() => {
        osc.stop()
        ctx.close()
      }, 200)
    } catch {
      // 자동재생 차단 등은 무시 — 팝업 자체는 뜨니 치명적이지 않음
    }
  }, [])

  // 같은 심각도로 계속 남아있는 분전반은 건너뛰고, 다른 상태에서 새로 전환된 분전반만 찾는다
  const findNewlyTransitioned = useCallback((panels, severity) => {
    const previousIds = previousStatusIdsRef.current[severity]
    return panels.find((panel) => panel.status === severity && !previousIds.has(panel.panelId))
  }, [])

  // 현재 현장 요약 재조회 + 새로 RISK/CAUTION 전환된 분전반 감지 → 팝업(+RISK만 경보음)(FUNC-201-08)
  const refresh = useCallback(async () => {
    const siteId = currentSiteIdRef.current
    if (!siteId) return
    try {
      const data = await getDashboardSummary({ siteId })
      const panels = data?.panels ?? []

      // RISK가 CAUTION보다 우선 — 같은 조회에서 둘 다 새로 전환됐으면 더 급한 RISK 팝업만 띄운다
      const newRisk = findNewlyTransitioned(panels, 'RISK')
      const newCaution = newRisk ? null : findNewlyTransitioned(panels, 'CAUTION')
      const newTransition = newRisk
        ? { panel: newRisk, severity: 'RISK' }
        : newCaution
          ? { panel: newCaution, severity: 'CAUTION' }
          : null

      previousStatusIdsRef.current = {
        RISK: new Set(panels.filter((panel) => panel.status === 'RISK').map((panel) => panel.panelId)),
        CAUTION: new Set(panels.filter((panel) => panel.status === 'CAUTION').map((panel) => panel.panelId)),
      }

      setSummary(data)
      setUnreadAlertCount(Number(data?.unconfirmedAlertCount ?? 0))
      setRefreshedAt(Date.now())
      // 인앱 알림을 로컬로 꺼둔 경우에도 배지/미확인 건수는 그대로 갱신하고 팝업+경보음만 건너뛴다
      if (newTransition && !isInAppAlertsMuted()) {
        const { panel, severity } = newTransition
        setStatusPopup({ severity, panelId: panel.panelId, panelName: panel.name, alertType: null })
        if (STATUS_POPUP_CONFIG[severity].beep) playAlertBeep()
        // 요약 API엔 경보 유형이 없어(상태값만) 그 분전반의 최신 미확인 경보 중 같은 심각도 항목에서 유형만 따로 가져온다(FCM 푸시도 같은 값을 씀)
        getAlerts({ panelId: panel.panelId, status: 'UNCONFIRMED', size: ALERT_TYPE_LOOKUP_SIZE })
          .then((alertData) => {
            const matched = (alertData?.content ?? []).find((alert) => alert.severity === severity)
            const alertType = matched?.type
            if (alertType) setStatusPopup((prev) => (prev?.panelId === panel.panelId ? { ...prev, alertType } : prev))
          })
          .catch(() => {
            // 유형 조회 실패해도 팝업 자체(분전반명)는 이미 떠 있으니 무시
          })
      }
    } catch {
      // 실패 알림은 인터셉터가 이미 처리 — 다음 폴링/WS 메시지에서 다시 시도된다
    }
  }, [findNewlyTransitioned, playAlertBeep])

  // WS/폴링 콜백에서 항상 최신 refresh를 부르도록(현장 전환 시마다 소켓을 다시 맺지 않기 위한 참조)
  const refreshRef = useRef(refresh)
  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  // WS 메시지 전용 디바운스 — 짧은 시간에 여러 메시지가 몰려도 마지막 메시지 기준으로 딱 한 번만 새로고침한다
  const wsRefreshTimerRef = useRef(null)
  const scheduleWsRefresh = useCallback(() => {
    if (wsRefreshTimerRef.current) clearTimeout(wsRefreshTimerRef.current)
    wsRefreshTimerRef.current = setTimeout(() => {
      wsRefreshTimerRef.current = null
      refreshRef.current()
    }, WS_REFRESH_DEBOUNCE_MS)
  }, [])

  const stopPolling = useCallback(() => {
    clearInterval(pollTimerRef.current)
    pollTimerRef.current = null
  }, [])

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return
    pollTimerRef.current = setInterval(() => refreshRef.current(), POLL_INTERVAL_MS) // NFR-14: WS 끊기면(또는 SUPER_ADMIN) REST 폴링
  }, [])

  const siteIds = useMemo(() => sites.map((site) => site.siteId), [sites])
  const siteIdsKey = useMemo(() => siteIds.slice().sort((a, b) => a - b).join(','), [siteIds])

  // 연결 수명주기 — 로그인 상태/역할/담당현장 목록이 바뀔 때만 다시 계산(현재 선택 현장 전환으로는 재연결하지 않음)
  useEffect(() => {
    if (!isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWsConnected(false)
      setSummary(null)
      setUnreadAlertCount(0)
      setStatusPopup(null)
      previousStatusIdsRef.current = { RISK: new Set(), CAUTION: new Set() }
      return undefined
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshRef.current()

    // API 가이드 6절: SUPER_ADMIN은 이 topic을 쓰지 않음(REST 전체조회로만 동작) — 폴링만 사용
    // 담당 현장이 없으면 구독할 topic도 없음 — 폴링으로만 동작
    if (role === 'SUPER_ADMIN' || siteIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWsConnected(role === 'SUPER_ADMIN')
      startPolling()
      return () => stopPolling()
    }

    const socket = createMonitoringSocket({
      siteIds,
      onMessage: () => scheduleWsRefresh(),
      onConnect: () => {
        setWsConnected(true)
        stopPolling()
      },
      onDisconnect: () => {
        setWsConnected(false)
        startPolling()
      },
    })

    return () => {
      socket?.deactivate()
      stopPolling()
      if (wsRefreshTimerRef.current) {
        clearTimeout(wsRefreshTimerRef.current)
        wsRefreshTimerRef.current = null
      }
    }
  }, [isAuthenticated, role, siteIdsKey, siteIds, startPolling, stopPolling, scheduleWsRefresh])

  // 현재 선택 현장이 바뀌면 그 현장 기준으로 위험/주의 판정 기준선을 새로 잡고 즉시 재조회
  useEffect(() => {
    if (!isAuthenticated || !currentSiteId) return
    previousStatusIdsRef.current = { RISK: new Set(), CAUTION: new Set() }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshRef.current()
  }, [isAuthenticated, currentSiteId])

  // 위험 전환 팝업 "상세보기" — 해당 분전반의 최신 미확인 경보를 확인 처리한 뒤 상세로 이동(FUNC-201-08)
  const confirmLatestAlertForPanel = useCallback(async (panelId) => {
    const data = await getAlerts({ panelId, status: 'UNCONFIRMED', size: 1 })
    const latest = data?.content?.[0]
    if (latest) await confirmAlert(latest.alertId)
  }, [])

  const clearStatusPopup = useCallback(() => setStatusPopup(null), [])

  async function handleStatusPopupDetail() {
    const { panelId, severity } = statusPopup ?? {}
    clearStatusPopup()
    if (!panelId) return
    // RISK만 상세 진입과 동시에 자동 확인 처리 — CAUTION은 상세 이동만 하고 확인 처리는 사용자가 직접 한다
    if (STATUS_POPUP_CONFIG[severity]?.autoConfirm) {
      try {
        await confirmLatestAlertForPanel(panelId)
      } catch {
        // 확인 처리 실패해도 상세 이동은 계속 — 상세 화면에서 다시 확인 처리할 수 있다
      }
    }
    // 이 팝업은 PC/모바일 공용(AppProviders에 한 번만 마운트)이라 지금 보고 있는 화면(/m/* 여부)에 맞는 상세로 보낸다
    const isMobile = location.pathname.startsWith('/m/')
    navigate(buildPath(isMobile ? ROUTE_PATHS.mobileEquipmentDetail : ROUTE_PATHS.equipmentDetail, { panelId }))
  }

  const value = useMemo(
    () => ({
      wsConnected,
      unreadAlertCount,
      summary,
      refreshedAt,
      refresh,
      confirmLatestAlertForPanel,
    }),
    [wsConnected, unreadAlertCount, summary, refreshedAt, refresh, confirmLatestAlertForPanel],
  )

  const popupConfig = statusPopup ? STATUS_POPUP_CONFIG[statusPopup.severity] : null

  return (
    <MonitoringContext.Provider value={value}>
      {children}
      <ConfirmModal
        visible={Boolean(statusPopup)}
        title={popupConfig?.title ?? ''}
        tone={popupConfig?.tone}
        cancelLabel="닫기"
        confirmLabel="상세보기"
        onCancel={clearStatusPopup}
        onConfirm={handleStatusPopupDetail}
      >
        <div className="confirm-modal__summary">
          <span className="confirm-modal__summary-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="confirm-modal__summary-body">
            <p className="confirm-modal__summary-row">
              <span className="confirm-modal__summary-label">분전반명</span>
              <span className="confirm-modal__summary-value">{statusPopup?.panelName ?? '-'}</span>
              <span className="confirm-modal__summary-badge">
                {statusPopup?.alertType ? formatAlertType(statusPopup.alertType) : ALERT_SEVERITY_LABELS[statusPopup?.severity]}
              </span>
            </p>
            <p className="confirm-modal__summary-detail">상세보기에서 최근 경보를 확인해주세요.</p>
          </div>
        </div>
      </ConfirmModal>
    </MonitoringContext.Provider>
  )
}
