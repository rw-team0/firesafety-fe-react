// httpRequester 인터셉터는 컴포넌트 트리 밖 → Context/훅 사용 불가
// 최소 pub/sub로 전역 알림 대체 (실제 표시 UI는 이후 Phase에서 구독 연결)
const listeners = new Set()

// 알림 메시지 발행
export function showAlert(message) {
  listeners.forEach((listener) => listener(message))
}

// 알림 구독, 반환값은 구독 취소 함수 (언마운트 시 호출 필수)
export function subscribeAlert(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
