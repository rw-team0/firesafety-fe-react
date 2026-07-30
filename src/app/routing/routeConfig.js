import { ROLES } from '@/shared/constants/roles'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'

// 화면 실 구현은 다음 Phase, 지금은 PlaceholderPage 연결 + 라우트/권한/사이드바 골격만
// REQ-701/703은 범위 제외 확정 — route/menu/placeholder 어디에도 없음 (명세에 남아있어도 무시)

// layout: 'auth' | 'default' | 'mobile'. navGroup 있으면 DefaultLayout 사이드바 노출
export const routeConfig = [
  // 인증 (PC)
  { path: ROUTE_PATHS.login, layout: 'auth', requiredRole: null, title: '로그인', scrId: 'SCR-401' },
  {
    path: ROUTE_PATHS.passwordResetRequest,
    layout: 'auth',
    requiredRole: null,
    title: '비밀번호 재설정 요청',
    scrId: 'SCR-402',
  },
  {
    path: ROUTE_PATHS.passwordResetConfirm,
    layout: 'auth',
    requiredRole: null,
    title: '비밀번호 재설정',
    scrId: 'SCR-403',
  },

  // 관제 (PC)
  {
    path: ROUTE_PATHS.dashboard,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '대시보드',
    scrId: 'SCR-201',
    navGroup: '관제',
  },
  {
    path: ROUTE_PATHS.alerts,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '알림 이력',
    scrId: 'SCR-301',
    navGroup: '관제',
  },
  {
    path: ROUTE_PATHS.equipmentList,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '설비 목록',
    scrId: 'SCR-501',
    navGroup: '관제',
  },
  {
    path: ROUTE_PATHS.equipmentDetail,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '설비 상세',
    scrId: 'SCR-202',
  },

  // 통계 (PC)
  {
    path: ROUTE_PATHS.statistics,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '통계',
    scrId: 'SCR-601',
    navGroup: '통계',
  },

  // 관리 (PC) — 설정 하위
  { path: ROUTE_PATHS.settings, layout: 'default', requiredRole: ROLES.GENERAL, title: '설정' },
  {
    path: ROUTE_PATHS.settingsFacilities,
    layout: 'default',
    requiredRole: ROLES.ADMIN,
    title: '설비 관리',
    scrId: 'SCR-502',
    navGroup: '관리',
  },
  {
    path: ROUTE_PATHS.settingsFacilitiesHistory,
    layout: 'default',
    requiredRole: ROLES.SUPER_ADMIN,
    title: '설비 변경 이력',
    scrId: 'SCR-503',
  },
  {
    path: ROUTE_PATHS.settingsSiteAssignment,
    layout: 'default',
    requiredRole: ROLES.ADMIN,
    title: '담당현장 배정',
    scrId: 'SCR-504',
  },
  {
    path: ROUTE_PATHS.settingsAccounts,
    layout: 'default',
    requiredRole: ROLES.SUPER_ADMIN,
    title: '계정 관리',
    scrId: 'SCR-404',
    navGroup: '관리',
  },
  {
    path: ROUTE_PATHS.settingsAccountAdd,
    layout: 'default',
    requiredRole: ROLES.ADMIN,
    title: '계정 등록',
    scrId: 'SCR-405',
  },
  {
    path: ROUTE_PATHS.settingsAccountEdit,
    layout: 'default',
    requiredRole: ROLES.ADMIN,
    title: '계정 수정',
    scrId: 'SCR-406',
  },
  {
    path: ROUTE_PATHS.settingsAccountHistory,
    layout: 'default',
    requiredRole: ROLES.SUPER_ADMIN,
    title: '계정 변경 이력',
    scrId: 'SCR-407',
  },
  {
    path: ROUTE_PATHS.settingsSiteEdit,
    layout: 'default',
    requiredRole: ROLES.SUPER_ADMIN,
    title: '현장 수정',
  },

  // 설비 점검 [GAP] REQ-511/512 — 백엔드 완료, 프론트 신규 구현 대상 (오늘은 placeholder만)
  {
    path: ROUTE_PATHS.settingsInspectionChecklist,
    layout: 'default',
    requiredRole: ROLES.ADMIN,
    title: '점검 체크리스트',
    scrId: 'SCR-505',
    navGroup: '관리',
  },
  {
    path: ROUTE_PATHS.settingsInspectionHistory,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '점검 이력',
    scrId: 'SCR-506',
  },

  // 시스템 [GAP] REQ-702 — 백엔드 완료. REQ-703은 범위 제외라 여기 없음.
  {
    path: ROUTE_PATHS.systemAbout,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: 'SW 버전 정보',
    scrId: 'SCR-702',
    navGroup: '시스템',
  },

  // 모바일
  { path: ROUTE_PATHS.mobileLogin, layout: 'mobile-auth', requiredRole: null, title: '로그인', scrId: 'SCR-401-M' },
  {
    path: ROUTE_PATHS.mobileDashboard,
    layout: 'mobile',
    requiredRole: ROLES.GENERAL,
    title: '대시보드',
    scrId: 'SCR-201-M',
    navGroup: 'mobile',
  },
  {
    path: ROUTE_PATHS.mobileAlerts,
    layout: 'mobile',
    requiredRole: ROLES.GENERAL,
    title: '알림 이력',
    scrId: 'SCR-301-M',
    navGroup: 'mobile',
  },
]

// 사이드바 그룹 노출 순서 고정
export const NAV_GROUP_ORDER = ['관제', '통계', '관리', '시스템']

// 그룹명으로 사이드바 항목 필터링
export function getNavItems(group) {
  return routeConfig.filter((route) => route.navGroup === group)
}

// 모바일 하단탭 항목만 추출
export function getMobileNavItems() {
  return routeConfig.filter((route) => route.navGroup === 'mobile')
}
