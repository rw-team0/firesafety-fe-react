import { useEffect, useMemo, useState } from 'react'
import { checkEmailDuplicate, createUser, saveSiteAssignments } from '../api/accountApi'
import { getCreatableRoles } from '../utils/rolePolicy'
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from '@/features/auth/utils/passwordPolicy'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import Button from '@/shared/components/buttons/Button'
import Checkbox from '@/shared/components/forms/Checkbox'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import BaseModal from '@/shared/components/modals/BaseModal'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { formatResultDateTime } from '@/shared/utils/formatters'
import '../pages/accountFormShell.css'
import './AccountModal.css'

const INITIAL_FORM = { name: '', email: '', password: '', passwordConfirm: '', phone: '', role: '' }

// SCR-405 직원 등록 — 페이지 대신 모달로 뜬다(목록에서 여닫는 흐름이라 URL 이동이 필요 없음)
export default function AccountCreateModal({ visible, onClose, onCreated }) {
  const { user, role: actorRole } = useAuth()
  const { sites, currentSiteId } = useSite()
  const creatableRoles = useMemo(() => getCreatableRoles(actorRole), [actorRole])

  const [form, setForm] = useState(INITIAL_FORM)
  const [selectedSiteIds, setSelectedSiteIds] = useState([])
  const [emailChecked, setEmailChecked] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  // 배정 실패로 계정만 먼저 생성된 경우의 userId — 다시 제출할 때 계정을 또 만들지 않고 배정만 재시도하기 위함
  const [createdUserId, setCreatedUserId] = useState(null)

  useEffect(() => {
    if (!visible) return
    // 모달을 열 때마다 이전 입력이 남지 않게 초기화
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ ...INITIAL_FORM, role: creatableRoles[0] ?? '' })
    setSelectedSiteIds(currentSiteId ? [currentSiteId] : [])
    setEmailChecked(false)
    setEmailAvailable(null)
    setErrorMessage('')
    setResult(null)
    setCreatedUserId(null)
  }, [visible, creatableRoles, currentSiteId])

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

    // 배정만 재시도하는 단계에선 계정 필드 재검증이 필요 없음(이미 서버에 생성된 값)
    if (!createdUserId) {
      if (!form.name || !form.email || !form.password || !form.phone || !form.role) {
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
    }

    setSubmitting(true)
    try {
      let userId = createdUserId
      if (!userId) {
        const created = await createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          role: form.role,
        })
        userId = created.userId
        setCreatedUserId(userId)
      }

      if (selectedSiteIds.length > 0) {
        try {
          await saveSiteAssignments(userId, selectedSiteIds)
        } catch {
          // 계정 생성은 이미 성공 — 배정 실패로 계정을 임의로 되돌리지 않고, 부분 성공을 그대로 안내
          setResult({
            message: '직원은 등록되었지만 담당 현장 배정에 실패했습니다. 담당 현장을 다시 선택한 뒤 등록 버튼을 눌러주세요.',
            partial: true,
          })
          return
        }
      }
      setResult({ message: '직원이 등록되었습니다.', name: form.name })
    } catch (error) {
      setErrorMessage(error.response?.data?.resultMessage ?? '등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleResultClose() {
    if (result?.partial) {
      setResult(null)
      return
    }
    setResult(null)
    onCreated?.()
    onClose()
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        취소
      </Button>
      <Button variant="primary" loading={submitting} onClick={handleSubmit}>
        {createdUserId ? '배정 다시 시도' : '등록'}
      </Button>
    </>
  )

  return (
    <>
      <BaseModal
        visible={visible && !result}
        onClose={onClose}
        title="직원 등록"
        className="modal-panel--wide"
        footer={footer}
      >
        <form onSubmit={handleSubmit} className="account-form__body">
          {errorMessage && (
            <div className="banner banner-danger" role="alert">
              {errorMessage}
            </div>
          )}

          {createdUserId && (
            <div className="banner banner-info" role="status">
              직원 계정은 이미 등록되었습니다. 담당 현장을 선택하고 등록 버튼을 눌러 배정을 다시 시도해주세요.
            </div>
          )}

          <fieldset className="account-form__group" disabled={Boolean(createdUserId)}>
            <legend className="account-form__legend">
              기본 정보
              <span className="account-form__legend-desc">
                <span className="field-required">*</span> 표시는 필수 항목입니다.
              </span>
            </legend>

            <div className="account-modal__row">
              <Input
                label="이름"
                requiredMark
                placeholder="예: 홍길동"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
              <Input
                label="연락처"
                requiredMark
                placeholder="010-0000-0000"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>

            <div className="account-form__email-row">
              <Input
                label="이메일"
                type="email"
                requiredMark
                placeholder="예: name@example.com"
                hint="로그인 아이디로 사용됩니다."
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={handleCheckEmail}>
                중복확인
              </Button>
            </div>
            {emailChecked && (
              <p className={`account-form__email-result ${emailAvailable ? 'is-ok' : 'is-taken'}`} role="status">
                {emailAvailable ? '사용 가능한 이메일입니다.' : '이미 사용 중인 이메일입니다.'}
              </p>
            )}

            <div className="account-modal__row">
              <Input
                label="비밀번호"
                type="password"
                autoComplete="new-password"
                requiredMark
                hint={PASSWORD_POLICY_MESSAGE}
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
              />
              <Input
                label="비밀번호 확인"
                type="password"
                autoComplete="new-password"
                requiredMark
                value={form.passwordConfirm}
                onChange={(e) => updateField('passwordConfirm', e.target.value)}
              />
            </div>

            <Select
              label="역할"
              requiredMark
              value={form.role}
              onChange={(e) => updateField('role', e.target.value)}
              options={creatableRoles.map((role) => ({ value: role, label: USER_ROLE_LABELS[role] ?? role }))}
            />
          </fieldset>

          <fieldset className="account-form__group">
            <legend className="account-form__legend">
              담당 현장
              <span className="account-form__legend-desc">
                여러 현장을 함께 담당할 수 있습니다. 선택한 현장의 화면만 이용할 수 있습니다.
              </span>
            </legend>

            <div className={`account-form__site-list ${sites.length === 1 ? 'is-single' : ''}`.trim()}>
              {sites.map((site) => (
                <span key={site.siteId} className="account-form__site-row">
                  <Checkbox
                    label={site.name}
                    checked={selectedSiteIds.includes(site.siteId)}
                    onChange={() => toggleSite(site.siteId)}
                  />
                  {site.siteId === currentSiteId && <span className="account-form__site-current">현재 현장</span>}
                </span>
              ))}
              {sites.length === 0 && <p className="u-text-muted">선택할 수 있는 현장이 없습니다.</p>}
            </div>
          </fieldset>
        </form>
      </BaseModal>

      <ActionResultModal
        visible={Boolean(result)}
        type={result?.partial ? 'warning' : 'success'}
        title={result?.partial ? '직원 등록' : '등록이 완료되었습니다.'}
        subtitle={result?.message}
        infoRows={
          result?.partial
            ? []
            : [
                { label: '처리 항목', value: result?.name },
                { label: '처리 시각', value: formatResultDateTime() },
                { label: '처리 내용', value: '직원 등록' },
                { label: '처리자', value: user?.name },
              ]
        }
        onClose={handleResultClose}
      />
    </>
  )
}
