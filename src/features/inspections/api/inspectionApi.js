import httpRequester from '@/shared/api/httpRequester'
import { unwrap } from '@/shared/api/response'

// 점검 항목 목록 조회
export async function getInspectionItems(panelId, config = {}) {
  const res = await httpRequester.get(`/panels/${panelId}/inspection-items`, config)
  return unwrap(res)
}

// 점검 항목 등록
export async function createInspectionItem(panelId, payload) {
  const res = await httpRequester.post(`/panels/${panelId}/inspection-items`, payload)
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
