import httpRequester from '@/shared/api/httpRequester'
import { unwrap } from '@/shared/api/response'

// 기간별 통계 조회 — 경보/AI진단/분전반/점검 현황을 한 번에 받는다
export async function getStatistics(params = {}, config = {}) {
  const res = await httpRequester.get('/statistics', { ...config, params })
  return unwrap(res)
}
