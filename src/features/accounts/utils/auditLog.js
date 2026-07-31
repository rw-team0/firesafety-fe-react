import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'

const FIELD_LABELS = { name: '이름', email: '이메일', phone: '연락처', role: '권한' }

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
