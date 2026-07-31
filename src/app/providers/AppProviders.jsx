import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthContext'
import { SiteProvider } from '@/features/sites/SiteContext'

// 전역 Provider 묶음. 새 전역 Provider 추가 시 이 안에만 추가
// SiteProvider가 AuthProvider 안쪽인 이유: 현장 상태는 로그인 사용자(role)에 종속 — 반대 방향 참조는 만들지 않는다
export default function AppProviders({ children }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteProvider>{children}</SiteProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
