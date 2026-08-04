import AccountHistoryPage from '@/features/accounts/pages/AccountHistoryPage'
import AccountListPage from '@/features/accounts/pages/AccountListPage'
import AlertHistoryPage from '@/features/alerts/pages/AlertHistoryPage'
import MobileAlertSettingsPage from '@/features/alerts/pages/MobileAlertSettingsPage'
import MobileAlertsPage from '@/features/alerts/pages/MobileAlertsPage'
import LoginPage from '@/features/auth/pages/LoginPage'
import MobileLoginPage from '@/features/auth/pages/MobileLoginPage'
import PasswordResetConfirmPage from '@/features/auth/pages/PasswordResetConfirmPage'
import PasswordResetRequestPage from '@/features/auth/pages/PasswordResetRequestPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import MobileDashboardPage from '@/features/dashboard/pages/MobileDashboardPage'
import EquipmentDetailPage from '@/features/facilities/pages/EquipmentDetailPage'
import EquipmentListPage from '@/features/facilities/pages/EquipmentListPage'
import FacilityHistoryPage from '@/features/facilities/pages/FacilityHistoryPage'
import FacilityManagePage from '@/features/facilities/pages/FacilityManagePage'
import InspectionChecklistPage from '@/features/inspections/pages/InspectionChecklistPage'
import InspectionHistoryPage from '@/features/inspections/pages/InspectionHistoryPage'
import MobileSiteSelectPage from '@/features/sites/pages/MobileSiteSelectPage'
import SiteSelectPage from '@/features/sites/pages/SiteSelectPage'
import SiteUnassignedPage from '@/features/sites/pages/SiteUnassignedPage'
import StatisticsPage from '@/features/statistics/pages/StatisticsPage'
import SystemAboutPage from '@/features/system/pages/SystemAboutPage'
import { ROLES } from '@/shared/constants/roles'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'

// page가 지정된 라우트는 실제 화면, 없는 라우트는 PlaceholderPage로 렌더된다.
// REQ-701/703은 범위 제외 확정 — route/menu/placeholder 어디에도 없음 (명세에 남아있어도 무시)

// layout: 'auth' | 'default' | 'mobile'. navGroup 있으면 DefaultLayout 사이드바 노출
// requiresSite: 선택된 현장이 있어야 의미가 있는 업무 화면 → SiteRoute로 추가 래핑
export const routeConfig = [
  // 인증 (PC)
  {
    path: ROUTE_PATHS.login,
    layout: 'auth',
    requiredRole: null,
    title: '로그인',
    scrId: 'SCR-401',
    page: LoginPage,
    guestOnly: true, // 로그인 상태면 대시보드로 리다이렉트
  },
  {
    path: ROUTE_PATHS.passwordResetRequest,
    layout: 'auth',
    requiredRole: null,
    title: '비밀번호 재설정 요청',
    scrId: 'SCR-402',
    page: PasswordResetRequestPage,
  },
  {
    path: ROUTE_PATHS.passwordResetConfirm,
    layout: 'auth',
    requiredRole: null,
    title: '비밀번호 재설정',
    scrId: 'SCR-403',
    page: PasswordResetConfirmPage,
  },

  // 현장 — 사이드바 진입 전 독립 화면이라 layout 'auth'(빈 셸) 사용. SiteRoute 대상이 아님(가드 왕복 방지)
  {
    path: ROUTE_PATHS.siteSelect,
    layout: 'auth',
    requiredRole: ROLES.GENERAL,
    title: '현장 선택',
    page: SiteSelectPage,
  },
  {
    path: ROUTE_PATHS.siteUnassigned,
    layout: 'auth',
    requiredRole: ROLES.GENERAL,
    title: '배정 현장 없음',
    page: SiteUnassignedPage,
  },
  {
    // 모바일 전용 페이지 — 선택·입장만, 관리 액션(등록/수정/삭제) 없음
    path: ROUTE_PATHS.mobileSiteSelect,
    layout: 'auth',
    requiredRole: ROLES.GENERAL,
    title: '현장 선택',
    page: MobileSiteSelectPage,
  },
  // 관제 (PC)
  {
    path: ROUTE_PATHS.dashboard,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '대시보드',
    scrId: 'SCR-201',
    requiresSite: true,
    navGroup: '관제',
    page: DashboardPage,
  },
  {
    path: ROUTE_PATHS.alerts,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '알림 이력',
    scrId: 'SCR-301',
    requiresSite: true,
    navGroup: '관제',
    page: AlertHistoryPage,
  },
  {
    path: ROUTE_PATHS.equipmentList,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '설비 모니터링',
    scrId: 'SCR-501',
    requiresSite: true,
    navGroup: '관제',
    page: EquipmentListPage,
  },
  {
    path: ROUTE_PATHS.equipmentDetail,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '설비 상세',
    scrId: 'SCR-202',
    requiresSite: true,
    page: EquipmentDetailPage,
  },

  // 통계 (PC)
  {
    path: ROUTE_PATHS.statistics,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '통계',
    scrId: 'SCR-601',
    requiresSite: true,
    navGroup: '통계',
    page: StatisticsPage,
  },

  // 관리 (PC) — 설정 하위
  { path: ROUTE_PATHS.settings, layout: 'default', requiredRole: ROLES.GENERAL, title: '설정' },
  {
    path: ROUTE_PATHS.settingsFacilities,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '설비 관리',
    scrId: 'SCR-502',
    requiresSite: true,
    navGroup: '관리',
    page: FacilityManagePage,
  },
  {
    // 감사 로그 API가 siteId 스코프 없이 전체 현장을 다뤄서 계정 관리이력(SCR-407)과 같이 requiresSite 없음
    path: ROUTE_PATHS.settingsFacilitiesHistory,
    layout: 'default',
    requiredRole: ROLES.SUPER_ADMIN,
    title: '설비 변경 이력',
    scrId: 'SCR-503',
    page: FacilityHistoryPage,
  },
  {
    path: ROUTE_PATHS.settingsAccounts,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '직원 관리',
    scrId: 'SCR-404',
    requiresSite: true,
    navGroup: '관리',
    page: AccountListPage,
  },
  {
    path: ROUTE_PATHS.settingsAccountHistory,
    layout: 'default',
    requiredRole: ROLES.SUPER_ADMIN,
    title: '직원 관리이력',
    scrId: 'SCR-407',
    page: AccountHistoryPage,
    forbiddenMessage: '직원 관리이력 조회 권한이 없습니다.',
  },
  // 설비 점검 [GAP] REQ-511/512 — 사이드바는 점검 관리 1개, 화면 안 탭으로 점검관리/점검이력 전환
  {
    path: ROUTE_PATHS.settingsInspectionChecklist,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '점검 관리',
    scrId: 'SCR-505',
    requiresSite: true,
    navGroup: '관리',
    page: InspectionChecklistPage,
  },
  {
    path: ROUTE_PATHS.settingsInspectionHistory,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: '점검 이력',
    scrId: 'SCR-506',
    requiresSite: true,
    page: InspectionHistoryPage,
  },

  // 시스템 [GAP] REQ-702 — 백엔드 완료. REQ-703은 범위 제외라 여기 없음.
  {
    path: ROUTE_PATHS.systemAbout,
    layout: 'default',
    requiredRole: ROLES.GENERAL,
    title: 'SW 버전 정보',
    scrId: 'SCR-702',
    navGroup: '시스템',
    page: SystemAboutPage,
  },

  // 모바일
  {
    path: ROUTE_PATHS.mobileLogin,
    layout: 'mobile-auth',
    requiredRole: null,
    title: '로그인',
    scrId: 'SCR-401-M',
    page: MobileLoginPage,
    guestOnly: true,
  },
  // 하단탭 순서 고정: 설비 - 점검 - 홈 - 직원 - 더보기(라우트 아님, MobileLayout에서 드로어 오픈 버튼으로 별도 처리)
  {
    path: ROUTE_PATHS.mobileEquipmentList,
    layout: 'mobile',
    requiredRole: ROLES.GENERAL,
    title: '설비',
    menuLabel: '설비관리', // 드로어 "전체메뉴보기" 전용 표기(탭 라벨은 title 그대로 짧게)
    scrId: 'SCR-501-M',
    requiresSite: true,
    navGroup: 'mobile',
  },
  {
    path: ROUTE_PATHS.mobileEquipmentDetail,
    layout: 'mobile',
    requiredRole: ROLES.GENERAL,
    title: '설비 상세',
    scrId: 'SCR-202-M',
    requiresSite: true,
  },
  {
    path: ROUTE_PATHS.mobileInspection,
    layout: 'mobile',
    requiredRole: ROLES.GENERAL,
    title: '점검',
    menuLabel: '점검관리',
    scrId: 'SCR-505-M',
    requiresSite: true,
    navGroup: 'mobile',
  },
  {
    path: ROUTE_PATHS.mobileDashboard,
    layout: 'mobile',
    requiredRole: ROLES.GENERAL,
    title: '홈',
    menuLabel: '대시보드',
    scrId: 'SCR-201-M',
    requiresSite: true,
    navGroup: 'mobile',
    page: MobileDashboardPage,
  },
  {
    path: ROUTE_PATHS.mobileAccountsContacts,
    layout: 'mobile',
    requiredRole: ROLES.GENERAL,
    title: '직원',
    menuLabel: '직원관리',
    scrId: 'SCR-404-M',
    requiresSite: true,
    navGroup: 'mobile',
  },
  // 하단탭에는 없음 — 헤더 종 아이콘 + 드로어 전체메뉴로만 진입
  {
    path: ROUTE_PATHS.mobileAlerts,
    layout: 'mobile',
    requiredRole: ROLES.GENERAL,
    title: '알림 이력',
    menuLabel: '알림이력',
    scrId: 'SCR-301-M',
    requiresSite: true,
    page: MobileAlertsPage,
  },
  // 알림 목록 화면의 톱니 버튼으로만 진입 — 탭/드로어 어디에도 노출 안 함
  {
    path: ROUTE_PATHS.mobileAlertSettings,
    layout: 'mobile',
    requiredRole: ROLES.GENERAL,
    title: '알림 설정',
    scrId: 'SCR-301-M',
    requiresSite: true,
    page: MobileAlertSettingsPage,
  },
]

// 드로어 "전체메뉴보기" 노출 순서 고정(하단탭 순서와 다름, 알림 포함)
const MOBILE_FULL_MENU_ORDER = [
  ROUTE_PATHS.mobileDashboard,
  ROUTE_PATHS.mobileAccountsContacts,
  ROUTE_PATHS.mobileEquipmentList,
  ROUTE_PATHS.mobileInspection,
  ROUTE_PATHS.mobileAlerts,
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

// 드로어 "전체메뉴보기" 항목 — 하단탭과 별개 순서/구성(알림 포함)
export function getMobileFullMenuItems() {
  return MOBILE_FULL_MENU_ORDER.map((path) => routeConfig.find((route) => route.path === path)).filter(Boolean)
}
