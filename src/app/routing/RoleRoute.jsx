import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { hasRequiredRole } from '@/shared/constants/roles'

// 권한 랭크만 검사 (ProtectedRoute 통과 후 적용 전제)
export default function RoleRoute({ requiredRole, children }) {
  const { role } = useAuth()
  const location = useLocation()

  if (!hasRequiredRole(role, requiredRole)) {
    const fallbackPath = location.pathname.startsWith('/m') ? '/m/dashboard' : '/dashboard' // 권한 미달 → 각자 대시보드로
    return <Navigate to={fallbackPath} replace />
  }

  return children
}
