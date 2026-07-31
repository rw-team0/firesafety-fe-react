import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { useSite } from '@/features/sites/useSite'
import { resolveSiteEntry } from '@/features/sites/utils/siteEntry'
import Button from '@/shared/components/buttons/Button'
import Checkbox from '@/shared/components/forms/Checkbox'
import Input from '@/shared/components/forms/Input'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './LoginPage.css'

const SAVED_EMAIL_KEY = 'savedEmail'

// SCR-401 PC 로그인
export default function LoginPage() {
  const { login, isLoggingIn } = useAuth()
  const { loadSites, selectSite, clearCurrentSite } = useSite()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // localStorage 읽기는 렌더 중 계산(lazy initializer)으로 처리 — effect에서 setState 하지 않음
  const [email, setEmail] = useState(() => localStorage.getItem(SAVED_EMAIL_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [saveEmail, setSaveEmail] = useState(() => Boolean(localStorage.getItem(SAVED_EMAIL_KEY)))
  const [errorMessage, setErrorMessage] = useState('')
  // 최초 진입 시점의 query만 캡처 — 이후 query를 지워도(아래 effect) 배너가 바로 사라지지 않게
  const [sessionExpired] = useState(() => searchParams.get('expired') === '1')

  // 세션 만료 배너는 한 번 보여준 뒤 query에서 제거(새로고침하면 다시 뜨지 않게) — URL 동기화라 effect가 맞는 자리
  useEffect(() => {
    if (!sessionExpired) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('expired')
      return next
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!email || !password) {
      setErrorMessage('이메일 또는 비밀번호를 입력해주세요.')
      return
    }
    setErrorMessage('')
    let profile
    try {
      profile = await login(email, password)
      if (saveEmail) localStorage.setItem(SAVED_EMAIL_KEY, email)
      else localStorage.removeItem(SAVED_EMAIL_KEY)
    } catch (error) {
      setErrorMessage(error.response?.data?.resultMessage ?? '로그인에 실패했습니다.')
      return
    }

    // 로그인 성공 후 현장 목록 1회 조회 → 역할과 현장 수(0/1/N)에 따라 진입 지점 결정
    // 이 조회가 실패해도 로그인 자체는 되돌리지 않는다 — 선택 화면에서 재시도할 수 있게 안내만 하고 이동
    try {
      const sites = await loadSites({ force: true })
      const { path, autoSelect } = resolveSiteEntry({ role: profile.role, sites })
      if (autoSelect) selectSite(autoSelect)
      else clearCurrentSite()
      navigate(path, { replace: true })
    } catch {
      clearCurrentSite()
      navigate(ROUTE_PATHS.siteSelect, { replace: true })
    }
  }

  return (
    <div className="login-page">
      <form className="login-page__card card" onSubmit={handleSubmit}>
        <div className="login-page__brand">
          <img src="/ArcGuard.png" alt="" className="login-page__logo" />
          ArcGuard
        </div>
        <p className="login-page__subtitle">전기화재 예방 스마트 진단/모니터링</p>

        {sessionExpired && <div className="banner banner-warn">세션이 만료되어 로그인이 필요합니다.</div>}
        {errorMessage && <div className="banner banner-danger">{errorMessage}</div>}

        <Input
          label="이메일"
          type="email"
          autoComplete="username"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" variant="primary" loading={isLoggingIn} className="login-page__submit">
          {isLoggingIn ? '로그인 중...' : '로그인'}
        </Button>

        <Checkbox
          label="이메일 저장"
          checked={saveEmail}
          onChange={(e) => setSaveEmail(e.target.checked)}
        />

        <p className="login-page__footnote">
          <Link to={ROUTE_PATHS.passwordResetRequest}>비밀번호를 잊으셨나요?</Link>
        </p>
        <p className="login-page__footnote">계정 발급은 상위 관리자에게 문의하세요.</p>
      </form>
    </div>
  )
}
