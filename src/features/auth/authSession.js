// 인증 상태 SSOT. axios 인터셉터 등 트리 밖에서도 접근 필요 → 모듈 레벨로 관리
// AuthContext는 이 모듈을 구독만 하는 어댑터
const STORAGE_KEY = 'user'

let currentUser = readFromStorage()
const listeners = new Set()

// 새로고침 대비 세션 복원, 실패 시 비로그인 시작
function readFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// 상태 변경 시 구독자 전체에 알림
function notify() {
  listeners.forEach((listener) => listener(currentUser))
}

export function getUser() {
  return currentUser
}

// 로그인 성공 시 호출, 메모리+sessionStorage 동기화 (user: { userId, name, role })
export function setUser(user) {
  currentUser = user
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  notify()
}

// 로그아웃/세션 만료 시 호출
export function clearUser() {
  currentUser = null
  sessionStorage.removeItem(STORAGE_KEY)
  notify()
}

// 구독 등록, 반환값은 구독 취소 함수 (언마운트 시 호출 필수)
export function subscribeUser(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
