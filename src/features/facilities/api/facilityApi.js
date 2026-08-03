import httpRequester from '@/shared/api/httpRequester'
import { unwrap } from '@/shared/api/response'

// 분전반 목록 조회
export async function getPanels({ siteId, status } = {}, config = {}) {
  const params = {}
  if (siteId) params.siteId = siteId
  if (status) params.status = status
  const res = await httpRequester.get('/panels', { ...config, params })
  return unwrap(res)
}

// 분전반 상세 조회
export async function getPanelDetail(panelId, config = {}) {
  const res = await httpRequester.get(`/panels/${panelId}`, config)
  return unwrap(res)
}

// 분전반 등록
export async function createPanel(siteId, payload) {
  const res = await httpRequester.post(`/sites/${siteId}/panels`, payload)
  return unwrap(res)
}

// 분전반 수정
export async function updatePanel(panelId, payload) {
  const res = await httpRequester.put(`/panels/${panelId}`, payload)
  return unwrap(res)
}

// 분전반 삭제
export async function deletePanel(panelId) {
  const res = await httpRequester.delete(`/panels/${panelId}`)
  return unwrap(res)
}

// 회로 목록 조회
export async function getCircuits(panelId, config = {}) {
  const res = await httpRequester.get(`/panels/${panelId}/circuits`, config)
  return unwrap(res)
}

// 회로 등록
export async function createCircuit(panelId, payload) {
  const res = await httpRequester.post(`/panels/${panelId}/circuits`, payload)
  return unwrap(res)
}

// 회로 삭제
export async function deleteCircuit(circuitId) {
  const res = await httpRequester.delete(`/circuits/${circuitId}`)
  return unwrap(res)
}
