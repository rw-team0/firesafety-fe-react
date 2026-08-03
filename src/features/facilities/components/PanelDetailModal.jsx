import { useEffect, useState } from 'react'
import { getPanelDetail, updatePanel } from '../api/facilityApi'
import {
  extractServerMessage,
  formatDateTimeCell,
  formatOnline,
  formatPanelStatus,
  formatValue,
  getEmptyPanelForm,
  panelFormToPayload,
  panelToForm,
  THRESHOLD_FIELDS,
  validatePanelForm,
} from '../utils/facilityFormatters'
import ThresholdFields from './ThresholdFields'
import { useAuth } from '@/features/auth/useAuth'
import Button from '@/shared/components/buttons/Button'
import Input from '@/shared/components/forms/Input'
import BaseModal from '@/shared/components/modals/BaseModal'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import LoadingState from '@/shared/components/feedback/LoadingState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import { formatResultDateTime } from '@/shared/utils/formatters'

// 상세 항목 렌더링 — 박스 카드가 아니라 accounts AccountDetailModal과 동일한 라벨/값 텍스트 그리드
function DetailItem({ label, value }) {
  return (
    <div>
      <span className="facility-modal__grid-label">{label}</span>
      <p className="facility-modal__grid-value">{value ?? '-'}</p>
    </div>
  )
}

// 설비관리 목록에서 행을 누르면 뜨는 모달 — 조회/수정 두 모드를 겸한다(accounts AccountDetailModal과 동일 패턴)
export default function PanelDetailModal({ visible, panelId, canManage, onClose, onUpdated }) {
  const { user } = useAuth()
  const [mode, setMode] = useState('view')
  const [panel, setPanel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(getEmptyPanelForm)
  const [errors, setErrors] = useState({})
  const [serverMessage, setServerMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const data = await getPanelDetail(panelId)
      setPanel(data)
      setForm(panelToForm(data))
    } catch (error) {
      setLoadError(extractServerMessage(error, '분전반 정보를 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!visible || !panelId) return
    // 모달을 열 때마다 조회 모드로 시작 + 최신 정보를 다시 불러온다
    setMode('view')
    setErrors({})
    setServerMessage('')
    setResult(null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [visible, panelId])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
    setServerMessage('')
  }

  function startEdit() {
    setServerMessage('')
    setMode('edit')
  }

  function cancelEdit() {
    setForm(panelToForm(panel))
    setErrors({})
    setServerMessage('')
    setMode('view')
  }

  // 분전반 수정
  async function handleSubmit() {
    const nextErrors = validatePanelForm(form)
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    setSubmitting(true)
    setServerMessage('')
    try {
      await updatePanel(panelId, panelFormToPayload(form))
      setResult({ name: form.name })
    } catch (error) {
      setServerMessage(extractServerMessage(error, '분전반 수정에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleResultClose() {
    setResult(null)
    setMode('view')
    load()
    onUpdated?.()
  }

  const thresholdRows = panel ? THRESHOLD_FIELDS.map((field) => ({ ...field, value: panel[field.key] })) : []

  const footer =
    loading || loadError
      ? undefined
      : mode === 'view' ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              닫기
            </Button>
            {canManage && (
              <Button variant="primary" onClick={startEdit}>
                수정
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={cancelEdit}>
              취소
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleSubmit}>
              저장
            </Button>
          </>
        )

  return (
    <>
      <BaseModal
        visible={visible && !result}
        onClose={onClose}
        title={mode === 'edit' ? '분전반 수정' : '분전반 상세'}
        className="facility-modal"
        footer={footer}
      >
        {loading && <LoadingState label="분전반 정보를 불러오는 중입니다..." />}
        {!loading && loadError && <ErrorState message={loadError} onRetry={load} />}

        {!loading && !loadError && panel && (
          <>
            <div className="facility-modal__eyebrow">#{panelId}</div>
            <div className="facility-modal__heading">
              <h3>{panel.name}</h3>
              <StatusBadge status={panel.status} label={formatPanelStatus(panel.status)} />
            </div>
          </>
        )}

        {!loading && !loadError && panel && mode === 'view' && (
          <div className="facility-modal__body">
            <h4 className="facility-modal__section-title">기본 정보</h4>
            <div className="facility-modal__grid">
              <DetailItem label="장비번호" value={panel.deviceSerial} />
              <DetailItem label="분전반No" value={panel.mNo} />
              <DetailItem label="통신 상태" value={formatOnline(panel.isOnline)} />
              <DetailItem label="최근 통신 시각" value={formatDateTimeCell(panel.lastCommunicatedAt)} />
              <DetailItem label="설치일" value={panel.installedAt || '-'} />
              <DetailItem label="회로 개수" value={panel.circuitCount} />
            </div>

            <h4 className="facility-modal__section-title">주의 임계값</h4>
            <div className="facility-modal__grid">
              {thresholdRows.map((field) => (
                <DetailItem key={field.key} label={field.label} value={formatValue(field.value, field.unit)} />
              ))}
            </div>
          </div>
        )}

        {!loading && !loadError && mode === 'edit' && (
          <div className="facility-form">
            {serverMessage && <p className="banner banner-danger">{serverMessage}</p>}
            <p className="facility-form__legend-desc">
              <span className="field-required">*</span> 표시는 필수 항목입니다.
            </p>
            <Input
              label="분전반명"
              requiredMark
              placeholder="예: 1층 분전반"
              value={form.name}
              error={errors.name}
              onChange={(event) => updateField('name', event.target.value)}
            />
            <Input
              label="장비번호"
              requiredMark
              placeholder="예: SN-2025-0001"
              value={form.deviceSerial}
              error={errors.deviceSerial}
              onChange={(event) => updateField('deviceSerial', event.target.value)}
            />
            <div className="facility-form__split">
              <Input
                label="분전반No"
                requiredMark
                placeholder="예: 10001 (5자리 필수)"
                maxLength={5}
                value={form.mNo}
                error={errors.mNo}
                onChange={(event) => updateField('mNo', event.target.value)}
              />
              <Input
                label="회로 개수"
                requiredMark
                type="number"
                min="1"
                max="10"
                placeholder="최대 10개"
                value={form.circuitCount}
                error={errors.circuitCount}
                onChange={(event) => updateField('circuitCount', event.target.value)}
              />
            </div>
            <Input
              label="설치일"
              type="date"
              value={form.installedAt}
              onChange={(event) => updateField('installedAt', event.target.value)}
            />
            <div>
              <p className="facility-form__section-title">주의 임계값 설정</p>
              <ThresholdFields form={form} errors={errors} onChange={updateField} />
            </div>
          </div>
        )}
      </BaseModal>

      <ActionResultModal
        visible={Boolean(result)}
        type="success"
        title="수정이 완료되었습니다."
        subtitle="변경사항이 저장되었습니다."
        desc="수정된 내용은 즉시 반영됩니다."
        infoRows={[
          { label: '수정 항목', value: result?.name },
          { label: '수정 시각', value: formatResultDateTime() },
          { label: '수정자', value: user?.name },
        ]}
        onClose={handleResultClose}
      />
    </>
  )
}
