import { ROLES } from '@/shared/constants/roles'

export function isSuperAdmin(role) {
  return role === ROLES.SUPER_ADMIN
}

// 현장 등록/수정/삭제는 백엔드 SiteService.requireSuperAdmin과 동일하게 SUPER_ADMIN 전용
export function canManageSites(role) {
  return isSuperAdmin(role)
}

// SUPER_ADMIN은 배정 개념이 없어 항상 전체 목록 — 현장이 1개여도 자동입장 안 시킴
export function canAutoEnterSingleSite(role) {
  return Boolean(role) && !isSuperAdmin(role)
}
