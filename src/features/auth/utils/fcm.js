import httpRequester from '@/shared/api/httpRequester'

// FCM 웹푸시는 모바일 로그인 성공 후 1회 fire-and-forget로 호출(실패해도 로그인 자체는 막지 않음)
//
// [미구현 — 다음 Phase] 실제 토큰 발급에는 `firebase` npm 패키지(Web SDK)가 필요한데
// 이번 Phase는 신규 패키지 설치가 금지되어 있어 SDK 연동 코드 자체가 없다. 지금은 항상 조용히 스킵되는
// 안전한 골격만 있고, 실제 알림 권한 요청/토큰 발급/서버 등록은 `firebase` 패키지 추가 후 구현해야 한다.
// (Vue 원본 src/utils/fcm.js가 이 로직을 그대로 갖고 있으니 포팅 시 그대로 참고할 것)
export async function registerFcmToken() {
  if (!import.meta.env.VITE_FIREBASE_API_KEY) return // Firebase 설정 없음(dev 기본) → 스킵
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return

  // firebase 패키지 미설치 상태라 여기서 더 진행하지 않고 안전하게 종료
  return
}

// 참고용 — firebase 패키지 추가 후 실제 등록 시 사용할 API 호출부는 이미 준비되어 있음
export async function submitFcmToken(fcmToken) {
  await httpRequester.patch('/users/me/fcm-token', { fcmToken })
}
