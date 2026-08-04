import { colorOf, INSPECTION_RESULT_COLOR } from '@/shared/constants/domainColors'
import { INSPECTION_RESULT_LABELS, labelOf } from '@/shared/constants/domainLabels'
import { formatDateTime } from '@/shared/utils/formatters'

// 점검 결과 라벨
export function formatInspectionResult(result) {
  return labelOf(INSPECTION_RESULT_LABELS, result)
}

// 점검 결과 배지 색상
export function getInspectionResultColor(result) {
  return colorOf(INSPECTION_RESULT_COLOR, result)
}

// 점검 일시 표기
export function formatInspectionDateTime(value) {
  return formatDateTime(value) || '-'
}

// 서버 resultMessage 우선 추출
export function extractInspectionServerMessage(error, fallback) {
  return error?.response?.data?.resultMessage || fallback
}

// 항목별 결과 개수 요약
export function summarizeInspectionResults(results = []) {
  return results.reduce(
    (acc, item) => {
      const key = item?.result
      if (key === 'NORMAL') acc.normal += 1
      else if (key === 'ABNORMAL') acc.abnormal += 1
      else acc.unchecked += 1
      return acc
    },
    { normal: 0, abnormal: 0, unchecked: 0 },
  )
}
