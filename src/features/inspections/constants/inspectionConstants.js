import { INSPECTION_RESULT_LABELS } from '@/shared/constants/domainLabels'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'

export const INSPECTION_RESULT_OPTIONS = Object.entries(INSPECTION_RESULT_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const INSPECTION_HISTORY_PAGE_SIZE = 10
export const INSPECTION_PANEL_SELECT_SIZE = 100

export const INSPECTION_TABS = [
  { label: '점검관리', to: ROUTE_PATHS.settingsInspectionChecklist, end: true },
  { label: '점검이력', to: ROUTE_PATHS.settingsInspectionHistory },
]
