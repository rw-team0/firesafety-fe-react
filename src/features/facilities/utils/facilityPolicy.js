import { ROLES } from '@/shared/constants/roles'

// 설비 관리 가능 여부
export function canManageFacilities(role) {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN
}
