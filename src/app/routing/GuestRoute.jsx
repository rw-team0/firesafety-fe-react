import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import { buildSiteSelectPath } from '@/features/sites/utils/siteEntry'

// 로그인 화면 전용 — 이미 로그인된 상태면 돌려보냄(ProtectedRoute의 반대 방향)
export default function GuestRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth()
  const { currentSite } = useSite()
  const location = useLocation()

  if (isInitializing) return null

  if (isAuthenticated) {
    const isMobile = location.pathname.startsWith('/m')
    // 현장 미선택 상태로 대시보드에 보내면 SiteRoute가 되돌려보내므로 처음부터 선택 화면으로 보낸다
    if (!currentSite) return <Navigate to={buildSiteSelectPath(isMobile)} replace />
    return <Navigate to={isMobile ? '/m/dashboard' : '/dashboard'} replace />
  }

  return children
}
