import { PANEL_STATUS_LABELS } from '@/shared/constants/domainLabels'

// 관리이력(계정)과 같은 색상 규칙 재사용 — 등록/수정/삭제 배지 색
export const ACTION_COLOR = {
  CREATE: 'var(--color-success)',
  UPDATE: 'var(--color-warning)',
  DELETE: 'var(--color-danger)',
}

// targetType별로 감사 로그 JSON에 들어있는 필드 중 화면에 보여줄 것만 라벨과 함께 추림
const FIELD_LABELS_BY_TARGET = {
  SITE: { name: '현장명', address: '주소' },
  PANEL: {
    name: '분전반명',
    deviceSerial: '기기 시리얼',
    mNo: '관리번호',
    installedAt: '설치일',
    status: '상태',
    circuitCount: '회로 수',
    leakMaThreshold: '누설전류 임계값',
    tempThreshold: '온도 임계값',
    humidityThreshold: '습도 임계값',
    overcurrentThreshold: '과전류 임계값',
    gasThreshold: '가스 임계값',
    fireThreshold: '화재 임계값',
  },
  CIRCUIT: { channelNo: '채널 번호', loadType: '부하 유형' },
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

function formatFieldValue(targetType, field, value) {
  if (value == null || value === '') return '-'
  if (targetType === 'PANEL' && field === 'status') return PANEL_STATUS_LABELS[value] ?? value
  return String(value)
}

// 표/상세에서 쓸 대상 이름 — SITE/PANEL은 name, CIRCUIT은 이름이 없어 채널 번호로 대신한다
export function resolveTargetName(log) {
  const snapshot = toObject(log.afterData) ?? toObject(log.beforeData)
  if (!snapshot) return `#${log.targetId}`
  if (log.targetType === 'CIRCUIT') return snapshot.channelNo != null ? `CH-${snapshot.channelNo}` : `#${log.targetId}`
  return snapshot.name ?? `#${log.targetId}`
}

// 상세 모달용 필드별 행 — UPDATE는 바뀐 필드만, CREATE/DELETE는 스냅샷 전체
export function getFacilityLogDetailRows(log) {
  const fieldLabels = FIELD_LABELS_BY_TARGET[log.targetType] ?? {}
  const before = toObject(log.beforeData)
  const after = toObject(log.afterData)

  if (log.action === 'UPDATE' && before && after) {
    return Object.keys(fieldLabels)
      .filter((key) => before[key] !== after[key])
      .map((key) => ({
        label: fieldLabels[key],
        before: formatFieldValue(log.targetType, key, before[key]),
        after: formatFieldValue(log.targetType, key, after[key]),
      }))
  }

  const snapshot = log.action === 'DELETE' ? before : after
  if (!snapshot) return []
  return Object.keys(fieldLabels)
    .filter((key) => snapshot[key] !== undefined)
    .map((key) => ({ label: fieldLabels[key], before: null, after: formatFieldValue(log.targetType, key, snapshot[key]) }))
}
