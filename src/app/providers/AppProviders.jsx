import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthContext'
import { MonitoringProvider } from '@/features/monitoring/MonitoringContext'
import { SiteProvider } from '@/features/sites/SiteContext'

// 전역 Provider 묶음. 새 전역 Provider 추가 시 이 안에만 추가
// SiteProvider가 AuthProvider 안쪽인 이유: 현장 상태는 로그인 사용자(role)에 종속 — 반대 방향 참조는 만들지 않는다
// MonitoringProvider가 SiteProvider 안쪽인 이유: 담당 현장 목록/현재 현장으로 WS 구독·요약 조회 범위를 정한다(단방향)
export default function AppProviders({ children }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteProvider>
          <MonitoringProvider>{children}</MonitoringProvider>
        </SiteProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
