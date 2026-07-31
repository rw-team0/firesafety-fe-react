import { canAutoEnterSingleSite } from './sitePolicy'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'

// 현장 선택 화면은 PC/모바일 공용이라 선택 후 돌아갈 대시보드를 next 쿼리로 전달
export function buildSiteSelectPath(isMobile) {
  if (!isMobile) return ROUTE_PATHS.siteSelect
  return `${ROUTE_PATHS.siteSelect}?next=${encodeURIComponent(ROUTE_PATHS.mobileDashboard)}`
}

// 로그인 직후와 SiteRoute 가드가 공유하는 역할별 진입 규칙(0/1/N)
// autoSelect가 있으면 호출부가 selectSite() 후 path로 이동
export function resolveSiteEntry({ role, sites, isMobile = false }) {
  const dashboardPath = isMobile ? ROUTE_PATHS.mobileDashboard : ROUTE_PATHS.dashboard

  if (!canAutoEnterSingleSite(role)) return { path: buildSiteSelectPath(isMobile), autoSelect: null }
  if (sites.length === 0) return { path: ROUTE_PATHS.siteUnassigned, autoSelect: null }
  if (sites.length === 1) return { path: dashboardPath, autoSelect: sites[0] }
  return { path: buildSiteSelectPath(isMobile), autoSelect: null }
}
