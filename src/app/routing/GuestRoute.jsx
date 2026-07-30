import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

// 로그인 화면 전용 — 이미 로그인된 상태면 각자 대시보드로 돌려보냄(ProtectedRoute의 반대 방향)
export default function GuestRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) return null

  if (isAuthenticated) {
    const dashboardPath = location.pathname.startsWith('/m') ? '/m/dashboard' : '/dashboard'
    return <Navigate to={dashboardPath} replace />
  }

  return children
}
