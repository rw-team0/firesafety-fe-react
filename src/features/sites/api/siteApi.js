import httpRequester from '@/shared/api/httpRequester'
import { unwrap } from '@/shared/api/response'

// 파라미터 없음 — SUPER_ADMIN은 전체 활성현장, ADMIN/GENERAL은 배정된 현장만 서버가 걸러서 내려줌(프론트 재필터 불필요)
// 목록 항목: { siteId, name, address, zipCode, createdAt } — panelCount는 상세에만 있음
export async function getSites() {
  const res = await httpRequester.get('/sites')
  return unwrap(res)
}

// 상세에만 panelCount/updatedAt이 포함됨
export async function getSite(siteId) {
  const res = await httpRequester.get(`/sites/${siteId}`)
  return unwrap(res)
}

// 현장 생성 + ADMIN 계정 생성 + 배정이 한 트랜잭션 — 중복(409)이면 현장도 같이 롤백되므로 재시도만 하면 됨
export async function createSiteWithAdmin(payload) {
  const res = await httpRequester.post('/sites/with-admin', payload)
  return unwrap(res)
}

// 관리자 정보는 대상이 아님 — name/address/zipCode만
export async function updateSite(siteId, payload) {
  const res = await httpRequester.put(`/sites/${siteId}`, payload)
  return unwrap(res)
}

// soft delete(deleted_at) — 하위 데이터는 남고 활성 목록에서만 제외
export async function deleteSite(siteId) {
  const res = await httpRequester.delete(`/sites/${siteId}`)
  return unwrap(res)
}
