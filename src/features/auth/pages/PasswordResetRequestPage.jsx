import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/authApi'
import Button from '@/shared/components/buttons/Button'
import Input from '@/shared/components/forms/Input'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './PasswordResetRequestPage.css'

// SCR-402 비밀번호 재설정 요청 — 계정 존재 여부와 무관하게 백엔드가 항상 동일 응답
export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!email) return
    setLoading(true)
    setErrorMessage('')
    try {
      const message = await requestPasswordReset(email)
      setResultMessage(message)
      setSubmitted(true)
    } catch (error) {
      // 429(요청 과다) 등 실패 케이스만 여기로 옴 — 계정 미존재는 성공으로 응답되므로 여기 안 옴
      setErrorMessage(error.response?.data?.resultMessage ?? '요청 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="password-reset-page">
      <div className="password-reset-page__card card">
        <div className="password-reset-page__brand">
          <img src="/ArcGuard.png" alt="" className="password-reset-page__logo" />
          ArcGuard
        </div>
        <p className="password-reset-page__subtitle">비밀번호 재설정 요청</p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="password-reset-page__form">
            {errorMessage && <div className="banner banner-danger">{errorMessage}</div>}
            <Input
              label="이메일"
              type="email"
              autoComplete="username"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" variant="primary" loading={loading} disabled={!email} className="password-reset-page__submit">
              {loading ? '요청 중...' : '재설정 링크 요청'}
            </Button>
          </form>
        ) : (
          <div className="banner banner-info">{resultMessage}</div>
        )}

        <p className="password-reset-page__footnote">
          <Link to={ROUTE_PATHS.login}>로그인으로 돌아가기</Link>
        </p>
      </div>
    </div>
  )
}
