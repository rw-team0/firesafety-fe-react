import { ALERT_STATUS_LABELS, ALERT_TYPE_LABELS, PANEL_STATUS_LABELS, labelOf } from '@/shared/constants/domainLabels'
import { formatDateTime } from '@/shared/utils/formatters'
import { MAX_CIRCUIT_COUNT, MIN_CIRCUIT_COUNT, M_NO_LENGTH } from '../constants/facilityConstants'

export const PANEL_STATUS_OPTIONS = [
  { value: 'NORMAL', label: PANEL_STATUS_LABELS.NORMAL },
  { value: 'CAUTION', label: PANEL_STATUS_LABELS.CAUTION },
  { value: 'RISK', label: PANEL_STATUS_LABELS.RISK },
  { value: 'OFFLINE', label: PANEL_STATUS_LABELS.OFFLINE },
]

// min/max는 화면 검증용(서버가 최종 검증) — 값 근거는 03-테이블명세.md panel 컬럼 CHECK/기본값
export const THRESHOLD_FIELDS = [
  { key: 'leakMaThreshold', label: '누설전류 기준', unit: 'mA', type: 'decimal', min: 0, placeholder: '기본값: 20.0' },
  { key: 'tempThreshold', label: '온도 기준', unit: '도', type: 'decimal', min: 0, placeholder: '기본값: 80.0' },
  { key: 'humidityThreshold', label: '습도 기준', unit: '%', type: 'decimal', min: 0, max: 100, placeholder: '기본값: 80.0' },
  { key: 'overcurrentThreshold', label: '과전류 기준', unit: 'A', type: 'decimal', min: 0, placeholder: '기본값: 30.0' },
  { key: 'gasThreshold', label: '가스 기준', unit: '', type: 'integer', min: 0, placeholder: '기본값: 5000' },
  { key: 'fireThreshold', label: '불꽃 기준', unit: '', type: 'integer', min: 0, placeholder: '기본값: 5000' },
]

// EquipmentDetailPage 센서값 카드 SSOT — API-506(GET /panels/{id}) 응답에 실제 존재하는 필드만 나열한다.
// thresholdKey가 있으면 panel[thresholdKey]와 비교해 주의(노랑) 표시, alarmKey가 있으면 하드웨어 알람 플래그가
// true일 때 수치·임계값 비교와 무관하게 위험(빨강)을 강제한다(REQ-203, API-506 2026-07-27 확장 내용).
export const SENSOR_FIELDS = [
  { key: 'totalCurrent', label: '전체전류', unit: 'A', alarmKey: 'overcurrentAlarm', icon: '⚡' },
  { key: 'leakMa', label: '누설전류', unit: 'mA', thresholdKey: 'leakMaThreshold', alarmKey: 'leakageAlarm', icon: '🔺' },
  { key: 'voltV', label: '전압', unit: 'V', icon: '🔌' },
  { key: 'totalPower', label: '전체전력', unit: 'W', icon: '💡' },
  { key: 'temperature', label: '온도', unit: '도', thresholdKey: 'tempThreshold', alarmKey: 'overheatAlarm', icon: '🌡️' },
  { key: 'humidity', label: '습도', unit: '%', thresholdKey: 'humidityThreshold', alarmKey: 'humidityAlarm', icon: '💧' },
  { key: 'fireRaw', label: '불꽃', unit: '', thresholdKey: 'fireThreshold', alarmKey: 'fireAlarm', icon: '🔥' },
  { key: 'gasRaw', label: '가스', unit: '', thresholdKey: 'gasThreshold', alarmKey: 'gasAlarm', icon: '🧪' },
]

// 센서 카드 상태 판단 — 실제 API-506 응답 필드(alarmKey/thresholdKey)로만 계산, 가짜 임계치 비교를 만들지 않는다.
export function getSensorFieldStatus(panel, field) {
  if (field.alarmKey && panel[field.alarmKey] === true) return 'danger'
  if (field.thresholdKey) {
    const value = panel[field.key]
    const threshold = panel[field.thresholdKey]
    if (typeof value === 'number' && typeof threshold === 'number' && value >= threshold) return 'warning'
  }
  return 'normal'
}

const EMPTY_PANEL_FORM = {
  name: '',
  deviceSerial: '',
  mNo: '',
  installedAt: '',
  circuitCount: String(MAX_CIRCUIT_COUNT),
  leakMaThreshold: '',
  tempThreshold: '',
  humidityThreshold: '',
  overcurrentThreshold: '',
  gasThreshold: '',
  fireThreshold: '',
}

// 분전반 빈 폼 생성
export function getEmptyPanelForm() {
  return { ...EMPTY_PANEL_FORM }
}

// 분전반 DTO → 폼 변환
export function panelToForm(panel) {
  return {
    name: panel?.name ?? '',
    deviceSerial: panel?.deviceSerial ?? '',
    mNo: panel?.mNo ?? '',
    installedAt: panel?.installedAt ?? '',
    circuitCount: String(panel?.circuitCount ?? MAX_CIRCUIT_COUNT),
    leakMaThreshold: toFormValue(panel?.leakMaThreshold),
    tempThreshold: toFormValue(panel?.tempThreshold),
    humidityThreshold: toFormValue(panel?.humidityThreshold),
    overcurrentThreshold: toFormValue(panel?.overcurrentThreshold),
    gasThreshold: toFormValue(panel?.gasThreshold),
    fireThreshold: toFormValue(panel?.fireThreshold),
  }
}

// 폼 값 문자열 변환
function toFormValue(value) {
  return value == null ? '' : String(value)
}

// 정수 문자열 여부 — "1.5"처럼 소수가 섞인 값을 parseInt로 조용히 잘라내지 않기 위한 사전 검사
export function isValidIntegerString(value) {
  return /^-?\d+$/.test(String(value ?? '').trim())
}

// 숫자 값 정규화 — 정수 필드는 형식이 정수가 아니면 NaN을 반환해 호출부의 Number.isFinite 검증에서 걸리게 한다
// (기존 Number.parseInt만 쓰던 방식은 "1.5" 같은 값을 1로 조용히 잘라내는 문제가 있었음)
function normalizeNumber(value, type) {
  if (value === '' || value == null) return null
  if (type === 'integer') {
    return isValidIntegerString(value) ? Number.parseInt(value, 10) : NaN
  }
  return Number(value)
}

// 분전반 폼 검증
export function validatePanelForm(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = '분전반 이름을 입력해주세요.'
  if (!form.deviceSerial.trim()) errors.deviceSerial = '장비 시리얼을 입력해주세요.'
  // 백엔드가 mNo를 센서 m_no 매핑키로 쓰기 때문에 선택값처럼 보이더라도 정확히 5자 필수다.
  if (form.mNo.trim().length !== M_NO_LENGTH) errors.mNo = `분전반No는 정확히 ${M_NO_LENGTH}자리여야 합니다.`

  if (!isValidIntegerString(form.circuitCount)) {
    errors.circuitCount = '회로 개수는 정수로 입력해주세요.'
  } else {
    const circuitCount = Number.parseInt(form.circuitCount, 10)
    if (circuitCount < MIN_CIRCUIT_COUNT || circuitCount > MAX_CIRCUIT_COUNT) {
      errors.circuitCount = `회로 개수는 ${MIN_CIRCUIT_COUNT}~${MAX_CIRCUIT_COUNT} 사이여야 합니다.`
    }
  }

  THRESHOLD_FIELDS.forEach((field) => {
    if (form[field.key] === '') return
    const value = normalizeNumber(form[field.key], field.type)
    if (!Number.isFinite(value)) {
      errors[field.key] = field.type === 'integer' ? '정수로 입력해주세요.' : '숫자로 입력해주세요.'
    } else if (field.min != null && value < field.min) {
      errors[field.key] = `${field.min} 이상으로 입력해주세요.`
    } else if (field.max != null && value > field.max) {
      errors[field.key] = `${field.max} 이하로 입력해주세요.`
    }
  })

  return errors
}

// 분전반 폼 → 요청 payload 변환
export function panelFormToPayload(form) {
  const payload = {
    name: form.name.trim(),
    deviceSerial: form.deviceSerial.trim(),
    mNo: form.mNo.trim(),
    installedAt: form.installedAt || null,
    circuitCount: Number.parseInt(form.circuitCount, 10),
  }
  // 빈 임계값은 null로 보내 서버 기본값 적용을 그대로 사용한다.
  THRESHOLD_FIELDS.forEach((field) => {
    payload[field.key] = normalizeNumber(form[field.key], field.type)
  })
  return payload
}

// 분전반 상태 라벨
export function formatPanelStatus(status) {
  return labelOf(PANEL_STATUS_LABELS, status)
}

// 회로 카드 위험도 — 실시간모니터링/이상감지 참고자료처럼 이상 상태에만 색을 입히기 위한 매핑
export function getCircuitRiskLevel(status) {
  if (status === 'RISK') return 'danger'
  if (status === 'CAUTION') return 'warning'
  if (status === 'OFFLINE') return 'offline'
  return 'normal'
}

// 경보 유형 라벨
export function formatAlertType(type) {
  return labelOf(ALERT_TYPE_LABELS, type)
}

// 경보 처리상태 라벨
export function formatAlertStatus(status) {
  return labelOf(ALERT_STATUS_LABELS, status)
}

// 통신 상태 라벨
export function formatOnline(isOnline) {
  if (isOnline === true) return '온라인'
  if (isOnline === false) return '통신두절'
  return '-'
}

// 날짜/시각 표시
export function formatDateTimeCell(value) {
  return formatDateTime(value)
}

// 단위 포함 값 표시
export function formatValue(value, unit = '') {
  if (value == null || value === '') return '-'
  return `${value}${unit ? ` ${unit}` : ''}`
}

// 주의 임계값 한 줄 요약 — "누설전류 20mA · 온도 80도 · ..."
export function formatThresholdSummary(panel) {
  return THRESHOLD_FIELDS.map((field) => `${field.label.replace(' 기준', '')} ${formatValue(panel[field.key], field.unit)}`).join(' · ')
}

// 서버 오류 메시지 추출
export function extractServerMessage(error, fallback) {
  return error?.response?.data?.resultMessage ?? fallback
}

// Promise.allSettled 결과 요약 — 실패 건마다 서버 resultMessage를 모아 사용자가 사유를 알 수 있게 한다.
// 실패 사유가 여러 종류면 최대 maxReasons개만 나열하고 나머지는 건수로 뭉뚱그린다(모달 무한 표시 방지).
export function summarizeSettledResults(results, maxReasons = 3) {
  const successCount = results.filter((result) => result.status === 'fulfilled').length
  const failed = results.filter((result) => result.status === 'rejected')
  const reasons = [...new Set(failed.map((result) => extractServerMessage(result.reason, '알 수 없는 오류')))]
  const shown = reasons.slice(0, maxReasons)
  const omitted = reasons.length - shown.length
  const failureReason = shown.length ? shown.join(', ') + (omitted > 0 ? ` 외 ${omitted}건` : '') : ''
  return { successCount, failCount: failed.length, failureReason }
}
