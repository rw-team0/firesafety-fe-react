import { useEffect, useState } from 'react'
import { getSiteAssignments, getUserAuditLogs, saveSiteAssignments, updateUser } from '../api/accountApi'
import { canEditTarget, getUpdatableRoles } from '../utils/rolePolicy'
import { summarizeLog } from '../utils/auditLog'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import { ROLES } from '@/shared/constants/roles'
import Button from '@/shared/components/buttons/Button'
import Checkbox from '@/shared/components/forms/Checkbox'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import BaseModal from '@/shared/components/modals/BaseModal'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import LoadingState from '@/shared/components/feedback/LoadingState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { formatResultDateTime } from '@/shared/utils/formatters'
import '../pages/accountFormShell.css'
import './AccountModal.css'

// SCR-406 직원 상세/수정 — 목록에서 행을 누르면 뜨는 모달 하나가 조회/수정 두 모드를 겸한다(사진 참고 패턴)
export default function AccountDetailModal({ visible, user: targetUser, onClose, onChanged }) {
  const { user: actor, role: actorRole } = useAuth()
  const { sites, currentSiteId } = useSite()

  const [mode, setMode] = useState('view')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedSiteIds, setSelectedSiteIds] = useState([])
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '' })
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const userId = targetUser?.userId
  // GET /users/audit-logs는 백엔드가 SUPER_ADMIN 전용으로 막아둠(관리이력 페이지와 동일 기준) — 그 외 역할은 호출 자체를 안 함
  const canViewHistory = actorRole === ROLES.SUPER_ADMIN

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const [assignments, auditLogs] = await Promise.all([
        getSiteAssignments(userId),
        canViewHistory ? getUserAuditLogs() : Promise.resolve([]),
      ])
      setSelectedSiteIds(assignments.map((a) => a.siteId))
      const targetLogs = auditLogs.filter((log) => String(log.targetUserId) === String(userId))
      // "수정: 변경사항 없음"은 실질적으로 보여줄 내용이 없어 목록에서 제외
      setLogs(targetLogs.filter((log) => !(log.action === 'UPDATE' && summarizeLog(log) === '변경사항 없음')))
    } catch {
      setLoadError('직원 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!visible || !userId) return
    // 모달을 열 때마다 조회 모드로 시작 + 최신 배정/이력을 다시 불러온다
    setMode('view')
    setErrorMessage('')
    setResult(null)
    setForm({
      name: targetUser.name ?? '',
      email: targetUser.email ?? '',
      phone: targetUser.phone ?? '',
      role: targetUser.role ?? '',
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [visible, userId])

  const editable = targetUser ? canEditTarget(actorRole, targetUser.role) : false
  const updatableRoles = targetUser ? getUpdatableRoles(actorRole, targetUser.role) : []

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleSite(siteId) {
    setSelectedSiteIds((prev) => (prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]))
  }

  function startEdit() {
    setErrorMessage('')
    setMode('edit')
  }

  function cancelEdit() {
    // 입력값을 원래 값으로 되돌리고 조회 모드로 복귀
    setForm({
      name: targetUser.name ?? '',
      email: targetUser.email ?? '',
      phone: targetUser.phone ?? '',
      role: targetUser.role ?? '',
    })
    setErrorMessage('')
    setMode('view')
  }

  // 저장 전 항상 한 번 확인받는다(삭제/복구뿐 아니라 모든 변경에 통일된 흐름)
  function handleSubmit(event) {
    event.preventDefault()
    if (!editable) return
    setErrorMessage('')

    if (!form.name || !form.email || !form.phone || !form.role) {
      setErrorMessage('필수 항목을 모두 입력해주세요.')
      return
    }

    setConfirmOpen(true)
  }

  async function handleConfirmSubmit() {
    setConfirmOpen(false)
    setSubmitting(true)
    try {
      await updateUser(userId, { name: form.name, email: form.email, phone: form.phone, role: form.role })
      try {
        await saveSiteAssignments(userId, selectedSiteIds)
      } catch {
        // updateUser는 PUT이라 재제출해도 부작용 없음 — 모달은 그대로 두고 저장 버튼으로 재시도하게 함
        setResult({ message: '직원 정보는 수정되었지만 담당 현장 배정 저장에 실패했습니다. 다시 시도해주세요.', partial: true })
        return
      }
      setResult({ message: '직원 정보가 수정되었습니다.', name: form.name })
    } catch (error) {
      setErrorMessage(error.response?.data?.resultMessage ?? '수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleResultClose() {
    const wasPartial = result?.partial
    setResult(null)
    if (wasPartial) return
    onChanged?.()
    setMode('view')
    load()
  }

  if (!targetUser) return null

  const assignedSiteNames = sites.filter((site) => selectedSiteIds.includes(site.siteId)).map((site) => site.name)

  const footer =
    mode === 'view' ? (
      <>
        <Button variant="secondary" onClick={onClose}>
          닫기
        </Button>
        {editable && (
          <Button variant="primary" onClick={startEdit}>
            수정
          </Button>
        )}
      </>
    ) : (
      <>
        <Button variant="secondary" onClick={cancelEdit}>
          닫기
        </Button>
        <Button variant="primary" loading={submitting} onClick={handleSubmit}>
          수정 완료
        </Button>
      </>
    )

  return (
    <>
      <BaseModal
        visible={visible && !result}
        onClose={onClose}
        title={mode === 'edit' ? '직원 정보 수정' : '직원 상세 정보'}
        className="modal-panel--wide"
        footer={!loading && !loadError ? footer : undefined}
      >
        <div className="account-modal__eyebrow">#{userId}</div>
        <div className="account-modal__heading">
          <h3>{targetUser.name}</h3>
          <span className="badge">{USER_ROLE_LABELS[targetUser.role] ?? targetUser.role}</span>
        </div>

        {loading && <LoadingState />}
        {!loading && loadError && <ErrorState message={loadError} onRetry={load} />}

        {!loading && !loadError && mode === 'view' && (
          <div className="account-modal__body">
            <h4 className="account-modal__section-title">기본 정보</h4>
            <div className="account-modal__grid">
              <div>
                <span className="account-modal__grid-label">이메일</span>
                <p className="account-modal__grid-value">{targetUser.email}</p>
              </div>
              <div>
                <span className="account-modal__grid-label">연락처</span>
                <p className="account-modal__grid-value">{targetUser.phone || '-'}</p>
              </div>
              <div>
                <span className="account-modal__grid-label">가입일</span>
                <p className="account-modal__grid-value">{targetUser.createdAt?.slice(0, 10) ?? '-'}</p>
              </div>
              <div>
                <span className="account-modal__grid-label">담당 현장</span>
                <p className="account-modal__grid-value">
                  {assignedSiteNames.length > 0 ? assignedSiteNames.join(', ') : '배정된 현장 없음'}
                </p>
              </div>
            </div>

            {canViewHistory && (
              <>
                <h4 className="account-modal__section-title">처리 이력</h4>
                {logs.length === 0 && <p className="u-text-muted">처리 이력이 없습니다.</p>}
                {logs.length > 0 && (
                  <ul className="account-modal__history">
                    {logs.map((log) => (
                      <li key={log.auditId} className="account-modal__history-row">
                        <span className="account-modal__history-date">{log.createdAt?.slice(0, 10)}</span>
                        <span>
                          {log.actionLabel}
                          {log.action === 'UPDATE' ? `: ${summarizeLog(log)}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {!loading && !loadError && mode === 'edit' && (
          <form onSubmit={handleSubmit} className="account-form__body">
            {!editable && <div className="banner banner-info">이 직원의 정보는 조회만 가능하고 수정할 수 없습니다.</div>}
            {errorMessage && (
              <div className="banner banner-danger" role="alert">
                {errorMessage}
              </div>
            )}

            <fieldset disabled={!editable || submitting} className="account-form__group">
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

              {/* 로그인 아이디를 겸해서 실수로 바꾸면 본인도 모르게 로그인이 막힐 수 있어 SUPER_ADMIN만 수정 가능 */}
              <Input
                label="이메일"
                type="email"
                requiredMark
                disabled={actorRole !== ROLES.SUPER_ADMIN}
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
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
          </form>
        )}
      </BaseModal>

      <ConfirmModal
        visible={confirmOpen}
        title="직원 정보 수정"
        message="입력한 내용으로 직원 정보를 수정하시겠습니까?"
        confirmLabel="수정"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setConfirmOpen(false)}
      >
        <div className="confirm-modal__summary confirm-modal__summary--neutral">
          <span className="confirm-modal__summary-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="confirm-modal__summary-body">
            <p className="confirm-modal__summary-row">
              <span className="confirm-modal__summary-label">대상</span>
              <span className="confirm-modal__summary-value">{form.name}</span>
              <span className="confirm-modal__summary-badge">수정</span>
            </p>
            <p className="confirm-modal__summary-detail">담당 현장 배정도 체크한 내용으로 함께 교체됩니다.</p>
          </div>
        </div>
      </ConfirmModal>

      <ActionResultModal
        visible={Boolean(result)}
        type={result?.partial ? 'warning' : 'success'}
        title={result?.partial ? '직원 수정' : '수정이 완료되었습니다.'}
        subtitle={result?.message}
        infoRows={
          result?.partial
            ? []
            : [
                { label: '처리 항목', value: result?.name },
                { label: '처리 시각', value: formatResultDateTime() },
                { label: '처리 내용', value: '직원 정보 수정' },
                { label: '처리자', value: actor?.name },
              ]
        }
        onClose={handleResultClose}
      />
    </>
  )
}
