import httpRequester from '@/shared/api/httpRequester'
import { unwrap } from '@/shared/api/response'

// 대시보드 요약 조회
export async function getDashboardSummary(params = {}, config = {}) {
  const res = await httpRequester.get('/dashboard/summary', { ...config, params })
  return unwrap(res)
}
