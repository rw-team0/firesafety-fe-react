import httpRequester from '@/shared/api/httpRequester'
import { unwrap } from '@/shared/api/response'

// 성공 시 { userId, name, role }만 옴 — 토큰은 Set-Cookie(at, rt)로 별도 전달
export async function login(email, password) {
  const res = await httpRequester.post('/auth/login', { email, password })
  return unwrap(res)
}

// 실패해도 멱등 처리라 호출부에서 별도 에러 처리 불필요(로그아웃 자체는 항상 진행)
export async function logout() {
  await httpRequester.post('/auth/logout')
}

// 계정 존재 여부와 무관하게 백엔드가 항상 동일 메시지 반환 — resultMessage 그대로 표시
export async function requestPasswordReset(email) {
  const res = await httpRequester.post('/auth/password-reset/request', { email })
  return res.data.resultMessage
}

// token: 이메일 링크의 재설정 토큰(바디 필드명 그대로 'token')
export async function confirmPasswordReset(token, newPassword) {
  const res = await httpRequester.post('/auth/password-reset/confirm', { token, newPassword })
  return res.data.resultMessage
}
