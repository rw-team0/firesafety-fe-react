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
