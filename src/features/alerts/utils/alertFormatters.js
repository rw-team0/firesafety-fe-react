import { ALERT_STATUS_LABELS, ALERT_TYPE_LABELS, labelOf } from '@/shared/constants/domainLabels'
import { formatDateTime } from '@/shared/utils/formatters'

export const ALERT_TYPE_OPTIONS = Object.entries(ALERT_TYPE_LABELS).map(([value, label]) => ({ value, label }))
export const ALERT_STATUS_OPTIONS = Object.entries(ALERT_STATUS_LABELS).map(([value, label]) => ({ value, label }))
// 미처리 조치(API-306)는 정의상 RESOLVED가 없어 그 값은 필터 옵션에서 뺀다
export const PENDING_STATUS_OPTIONS = ALERT_STATUS_OPTIONS.filter((option) => option.value !== 'RESOLVED')

// 경보 유형 라벨
export function formatAlertType(type) {
  return labelOf(ALERT_TYPE_LABELS, type)
}

// 경보 처리상태 라벨
export function formatAlertStatus(status) {
  return labelOf(ALERT_STATUS_LABELS, status)
}

// 날짜/시각 표시
export function formatDateTimeCell(value) {
  return formatDateTime(value)
}

// 회로 번호 표시, 회로 정보가 없는 경보(장비 단위)는 '-'
export function formatCircuitNo(value) {
  return value ? `${value}번` : '-'
}

// 서버 오류 메시지 추출
export function extractServerMessage(error, fallback) {
  return error?.response?.data?.resultMessage ?? fallback
}

// Promise.allSettled 결과 요약 — 일괄 확인/조치 처리 후 성공/실패 건수와 실패 사유를 모아 보여준다
export function summarizeSettledResults(results, maxReasons = 3) {
  const successCount = results.filter((result) => result.status === 'fulfilled').length
  const failed = results.filter((result) => result.status === 'rejected')
  const reasons = [...new Set(failed.map((result) => extractServerMessage(result.reason, '알 수 없는 오류')))]
  const shown = reasons.slice(0, maxReasons)
  const omitted = reasons.length - shown.length
  const failureReason = shown.length ? shown.join(', ') + (omitted > 0 ? ` 외 ${omitted}건` : '') : ''
  return { successCount, failCount: failed.length, failureReason }
}
