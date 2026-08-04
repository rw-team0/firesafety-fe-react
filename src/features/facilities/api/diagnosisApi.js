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

// AI 모델 메타정보(버전, LOLO 평가 지표) 조회 — 회로/현장에 매이지 않는 전역 정보
export async function getAiModelInfo() {
  const res = await httpRequester.get('/circuits/model-info')
  return unwrap(res)
}
