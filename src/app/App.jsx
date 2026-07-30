import GlobalAlertHost from '@/shared/components/feedback/GlobalAlertHost'
import AppProviders from './providers/AppProviders'
import AppRouter from './routing/router'

// 최상위 조립: Provider로 감싼 뒤 라우터 렌더. 전역 알림은 Layout 밖(로그인 화면 포함)에서도 보여야 해서 여기 마운트
export default function App() {
  return (
    <AppProviders>
      <AppRouter />
      <GlobalAlertHost />
    </AppProviders>
  )
}
