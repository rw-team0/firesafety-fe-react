import { subscribeUser } from '@/features/auth/authSession'

// 선택된 현장 SSOT. authSession과 동일한 모듈 레벨 pub/sub — 새로고침 직후 첫 렌더에서 동기적으로 읽어야 해서 Context state 대신 이 방식
// 이름까지 저장하는 이유: 목록 조회 전에도 헤더에 현장명을 그릴 수 있어야 함(값의 진위는 목록 조회 후 재검증)
const SITE_ID_KEY = 'currentSiteId'
const SITE_NAME_KEY = 'currentSiteName'

let currentSite = readFromStorage()
const listeners = new Set()

function readFromStorage() {
  const rawId = sessionStorage.getItem(SITE_ID_KEY)
  if (!rawId) return null
  const siteId = Number(rawId)
  if (!Number.isFinite(siteId)) return null
  return { siteId, name: sessionStorage.getItem(SITE_NAME_KEY) ?? '' }
}

function notify() {
  listeners.forEach((listener) => listener(currentSite))
}

export function getCurrentSite() {
  return currentSite
}

export function setCurrentSite(site) {
  currentSite = { siteId: site.siteId, name: site.name }
  sessionStorage.setItem(SITE_ID_KEY, String(site.siteId))
  sessionStorage.setItem(SITE_NAME_KEY, site.name ?? '')
  notify()
}

export function clearCurrentSite() {
  if (!currentSite && !sessionStorage.getItem(SITE_ID_KEY)) return // 불필요한 알림으로 리렌더 유발하지 않기
  currentSite = null
  sessionStorage.removeItem(SITE_ID_KEY)
  sessionStorage.removeItem(SITE_NAME_KEY)
  notify()
}

export function subscribeCurrentSite(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// 로그아웃/재발급 실패로 사용자 정보가 비워지는 모든 경로를 한 곳에서 받는다 — 화면마다 정리 호출을 넣지 않기 위함
subscribeUser((user) => {
  if (!user) clearCurrentSite()
})
