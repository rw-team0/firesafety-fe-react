import { ROLES } from '@/shared/constants/roles'

// 백엔드 UserService.validateCreatableRole과 동일 규칙
export function getCreatableRoles(actorRole) {
  if (actorRole === ROLES.SUPER_ADMIN) return [ROLES.ADMIN, ROLES.GENERAL]
  if (actorRole === ROLES.ADMIN) return [ROLES.GENERAL]
  return []
}

// 백엔드 UserService.validateUpdatableRole과 동일 규칙 — 이 목록 밖 값을 보내면 서버가 403
export function getUpdatableRoles(actorRole, currentRole) {
  if (actorRole === ROLES.SUPER_ADMIN && currentRole !== ROLES.SUPER_ADMIN) return [ROLES.ADMIN, ROLES.GENERAL]
  if (actorRole === ROLES.ADMIN && currentRole === ROLES.GENERAL) return [ROLES.GENERAL]
  return []
}

// ADMIN은 다른 ADMIN 계정을 수정할 수 없음(백엔드 403/AUTH-003과 동일 기준) — 폼 자체를 잠글 때 사용
export function canEditTarget(actorRole, currentRole) {
  if (actorRole === ROLES.SUPER_ADMIN) return currentRole !== ROLES.SUPER_ADMIN
  if (actorRole === ROLES.ADMIN) return currentRole === ROLES.GENERAL
  return false
}
