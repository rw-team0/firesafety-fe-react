import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

// 로그인 여부만 검사
export default function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    const loginPath = location.pathname.startsWith('/m') ? '/m/login' : '/login' // 모바일 경로면 모바일 로그인으로
    return <Navigate to={loginPath} replace />
  }

  return children
}
