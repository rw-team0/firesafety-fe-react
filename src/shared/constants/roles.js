// 백엔드 UserRole enum과 동일 문자열
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  GENERAL: 'GENERAL',
}

// 숫자 클수록 상위 권한, exact-match 아닌 랭크 비교
export const ROLE_RANK = {
  [ROLES.SUPER_ADMIN]: 3,
  [ROLES.ADMIN]: 2,
  [ROLES.GENERAL]: 1,
}

// 요구 권한 충족 여부 판단
export function hasRequiredRole(userRole, requiredRole) {
  if (!requiredRole) return true // 제한 없음 → 통과
  if (!userRole) return false // 비로그인 → 실패
  return ROLE_RANK[userRole] >= ROLE_RANK[requiredRole] // 등급 이상이면 통과
}
