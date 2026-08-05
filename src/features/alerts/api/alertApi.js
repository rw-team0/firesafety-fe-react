import httpRequester from '@/shared/api/httpRequester'
import { unwrap } from '@/shared/api/response'

// 경보 목록 조회
export async function getAlerts(params = {}, config = {}) {
  const res = await httpRequester.get('/alerts', { ...config, params })
  return unwrap(res)
}

// 미처리 조치 목록 조회
export async function getPendingAlerts(params = {}, config = {}) {
  const res = await httpRequester.get('/alerts/pending', { ...config, params })
  return unwrap(res)
}

// 경보 확인 처리 — UNCONFIRMED → CONFIRMED
export async function confirmAlert(alertId) {
  const res = await httpRequester.patch(`/alerts/${alertId}/confirm`)
  return unwrap(res)
}

// 경보 조치완료 처리 — CONFIRMED → RESOLVED, 비고는 선택(최대 500자)
export async function resolveAlert(alertId, resolutionNote) {
  const res = await httpRequester.patch(`/alerts/${alertId}/resolve`, resolutionNote ? { resolutionNote } : {})
  return unwrap(res)
}

// 경보 일괄 확인 처리 — 대상이 몇 건이든 실시간 갱신 신호는 서버가 현장당 한 번만 보낸다(건별 반복 호출 대비 폭주 방지)
export async function bulkConfirmAlerts(alertIds) {
  const res = await httpRequester.patch('/alerts/bulk-confirm', { alertIds })
  return unwrap(res)
}

// 경보 일괄 조치완료 처리 — 개별 비고는 받지 않는다(PC 다중선택 화면과 동일)
export async function bulkResolveAlerts(alertIds) {
  const res = await httpRequester.patch('/alerts/bulk-resolve', { alertIds })
  return unwrap(res)
}

// 경보 이력 엑셀 다운로드 — 목록 조회와 같은 필터 + alertIds(선택) 지정 시 해당 항목만. xlsx 바이너리라 unwrap 안 함
export async function exportAlerts(params = {}, config = {}) {
  const res = await httpRequester.get('/alerts/export', { ...config, params, responseType: 'blob' })
  return res.data
}
