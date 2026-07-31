import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getSiteAssignments, getSites, getUsers, saveSiteAssignments, updateUser } from '../api/accountApi'
import { canEditTarget, getUpdatableRoles } from '../utils/rolePolicy'
import { useAuth } from '@/features/auth/useAuth'
import Button from '@/shared/components/buttons/Button'
import Checkbox from '@/shared/components/forms/Checkbox'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import LoadingState from '@/shared/components/feedback/LoadingState'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './AccountEditPage.css'

// SCR-406 계정 수정 — 담당현장은 체크박스 다중선택(AUTH-019, Vue의 단일 select 규제 안 따름)
// 상세조회 API가 없어(백엔드 확인됨) 목록 전체를 받아 대상 하나를 찾는다(Vue와 동일 방식)
export default function AccountEditPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { role: actorRole } = useAuth()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [targetRole, setTargetRole] = useState(null)
  const [sites, setSites] = useState([])
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '' })
  const [selectedSiteIds, setSelectedSiteIds] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    async function load() {
      const [users, siteList, assignments] = await Promise.all([
        getUsers(),
        getSites(),
        getSiteAssignments(userId),
      ])
      const target = users.find((u) => String(u.userId) === String(userId))
      if (!target) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setTargetRole(target.role)
      setForm({ name: target.name, email: target.email, phone: target.phone ?? '', role: target.role })
      setSites(siteList)
      setSelectedSiteIds(assignments.map((a) => a.siteId))
      setLoading(false)
    }
    load()
  }, [userId])

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
        setResult({ message: '계정 정보는 수정되었지만 담당현장 배정 저장에 실패했습니다. 다시 시도해주세요.' })
        return
      }
      setResult({ message: '계정 정보가 수정되었습니다.' })
    } catch (error) {
      setErrorMessage(error.response?.data?.resultMessage ?? '수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState />
  if (notFound) return <div className="banner banner-danger">계정을 찾을 수 없습니다.</div>

  return (
    <div className="account-edit card">
      {!editable && (
        <div className="banner banner-danger">
          이 계정은 {USER_ROLE_LABELS.SUPER_ADMIN}만 수정할 수 있습니다.
        </div>
      )}

      <form onSubmit={handleSubmit} className="account-edit__form">
        {errorMessage && <div className="banner banner-danger">{errorMessage}</div>}

        <fieldset disabled={!editable || submitting} className="account-edit__fieldset">
          <Input label="이름" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
          <Input
            label="이메일"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
          <Input label="연락처" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />

          <Select
            label="권한"
            value={form.role}
            onChange={(e) => updateField('role', e.target.value)}
            options={updatableRoles.map((role) => ({ value: role, label: USER_ROLE_LABELS[role] ?? role }))}
          />

          <div className="field">
            <span className="field-label">담당현장</span>
            <div className="account-edit__site-list">
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
        </fieldset>

        <div className="account-edit__actions">
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
        type="success"
        title="계정 수정"
        subtitle={result?.message}
        onClose={() => navigate(ROUTE_PATHS.settingsAccounts)}
      />
    </div>
  )
}
