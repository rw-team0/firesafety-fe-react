import { Link } from 'react-router-dom'

// routeConfig에 없는 경로 전부 여기로 (app/router.jsx catch-all)
export default function NotFoundPage() {
  return (
    <div
      className="u-flex-col u-items-center u-gap-12"
      style={{ minHeight: '100vh', justifyContent: 'center', textAlign: 'center', padding: 'var(--space-24)' }}
    >
      <span className="not-found__icon" aria-hidden="true">
        {/* 끊긴 회로/플러그 모티프 — ArcGuard(전기 설비 점검) 도메인에 맞춘 아이콘 */}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 7V4M15 7V4M7 7h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9 20v-4M15 20v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>

      <p className="not-found__code">404</p>
      <h1 style={{ fontSize: 'var(--font-size-title)' }}>페이지를 찾을 수 없습니다</h1>
      <p className="u-text-secondary">주소를 다시 확인하시거나 대시보드로 이동해주세요.</p>

      <Link className="btn btn-primary" to="/dashboard" style={{ marginTop: 'var(--space-8)' }}>
        대시보드로 이동
      </Link>
    </div>
  )
}
