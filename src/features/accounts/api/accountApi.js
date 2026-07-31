import httpRequester from '@/shared/api/httpRequester'
import { unwrap } from '@/shared/api/response'

// 활성 계정 목록(삭제 계정 미포함). 상세조회 API 자체가 없어 이 목록에서 개별 계정을 찾아 씀
export async function getUsers() {
  const res = await httpRequester.get('/users')
  return unwrap(res)
}

// 현재 현장 기준 직원 목록. SUPER_ADMIN/ADMIN/GENERAL 공통 호출이며 ADMIN/GENERAL을 반환한다.
export async function getManagedUsers(siteId, config = {}) {
  const res = await httpRequester.get(`/sites/${siteId}/managed-users`, config)
  return unwrap(res)
}

// deprecated 후보: 직원 목록 조회는 managed-users로 통일했다. 기존 계약 확인용으로 함수는 유지한다.
export async function getStaffContacts(siteId, config = {}) {
  const res = await httpRequester.get(`/sites/${siteId}/staff-contacts`, config)
  return unwrap(res)
}

// siteIds는 여기 안 들어감 — 배정은 별도 API(POST /users/{id}/site-assignments)
export async function createUser(payload) {
  const res = await httpRequester.post('/users', payload)
  return unwrap(res)
}

// 이메일도 변경 가능. siteIds는 여기도 없음
export async function updateUser(userId, payload) {
  const res = await httpRequester.put(`/users/${userId}`, payload)
  return unwrap(res)
}

// 자기 자신/권한 밖 대상 포함 시 서버가 전체 롤백(부분 성공 없음)
export async function bulkDeleteUsers(userIds) {
  const res = await httpRequester.patch('/users/bulk-delete', { userIds })
  return unwrap(res)
}

export async function restoreUser(userId) {
  const res = await httpRequester.patch(`/users/${userId}/restore`)
  return unwrap(res)
}

// GET 쿼리파라미터 방식, duplicate: boolean
export async function checkEmailDuplicate(email) {
  const res = await httpRequester.get('/users/check-email', { params: { email } })
  return unwrap(res)
}

// 서버가 날짜/유형 필터 파라미터를 지원하지 않음 — 전체를 받아서 화면에서 필터링
export async function getUserAuditLogs() {
  const res = await httpRequester.get('/users/audit-logs')
  return unwrap(res)
}

// 현장 목록은 sites 도메인 소유 — 담당현장 배정 화면이 쓰던 import 경로만 유지하려고 재수출한다(중복 구현 방지)
export { getSites } from '@/features/sites/api/siteApi'

export async function getSiteAssignments(userId) {
  const res = await httpRequester.get(`/users/${userId}/site-assignments`)
  return unwrap(res)
}

// siteIds 배열 전체를 기준으로 배정 상태를 완전히 대체(추가분만 보내면 나머지가 해제됨)
export async function saveSiteAssignments(userId, siteIds) {
  const res = await httpRequester.post(`/users/${userId}/site-assignments`, { siteIds })
  return unwrap(res)
}
