import { ROLES } from '@/shared/constants/roles'

// 백엔드 UserService.validateCreatableRole과 동일 규칙
export function getCreatableRoles(actorRole) {
  if (actorRole === ROLES.SUPER_ADMIN) return [ROLES.ADMIN, ROLES.GENERAL]
  if (actorRole === ROLES.ADMIN) return [ROLES.ADMIN, ROLES.GENERAL]
  return []
}

// 백엔드 UserService.validateUpdatableRole과 동일 규칙 — 이 목록 밖 값을 보내면 서버가 403
export function getUpdatableRoles(actorRole, currentRole) {
  if (actorRole === ROLES.SUPER_ADMIN && currentRole !== ROLES.SUPER_ADMIN) return [ROLES.ADMIN, ROLES.GENERAL]
  if (actorRole === ROLES.ADMIN && currentRole !== ROLES.SUPER_ADMIN) return [ROLES.ADMIN, ROLES.GENERAL]
  return []
}

// ADMIN은 같은 현장 ADMIN/GENERAL을 수정할 수 있음(백엔드 권한 기준) — 폼 자체를 잠글 때 사용
export function canEditTarget(actorRole, currentRole) {
  if (actorRole === ROLES.SUPER_ADMIN) return currentRole !== ROLES.SUPER_ADMIN
  if (actorRole === ROLES.ADMIN) return currentRole !== ROLES.SUPER_ADMIN
  return false
}
