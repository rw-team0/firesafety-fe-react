import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getSite, updateSite } from '../api/siteApi'
import { useSite } from '../useSite'
import { canManageSites } from '../utils/sitePolicy'
import { useAuth } from '@/features/auth/useAuth'
import Button from '@/shared/components/buttons/Button'
import Input from '@/shared/components/forms/Input'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './sitePageShell.css'

// 현장 정보 수정. 최초 관리자 계정은 수정 대상 아님(백엔드 SiteUpdateReq에 name/address/zipCode만 있음)
export default function SiteEditPage() {
  const navigate = useNavigate()
  const { siteId } = useParams()
  const { role } = useAuth()
  const { currentSite, refreshSites, selectSite } = useSite()

  const [form, setForm] = useState({ name: '', address: '', zipCode: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const site = await getSite(siteId)
      setForm({ name: site.name ?? '', address: site.address ?? '', zipCode: site.zipCode ?? '' })
    } catch (error) {
      setLoadError(error?.response?.data?.resultMessage ?? '현장 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => {
    // 진입 시 1회 상세 조회 — load()는 재시도 버튼에서도 재사용
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  if (!canManageSites(role)) return <Navigate to={ROUTE_PATHS.siteSelect} replace />

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev))
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = '현장명을 입력해주세요.'
    if (!form.address.trim()) next.address = '주소를 입력해주세요.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const updated = await updateSite(siteId, {
        name: form.name.trim(),
        address: form.address.trim(),
        zipCode: form.zipCode.trim() || null,
      })
      await refreshSites().catch(() => {})
      // 헤더에 표시 중인 현장이면 이름이 바로 반영되도록 세션 값도 갱신
      if (currentSite && String(currentSite.siteId) === String(siteId)) selectSite(updated)
      setSuccessMessage(`${updated?.name ?? form.name} 현장 정보가 수정되었습니다.`)
    } catch (error) {
      setSubmitError(error?.response?.data?.resultMessage ?? '현장 수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="site-shell">
      <div className="site-shell__inner site-form">
        <div className="site-shell__head">
          <div>
            <h1 className="site-shell__title">현장 수정</h1>
            <p className="site-shell__subtitle">현장 정보만 수정합니다. 관리자 계정은 계정 관리에서 변경합니다.</p>
          </div>
        </div>

        {loading && <LoadingState />}
        {!loading && loadError && (
          <div className="u-flex-col u-gap-12">
            <ErrorState message={loadError} onRetry={load} />
            <div>
              <Button variant="secondary" onClick={() => navigate(ROUTE_PATHS.siteSelect)}>
                목록으로
              </Button>
            </div>
          </div>
        )}

        {!loading && !loadError && (
          <form className="site-form__body card" onSubmit={handleSubmit}>
            {submitError && <div className="banner banner-danger">{submitError}</div>}

            <fieldset className="site-form__group">
              <legend className="site-form__legend">현장 정보</legend>
              <Input
                label="현장명"
                value={form.name}
                error={errors.name}
                onChange={(event) => updateField('name', event.target.value)}
              />
              <Input
                label="주소"
                value={form.address}
                error={errors.address}
                onChange={(event) => updateField('address', event.target.value)}
              />
              <Input
                label="우편번호 (선택)"
                value={form.zipCode}
                onChange={(event) => updateField('zipCode', event.target.value)}
              />
            </fieldset>

            <div className="site-form__actions">
              <Button type="button" variant="secondary" onClick={() => navigate(ROUTE_PATHS.siteSelect)}>
                취소
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                저장
              </Button>
            </div>
          </form>
        )}
      </div>

      <ActionResultModal
        visible={Boolean(successMessage)}
        type="success"
        title="현장 수정"
        subtitle={successMessage}
        onClose={() => navigate(ROUTE_PATHS.siteSelect, { replace: true })}
      />
    </div>
  )
}
