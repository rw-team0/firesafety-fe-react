import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getManagedUsers, getSiteAssignments, saveSiteAssignments, updateUser } from '../api/accountApi'
import { canEditTarget, getUpdatableRoles } from '../utils/rolePolicy'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import Button from '@/shared/components/buttons/Button'
import Checkbox from '@/shared/components/forms/Checkbox'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './accountFormShell.css'

// SCR-406 직원 수정 — 상세조회 API가 없어 현재 현장 managed-users 목록에서 대상 하나를 찾는다.
export default function AccountEditPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { role: actorRole } = useAuth()
  const { sites, currentSiteId } = useSite()
  const requestSeqRef = useRef(0)

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [targetRole, setTargetRole] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '' })
  const [selectedSiteIds, setSelectedSiteIds] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const load = useCallback(async () => {
    const siteId = currentSiteId
    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq

    setLoading(true)
    setNotFound(false)
    setLoadError('')
    setTargetRole(null)
    setForm({ name: '', email: '', phone: '', role: '' })
    setSelectedSiteIds([])

    if (!siteId) {
      setLoadError('직원 수정은 현장 선택 후 이용할 수 있습니다.')
      setLoading(false)
      return
    }

    try {
      const users = await getManagedUsers(siteId)
      if (requestSeqRef.current !== seq) return

      const target = users.find((u) => String(u.userId) === String(userId))
      if (!target) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const assignments = await getSiteAssignments(userId)
      if (requestSeqRef.current !== seq) return

      setTargetRole(target.role)
      setForm({ name: target.name, email: target.email, phone: target.phone ?? '', role: target.role })
      setSelectedSiteIds(assignments.map((a) => a.siteId))
    } catch (error) {
      if (requestSeqRef.current !== seq) return
      const status = error?.response?.status
      setLoadError(status === 403 ? '이 직원을 수정할 권한이 없습니다.' : '직원 정보를 불러오지 못했습니다.')
    } finally {
      if (requestSeqRef.current === seq) setLoading(false)
    }
  }, [currentSiteId, userId])

  useEffect(() => {
    // 현장 변경 중 이전 현장의 수정 대상이 남지 않게 다시 조회한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return () => {
      requestSeqRef.current += 1
    }
  }, [load])

  const editable = targetRole ? canEditTarget(actorRole, targetRole) : false
  const updatableRoles = targetRole ? getUpdatableRoles(actorRole, targetRole) : []

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleSite(siteId) {
    setSelectedSiteIds((prev) => (prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!editable) return
    setErrorMessage('')

    if (!form.name || !form.email || !form.phone || !form.role) {
      setErrorMessage('필수 항목을 모두 입력해주세요.')
      return
    }

    setSubmitting(true)
    try {
      await updateUser(userId, { name: form.name, email: form.email, phone: form.phone, role: form.role })
      try {
        await saveSiteAssignments(userId, selectedSiteIds)
      } catch {
        // updateUser는 PUT이라 재제출해도 부작용 없음 — 화면은 그대로 두고 저장 버튼으로 재시도하게 함
        setResult({ message: '직원 정보는 수정되었지만 담당 현장 배정 저장에 실패했습니다. 다시 시도해주세요.', partial: true })
        return
      }
      setResult({ message: '직원 정보가 수정되었습니다.' })
    } catch (error) {
      setErrorMessage(error.response?.data?.resultMessage ?? '수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState />
  if (loadError) return <ErrorState message={loadError} onRetry={load} />
  if (notFound) return <div className="banner banner-info">현재 현장에서 수정할 수 있는 직원을 찾을 수 없습니다.</div>

  return (
    <div className="account-form card">
      {form.name && (
        <p className="account-form__target">
          수정 중인 직원 <strong>{form.name}</strong>
        </p>
      )}

      {/* 오류가 아니라 권한상 잠긴 상태 — 경고색 대신 안내 톤 */}
      {!editable && (
        <div className="banner banner-info">이 직원의 정보는 조회만 가능하고 수정할 수 없습니다.</div>
      )}

      <form onSubmit={handleSubmit} className="account-form__body">
        {/* 서버 응답/폼 전체 검증 실패 — 필드별 인라인 표시와 구분되게 상단 배너로 */}
        {errorMessage && (
          <div className="banner banner-danger" role="alert">
            {errorMessage}
          </div>
        )}

        <fieldset disabled={!editable || submitting} className="account-form__group">
          <legend className="account-form__legend">
            기본 정보
            <span className="account-form__legend-desc">
              <span className="field-required">*</span> 표시는 필수 항목입니다. 비밀번호는 본인만 재설정할 수 있습니다.
            </span>
          </legend>

          <Input
            label="이름"
            requiredMark
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
          />
          <Input
            label="이메일"
            type="email"
            requiredMark
            hint="로그인 아이디로 사용됩니다."
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
          <Input
            label="연락처"
            requiredMark
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />

          <Select
            label="역할"
            requiredMark
            value={form.role}
            onChange={(e) => updateField('role', e.target.value)}
            options={updatableRoles.map((role) => ({ value: role, label: USER_ROLE_LABELS[role] ?? role }))}
          />
        </fieldset>

        <fieldset disabled={!editable || submitting} className="account-form__group">
          <legend className="account-form__legend">
            담당 현장
            <span className="account-form__legend-desc">
              체크된 현장 전체로 배정이 교체됩니다. 체크를 해제하면 그 현장 배정이 사라집니다.
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

        <div className="account-form__actions">
          <Button type="button" variant="secondary" onClick={() => navigate(ROUTE_PATHS.settingsAccounts)}>
            취소
          </Button>
          {editable && (
            <Button type="submit" variant="primary" loading={submitting}>
              저장
            </Button>
          )}
        </div>
      </form>

      <ActionResultModal
        visible={Boolean(result)}
        type={result?.partial ? 'warning' : 'success'}
        title="직원 수정"
        subtitle={result?.message}
        // 부분 성공은 목록 이동을 자동으로 시키지 않음 — 화면에 남아 저장을 다시 시도하거나 취소 버튼으로 직접 나가야 함
        onClose={() => (result?.partial ? setResult(null) : navigate(ROUTE_PATHS.settingsAccounts))}
      />
    </div>
  )
}
