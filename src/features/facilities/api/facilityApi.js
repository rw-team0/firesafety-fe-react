import httpRequester from '@/shared/api/httpRequester'
import { unwrap } from '@/shared/api/response'

// 설비 변경 이력 조회(SUPER_ADMIN 전용) — 서버가 필터/페이지네이션 모두 지원, 응답은 { content, totalElements, page, size } 페이지 형태
export async function getFacilityAuditLogs({ targetType, targetId, actorUserId, action, from, to, page, size } = {}, config = {}) {
  const params = {}
  if (targetType) params.targetType = targetType
  if (targetId != null) params.targetId = targetId
  if (actorUserId != null) params.actorUserId = actorUserId
  if (action) params.action = action
  if (from) params.from = from
  if (to) params.to = to
  if (page != null) params.page = page
  if (size != null) params.size = size
  const res = await httpRequester.get('/facilities/audit-logs', { ...config, params })
  return unwrap(res)
}

// 분전반 목록 조회 — 응답은 { content, totalElements } 페이지 형태
export async function getPanels({ siteId, status, keyword, page, size } = {}, config = {}) {
  const params = {}
  if (siteId) params.siteId = siteId
  if (status) params.status = status
  if (keyword) params.keyword = keyword
  if (page != null) params.page = page
  if (size != null) params.size = size
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

// 회로 연결 기기(loadType) 수정 — 채널번호/분전반은 변경 불가, loadType만 수정 가능
export async function updateCircuit(circuitId, payload) {
  const res = await httpRequester.put(`/circuits/${circuitId}`, payload)
  return unwrap(res)
}
