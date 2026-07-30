import { useEffect, useState } from 'react'
import { subscribeAlert } from '@/shared/api/uiAlertBus'

const AUTO_DISMISS_MS = 4000

// uiAlertBus 구독 → 전역 토스트로 렌더. 앱 최상위(App.jsx)에 한 번만 마운트 — 로그인 화면 등
// Layout 밖의 페이지에서도 네트워크/서버 공통 오류를 볼 수 있어야 하므로 특정 Layout 안에 두지 않는다.
export default function GlobalAlertHost() {
  const [message, setMessage] = useState(null)

  useEffect(() => subscribeAlert(setMessage), [])

  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(() => setMessage(null), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [message])

  if (!message) return null

  return (
    <div className="global-alert" role="alert">
      <span>{message}</span>
      <button type="button" className="global-alert__close" aria-label="닫기" onClick={() => setMessage(null)}>
        ×
      </button>
    </div>
  )
}
