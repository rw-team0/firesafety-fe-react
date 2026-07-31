import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { createSiteWithAdmin } from '../api/siteApi'
import { useSite } from '../useSite'
import { canManageSites } from '../utils/sitePolicy'
import { useAuth } from '@/features/auth/useAuth'
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from '@/features/auth/utils/passwordPolicy'
import Button from '@/shared/components/buttons/Button'
import Input from '@/shared/components/forms/Input'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './sitePageShell.css'

const INITIAL_FORM = {
  name: '',
  address: '',
  zipCode: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  adminPasswordConfirm: '',
  adminPhone: '',
}

// 현장 + 최초 현장관리자 통합 등록(POST /sites/with-admin). 백엔드가 단일 트랜잭션이라 이 화면에서 호출은 한 번뿐
export default function SiteCreatePage() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const { refreshSites } = useSite()

  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  if (!canManageSites(role)) return <Navigate to={ROUTE_PATHS.siteSelect} replace />

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev))
  }

  // DB 스키마 기준 필수값(site.name/address, user.name/email/password) — 최종 검증 책임은 백엔드
  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = '현장명을 입력해주세요.'
    if (!form.address.trim()) next.address = '주소를 입력해주세요.'
    if (!form.adminName.trim()) next.adminName = '관리자 이름을 입력해주세요.'
    if (!form.adminEmail.trim()) next.adminEmail = '관리자 이메일을 입력해주세요.'
    if (!form.adminPassword) next.adminPassword = '비밀번호를 입력해주세요.'
    else if (!isValidPassword(form.adminPassword)) next.adminPassword = PASSWORD_POLICY_MESSAGE
    if (form.adminPassword !== form.adminPasswordConfirm) next.adminPasswordConfirm = '비밀번호가 일치하지 않습니다.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const created = await createSiteWithAdmin({
        name: form.name.trim(),
        address: form.address.trim(),
        zipCode: form.zipCode.trim() || null,
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
        adminPhone: form.adminPhone.trim() || null,
      })
      await refreshSites().catch(() => {})
      // 등록 직후 자동 입장 안 시킴 — SUPER_ADMIN은 여러 현장을 연속 등록하는 경우가 많아 선택 화면으로 복귀
      setSuccessMessage(`${created?.siteName ?? form.name} 현장과 현장관리자 계정이 등록되었습니다.`)
    } catch (error) {
      // 현장명/이메일 중복(409)은 어느 필드 문제인지 서버 메시지로만 구분 가능 → 폼 상단에 그대로 노출
      setSubmitError(error?.response?.data?.resultMessage ?? '현장 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="site-shell">
      <div className="site-shell__inner site-form">
        <div className="site-shell__head">
          <div>
            <h1 className="site-shell__title">현장 등록</h1>
            <p className="site-shell__subtitle">
              현장과 최초 현장관리자 계정이 함께 등록됩니다. <span className="field-required">*</span> 표시는 필수
              항목입니다.
            </p>
          </div>
        </div>

        <form className="site-form__body card" onSubmit={handleSubmit}>
          {/* 서버가 보낸 실패 사유 — 필드별 인라인 에러와 구분되게 폼 상단 배너로 */}
          {submitError && (
            <div className="banner banner-danger" role="alert">
              {submitError}
            </div>
          )}

          <fieldset className="site-form__group">
            <legend className="site-form__legend site-form__section-head">
              현장 정보
              <span className="site-form__legend-desc">관제·설비 화면이 이 현장 기준으로 표시됩니다.</span>
            </legend>
            <Input
              label="현장명"
              requiredMark
              value={form.name}
              error={errors.name}
              onChange={(event) => updateField('name', event.target.value)}
            />
            <Input
              label="주소"
              requiredMark
              value={form.address}
              error={errors.address}
              onChange={(event) => updateField('address', event.target.value)}
            />
            <Input
              label="우편번호"
              value={form.zipCode}
              onChange={(event) => updateField('zipCode', event.target.value)}
            />
          </fieldset>

          <fieldset className="site-form__group">
            <legend className="site-form__legend site-form__section-head">
              최초 현장관리자
              <span className="site-form__legend-desc">이 현장을 담당할 현장관리자 계정이 함께 만들어집니다.</span>
            </legend>
            <Input
              label="이름"
              requiredMark
              value={form.adminName}
              error={errors.adminName}
              onChange={(event) => updateField('adminName', event.target.value)}
            />
            <Input
              label="이메일"
              type="email"
              autoComplete="off"
              requiredMark
              value={form.adminEmail}
              error={errors.adminEmail}
              onChange={(event) => updateField('adminEmail', event.target.value)}
            />
            <Input
              label="비밀번호"
              type="password"
              autoComplete="new-password"
              requiredMark
              hint={PASSWORD_POLICY_MESSAGE}
              value={form.adminPassword}
              error={errors.adminPassword}
              onChange={(event) => updateField('adminPassword', event.target.value)}
            />
            <Input
              label="비밀번호 확인"
              type="password"
              autoComplete="new-password"
              requiredMark
              value={form.adminPasswordConfirm}
              error={errors.adminPasswordConfirm}
              onChange={(event) => updateField('adminPasswordConfirm', event.target.value)}
            />
            <Input
              label="연락처"
              value={form.adminPhone}
              onChange={(event) => updateField('adminPhone', event.target.value)}
            />
          </fieldset>

          <div className="site-form__actions">
            <Button type="button" variant="secondary" onClick={() => navigate(ROUTE_PATHS.siteSelect)}>
              취소
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              등록
            </Button>
          </div>
        </form>
      </div>

      <ActionResultModal
        visible={Boolean(successMessage)}
        type="success"
        title="현장 등록"
        subtitle={successMessage}
        onClose={() => navigate(ROUTE_PATHS.siteSelect, { replace: true })}
      />
    </div>
  )
}
