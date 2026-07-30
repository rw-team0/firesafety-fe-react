import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmPasswordReset } from '../api/authApi'
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy'
import Button from '@/shared/components/buttons/Button'
import Input from '@/shared/components/forms/Input'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './PasswordResetConfirmPage.css'

// SCR-403 비밀번호 재설정 확정 — token은 이메일 링크의 쿼리 파라미터, 바디 필드명도 동일하게 'token'
export default function PasswordResetConfirmPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    // confirmPassword는 서버 계약에 없는 프론트 전용 검증 필드
    if (!newPassword || !confirmPassword) {
      setErrorMessage('새 비밀번호를 입력해주세요.')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('비밀번호가 일치하지 않습니다.')
      return
    }
    if (!isValidPassword(newPassword)) {
      setErrorMessage(PASSWORD_POLICY_MESSAGE)
      return
    }

    setLoading(true)
    try {
      const message = await confirmPasswordReset(token, newPassword)
      setResultMessage(message)
      setSubmitted(true)
    } catch (error) {
      // 401(토큰 무효/만료), 400(비밀번호 형식) 전부 서버 resultMessage 그대로 표시
      setErrorMessage(error.response?.data?.resultMessage ?? '비밀번호 재설정에 실패했습니다.')
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
        <p className="password-reset-page__subtitle">새 비밀번호 설정</p>

        {!token && (
          <div className="banner banner-danger">유효하지 않은 링크입니다. 재설정을 다시 요청해주세요.</div>
        )}

        {token && !submitted && (
          <form onSubmit={handleSubmit} className="password-reset-page__form">
            {errorMessage && <div className="banner banner-danger">{errorMessage}</div>}
            <Input
              label="새 비밀번호"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="새 비밀번호 확인"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" variant="primary" loading={loading} className="password-reset-page__submit">
              {loading ? '처리 중...' : '비밀번호 변경'}
            </Button>
          </form>
        )}

        {submitted && <div className="banner banner-info">{resultMessage}</div>}

        <p className="password-reset-page__footnote">
          <Link to={ROUTE_PATHS.login}>로그인으로 돌아가기</Link>
        </p>
      </div>
    </div>
  )
}
