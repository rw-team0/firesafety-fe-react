import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkEmailDuplicate, createUser, getSites, saveSiteAssignments } from '../api/accountApi'
import { getCreatableRoles } from '../utils/rolePolicy'
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from '@/features/auth/utils/passwordPolicy'
import { useAuth } from '@/features/auth/useAuth'
import Button from '@/shared/components/buttons/Button'
import Checkbox from '@/shared/components/forms/Checkbox'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './AccountCreatePage.css'

// SCR-405 계정 추가 — 담당현장은 체크박스 다중선택으로 구현(AUTH-019, Vue의 단일 select 규제 안 따름)
export default function AccountCreatePage() {
  const navigate = useNavigate()
  const { role: actorRole } = useAuth()
  const creatableRoles = getCreatableRoles(actorRole)

  const [sites, setSites] = useState([])
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    role: creatableRoles[0] ?? '',
  })
  const [selectedSiteIds, setSelectedSiteIds] = useState([])
  const [emailChecked, setEmailChecked] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    getSites().then(setSites)
  }, [])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'email') {
      // 이메일을 다시 고치면 이전 중복확인 결과는 무효 — 최종 검증은 어차피 제출 시 서버가 다시 함
      setEmailChecked(false)
      setEmailAvailable(null)
    }
  }

  function toggleSite(siteId) {
    setSelectedSiteIds((prev) => (prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]))
  }

  async function handleCheckEmail() {
    if (!form.email) return
    const data = await checkEmailDuplicate(form.email)
    setEmailAvailable(!data.duplicate)
    setEmailChecked(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    if (!form.name || !form.email || !form.password || !form.phone) {
      setErrorMessage('필수 항목을 모두 입력해주세요.')
      return
    }
    if (form.password !== form.passwordConfirm) {
      setErrorMessage('비밀번호가 일치하지 않습니다.')
      return
    }
    if (!isValidPassword(form.password)) {
      setErrorMessage(PASSWORD_POLICY_MESSAGE)
      return
    }

    setSubmitting(true)
    try {
      const created = await createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: form.role,
      })

      if (selectedSiteIds.length > 0) {
        try {
          await saveSiteAssignments(created.userId, selectedSiteIds)
        } catch {
          // 계정 생성은 이미 성공 — 배정 실패로 계정을 임의로 되돌리지 않고, 부분 성공을 그대로 안내
          setResult({ message: '계정은 등록되었지만 담당현장 배정에 실패했습니다. 계정 수정 화면에서 다시 지정해주세요.' })
          return
        }
      }
      setResult({ message: '계정이 등록되었습니다.' })
    } catch (error) {
      setErrorMessage(error.response?.data?.resultMessage ?? '등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="account-create card">
      <form onSubmit={handleSubmit} className="account-create__form">
        {errorMessage && <div className="banner banner-danger">{errorMessage}</div>}

        <Input label="이름" value={form.name} onChange={(e) => updateField('name', e.target.value)} />

        <div className="account-create__email-row">
          <Input
            label="이메일"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={handleCheckEmail}>
            중복확인
          </Button>
        </div>
        {emailChecked && (
          <p className={emailAvailable ? 'account-create__email-ok' : 'account-create__email-taken'}>
            {emailAvailable ? '사용 가능한 이메일입니다.' : '이미 사용 중인 이메일입니다.'}
          </p>
        )}

        <Input
          label="비밀번호"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
        />
        <Input
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={form.passwordConfirm}
          onChange={(e) => updateField('passwordConfirm', e.target.value)}
        />
        <Input label="연락처" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />

        <Select
          label="권한"
          value={form.role}
          onChange={(e) => updateField('role', e.target.value)}
          options={creatableRoles.map((role) => ({ value: role, label: USER_ROLE_LABELS[role] ?? role }))}
        />

        <div className="field">
          <span className="field-label">담당현장</span>
          <div className="account-create__site-list">
            {sites.map((site) => (
              <Checkbox
                key={site.siteId}
                label={site.name}
                checked={selectedSiteIds.includes(site.siteId)}
                onChange={() => toggleSite(site.siteId)}
              />
            ))}
            {sites.length === 0 && <p className="u-text-muted">등록된 현장이 없습니다.</p>}
          </div>
        </div>

        <div className="account-create__actions">
          <Button type="button" variant="secondary" onClick={() => navigate(ROUTE_PATHS.settingsAccounts)}>
            취소
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            등록
          </Button>
        </div>
      </form>

      <ActionResultModal
        visible={Boolean(result)}
        type="success"
        title="계정 등록"
        subtitle={result?.message}
        onClose={() => navigate(ROUTE_PATHS.settingsAccounts)}
      />
    </div>
  )
}
