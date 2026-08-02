import { canAutoEnterSingleSite } from './sitePolicy'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'

// 컴포넌트는 PC/모바일 공용(SiteSelectPage)이지만 주소는 /m/* 규칙에 맞춰 분리
export function buildSiteSelectPath(isMobile) {
  return isMobile ? ROUTE_PATHS.mobileSiteSelect : ROUTE_PATHS.siteSelect
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
