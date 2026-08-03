import { ALERT_TYPE_LABELS, PANEL_STATUS_LABELS, labelOf } from '@/shared/constants/domainLabels'
import { formatDateTime } from '@/shared/utils/formatters'

export const PANEL_STATUS_OPTIONS = [
  { value: 'NORMAL', label: PANEL_STATUS_LABELS.NORMAL },
  { value: 'CAUTION', label: PANEL_STATUS_LABELS.CAUTION },
  { value: 'RISK', label: PANEL_STATUS_LABELS.RISK },
  { value: 'OFFLINE', label: PANEL_STATUS_LABELS.OFFLINE },
]

export const THRESHOLD_FIELDS = [
  { key: 'leakMaThreshold', label: '누설전류 기준', unit: 'mA', type: 'decimal', placeholder: '기본값: 20.0' },
  { key: 'tempThreshold', label: '온도 기준', unit: '도', type: 'decimal', placeholder: '기본값: 80.0' },
  { key: 'humidityThreshold', label: '습도 기준', unit: '%', type: 'decimal', placeholder: '기본값: 80.0' },
  { key: 'overcurrentThreshold', label: '과전류 기준', unit: 'A', type: 'decimal', placeholder: '기본값: 30.0' },
  { key: 'gasThreshold', label: '가스 기준', unit: '', type: 'integer', placeholder: '기본값: 5000' },
  { key: 'fireThreshold', label: '불꽃 기준', unit: '', type: 'integer', placeholder: '기본값: 5000' },
]

const EMPTY_PANEL_FORM = {
  name: '',
  deviceSerial: '',
  mNo: '',
  installedAt: '',
  circuitCount: '10',
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
    circuitCount: String(panel?.circuitCount ?? 10),
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

// 숫자 값 정규화
function normalizeNumber(value, type) {
  if (value === '' || value == null) return null
  return type === 'integer' ? Number.parseInt(value, 10) : Number(value)
}

// 분전반 폼 검증
export function validatePanelForm(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = '분전반 이름을 입력해주세요.'
  if (!form.deviceSerial.trim()) errors.deviceSerial = '장비 시리얼을 입력해주세요.'
  // 백엔드가 mNo를 센서 m_no 매핑키로 쓰기 때문에 선택값처럼 보이더라도 정확히 5자 필수다.
  if (form.mNo.trim().length !== 5) errors.mNo = '장비번호는 정확히 5자리여야 합니다.'

  const circuitCount = Number.parseInt(form.circuitCount, 10)
  if (!Number.isInteger(circuitCount) || circuitCount < 1 || circuitCount > 10) {
    errors.circuitCount = '회로 개수는 1~10 사이여야 합니다.'
  }

  THRESHOLD_FIELDS.forEach((field) => {
    if (form[field.key] === '') return
    const value = normalizeNumber(form[field.key], field.type)
    if (!Number.isFinite(value)) errors[field.key] = '숫자로 입력해주세요.'
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

// 경보 유형 라벨
export function formatAlertType(type) {
  return labelOf(ALERT_TYPE_LABELS, type)
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

// 서버 오류 메시지 추출
export function extractServerMessage(error, fallback) {
  return error?.response?.data?.resultMessage ?? fallback
}

// 분전반 키워드 검색
export function includesPanelKeyword(panel, keyword) {
  if (!keyword) return true
  const normalized = keyword.toLowerCase()
  return [panel.deviceSerial, panel.name, panel.mNo].some((value) =>
    String(value ?? '').toLowerCase().includes(normalized),
  )
}
