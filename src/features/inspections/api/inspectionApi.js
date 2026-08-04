import httpRequester from '@/shared/api/httpRequester'
import { unwrap } from '@/shared/api/response'

// 분전반에 적용된 점검 항목 목록 조회
export async function getInspectionItems(panelId, config = {}) {
  const res = await httpRequester.get(`/panels/${panelId}/inspection-items`, config)
  return unwrap(res)
}

// 현장 점검 항목 카탈로그 조회
export async function getSiteInspectionItems(siteId, config = {}) {
  const res = await httpRequester.get(`/sites/${siteId}/inspection-items`, config)
  return unwrap(res)
}

// 점검 항목 등록(현장 카탈로그) — ADMIN 이상
export async function createInspectionItem(siteId, payload) {
  const res = await httpRequester.post(`/sites/${siteId}/inspection-items`, payload)
  return unwrap(res)
}

// 점검 항목 수정(현장 카탈로그) — ADMIN 이상
export async function updateInspectionItem(siteId, itemId, payload) {
  const res = await httpRequester.patch(`/sites/${siteId}/inspection-items/${itemId}`, payload)
  return unwrap(res)
}

// 점검 항목 삭제(현장 카탈로그) — ADMIN 이상, 이미 사용 중이면 실패
export async function deleteInspectionItem(siteId, itemId) {
  const res = await httpRequester.delete(`/sites/${siteId}/inspection-items/${itemId}`)
  return unwrap(res)
}

// 분전반에 점검 항목 일괄 적용(전체교체) — GENERAL 이상
export async function applyInspectionItems(panelId, itemIds) {
  const res = await httpRequester.post(`/panels/${panelId}/inspection-items`, { itemIds })
  return unwrap(res)
}

// 점검 결과 저장
export async function saveInspection(panelId, payload) {
  const res = await httpRequester.post(`/panels/${panelId}/inspections`, payload)
  return unwrap(res)
}

// 점검 이력 조회
export async function getInspectionHistory(panelId, params = {}, config = {}) {
  const res = await httpRequester.get(`/panels/${panelId}/inspections`, { ...config, params })
  return unwrap(res)
}

// 점검 이력 엑셀 다운로드
export async function exportInspectionHistory(panelId, params = {}, config = {}) {
  const res = await httpRequester.get(`/panels/${panelId}/inspections/export`, {
    ...config,
    params,
    responseType: 'blob',
  })
  return res.data
}
