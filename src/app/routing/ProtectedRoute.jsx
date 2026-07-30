import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

// 로그인 여부만 검사
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) return null // 세션 복구 확인 전엔 아무것도 렌더하지 않음(잘못된 리다이렉트 방지)

  if (!isAuthenticated) {
    const loginPath = location.pathname.startsWith('/m') ? '/m/login' : '/login' // 모바일 경로면 모바일 로그인으로
    return <Navigate to={loginPath} replace />
  }

  return children
}
