import AppProviders from './providers/AppProviders'
import AppRouter from './routing/router'

// 최상위 조립: Provider로 감싼 뒤 라우터 렌더
export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}
