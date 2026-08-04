// 인앱(WS/폴링) 위험 팝업·경보음만 로컬로 끄는 사용자 설정 — 서버 계약 없이 이 브라우저/기기에만 적용된다.
// 대시보드 배지·미확인 건수는 이 설정과 무관하게 항상 그대로 갱신된다(MonitoringContext 참고).
const IN_APP_ALERTS_MUTED_KEY = 'inAppAlertsMuted'

export function isInAppAlertsMuted() {
  return localStorage.getItem(IN_APP_ALERTS_MUTED_KEY) === '1'
}

export function setInAppAlertsMuted(muted) {
  if (muted) localStorage.setItem(IN_APP_ALERTS_MUTED_KEY, '1')
  else localStorage.removeItem(IN_APP_ALERTS_MUTED_KEY)
}
