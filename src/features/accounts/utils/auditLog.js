import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'

const FIELD_LABELS = { name: '이름', email: '이메일', phone: '연락처', role: '권한' }

// 관리이력 표/상세 모달이 같은 색으로 구분값을 표시하도록 공용으로 뺌
export const ACTION_COLOR = {
  CREATE: 'var(--color-success)',
  UPDATE: 'var(--color-warning)',
  DELETE: 'var(--color-danger)',
  RESTORE: 'var(--color-success)',
  PASSWORD_RESET: 'var(--color-brand)',
}

function toObject(value) {
  if (value == null) return null
  if (typeof value === 'object') return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return null
}

function formatFieldValue(field, value) {
  if (value == null || value === '') return '-'
  return field === 'role' ? (USER_ROLE_LABELS[value] ?? value) : value
}

// 상세 모달용 필드별 행 — summarizeLog와 같은 규칙이지만 한 줄 문자열이 아니라 필드별로 나눠서 준다
export function getLogDetailRows(log) {
  const before = toObject(log.beforeData)
  const after = toObject(log.afterData)

  if (log.action === 'UPDATE' && before && after) {
    return Object.keys(FIELD_LABELS)
      .filter((key) => before[key] !== after[key])
      .map((key) => ({
        label: FIELD_LABELS[key],
        before: formatFieldValue(key, before[key]),
        after: formatFieldValue(key, after[key]),
      }))
  }

  const snapshot = log.action === 'DELETE' ? before : after
  if (!snapshot) return []
  return Object.keys(FIELD_LABELS)
    .filter((key) => snapshot[key] !== undefined)
    .map((key) => ({ label: FIELD_LABELS[key], before: null, after: formatFieldValue(key, snapshot[key]) }))
}

// 변경 전/후 diff 요약 — 바뀐 필드만 표시, 파싱 실패해도 '-'만 보여주고 화면은 안 깨지게
export function summarizeLog(log) {
  const before = toObject(log.beforeData)
  const after = toObject(log.afterData)

  if (log.action === 'UPDATE' && before && after) {
    const changed = Object.keys(FIELD_LABELS).filter((key) => before[key] !== after[key])
    if (changed.length === 0) return '변경사항 없음'
    return changed
      .map((key) => `${FIELD_LABELS[key]}: ${formatFieldValue(key, before[key])} → ${formatFieldValue(key, after[key])}`)
      .join(', ')
  }

  const snapshot = log.action === 'DELETE' ? before : after
  if (!snapshot) return '-'
  return Object.keys(FIELD_LABELS)
    .filter((key) => snapshot[key] !== undefined)
    .map((key) => `${FIELD_LABELS[key]}: ${formatFieldValue(key, snapshot[key])}`)
    .join(', ')
}
