import { useEffect, useState } from 'react'
import Button from '@/shared/components/buttons/Button'
import Input from '@/shared/components/forms/Input'
import BaseModal from '@/shared/components/modals/BaseModal'
import { MAX_CIRCUIT_COUNT, MIN_CIRCUIT_COUNT, M_NO_LENGTH } from '../constants/facilityConstants'
import { extractServerMessage, getEmptyPanelForm, panelFormToPayload, validatePanelForm } from '../utils/facilityFormatters'
import ThresholdFields from './ThresholdFields'

// 분전반 등록 모달 — 수정은 목록에서 행을 눌러 여는 PanelDetailModal이 담당한다.
export default function PanelFormModal({ visible, onClose, onSubmit }) {
  const [form, setForm] = useState(getEmptyPanelForm)
  const [errors, setErrors] = useState({})
  const [serverMessage, setServerMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(getEmptyPanelForm())
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrors({})
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServerMessage('')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubmitting(false)
  }, [visible])

  // 폼 값 변경
  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
    setServerMessage('')
  }

  // 분전반 등록
  async function handleSubmit() {
    const nextErrors = validatePanelForm(form)
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    setSubmitting(true)
    setServerMessage('')
    try {
      await onSubmit(panelFormToPayload(form))
      onClose()
    } catch (error) {
      setServerMessage(extractServerMessage(error, '분전반 등록에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BaseModal
      visible={visible}
      title="분전반 등록"
      onClose={onClose}
      className="facility-modal"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>
            등록
          </Button>
        </>
      }
    >
      {serverMessage && (
        <p className="banner banner-danger" role="alert">
          {serverMessage}
        </p>
      )}
      <div className="facility-form">
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
            placeholder={`예: 10001 (${M_NO_LENGTH}자리 필수)`}
            maxLength={M_NO_LENGTH}
            value={form.mNo}
            error={errors.mNo}
            onChange={(event) => updateField('mNo', event.target.value)}
          />
          <Input
            label="회로 개수"
            requiredMark
            type="number"
            min={MIN_CIRCUIT_COUNT}
            max={MAX_CIRCUIT_COUNT}
            placeholder={`최대 ${MAX_CIRCUIT_COUNT}개`}
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
    </BaseModal>
  )
}
