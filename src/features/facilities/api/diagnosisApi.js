import httpRequester from '@/shared/api/httpRequester'
import { unwrap } from '@/shared/api/response'

// 회로 AI 진단 이력 조회 (REQ-103)
export async function getCircuitDiagnosis(circuitId, params = {}) {
  const res = await httpRequester.get(`/circuits/${circuitId}/diagnosis`, { params })
  return unwrap(res)
}

// 회로 AI 진단 수동 실행 (REQ-102) — 비동기 트리거, 결과는 위 조회로 재확인해야 한다
export async function triggerCircuitDiagnosis(circuitId) {
  const res = await httpRequester.post(`/circuits/${circuitId}/diagnosis/trigger`)
  return unwrap(res)
}

// 분전반 AI 진단 현황 조회 — 회로별 상세 이력보다 한 단계 위의 요약 정보
export async function getPanelDiagnosisSummary(panelId) {
  const res = await httpRequester.get(`/panels/${panelId}/diagnosis/summary`)
  return unwrap(res)
}
