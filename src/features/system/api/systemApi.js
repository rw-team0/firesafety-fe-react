import httpRequester from '@/shared/api/httpRequester'
import { unwrap } from '@/shared/api/response'

// SW 버전 정보 요약 조회 — 등록된 이력 중 최신 소프트웨어/AI 모델 버전(REQ-702)
export async function getSystemVersion(config = {}) {
  const res = await httpRequester.get('/system/version', config)
  return unwrap(res)
}

// 업데이트 이력 목록 조회. 응답은 { content, totalElements } 페이지 형태
export async function getSystemReleases({ page, size } = {}, config = {}) {
  const params = {}
  if (page != null) params.page = page
  if (size != null) params.size = size
  const res = await httpRequester.get('/system/releases', { ...config, params })
  return unwrap(res)
}

// 업데이트 이력 등록 — SUPER_ADMIN 전용
export async function createSystemRelease(payload) {
  const res = await httpRequester.post('/system/releases', payload)
  return unwrap(res)
}
