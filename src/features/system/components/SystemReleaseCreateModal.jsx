import { useEffect, useState } from 'react'
import { createSystemRelease } from '../api/systemApi'
import Button from '@/shared/components/buttons/Button'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import Textarea from '@/shared/components/forms/Textarea'
import BaseModal from '@/shared/components/modals/BaseModal'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { isoDate, formatResultDateTime } from '@/shared/utils/formatters'
import './SystemReleaseCreateModal.css'

const TYPE_OPTIONS = [
  { value: 'SOFTWARE', label: '소프트웨어' },
  { value: 'MODEL', label: 'AI 모델' },
]

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/

const INITIAL_FORM = { type: 'SOFTWARE', version: '', description: '', updatedBy: '', releasedAt: '' }

function extractServerMessage(error, fallback) {
  return error?.response?.data?.resultMessage ?? fallback
}

// SW 버전 정보 화면의 업데이트 이력 등록 — SUPER_ADMIN 전용
export default function SystemReleaseCreateModal({ visible, onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ ...INITIAL_FORM, releasedAt: isoDate(new Date()) })
    setErrorMessage('')
    setResult(null)
  }, [visible])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    if (!form.version || !form.updatedBy) {
      setErrorMessage('버전과 업데이트한 사람 이름은 필수입니다.')
      return
    }
    if (form.type === 'SOFTWARE' && !SEMVER_PATTERN.test(form.version)) {
      setErrorMessage('소프트웨어 버전은 유의적 버전(예: 1.2.0) 형식이어야 합니다.')
      return
    }
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    setConfirmOpen(false)
    setSubmitting(true)
    try {
      await createSystemRelease({
        type: form.type,
        version: form.version,
        description: form.description || undefined,
        updatedBy: form.updatedBy,
        releasedAt: form.releasedAt || undefined,
      })
      setResult({ version: form.version, typeLabel: TYPE_OPTIONS.find((o) => o.value === form.type)?.label })
    } catch (error) {
      setErrorMessage(extractServerMessage(error, '업데이트 이력 등록에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleResultClose() {
    setResult(null)
    onClose()
    onCreated()
  }

  const typeLabel = TYPE_OPTIONS.find((o) => o.value === form.type)?.label

  return (
    <>
      <BaseModal
        visible={visible && !confirmOpen && !result}
        onClose={onClose}
        title="업데이트 이력 등록"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              등록
            </Button>
          </>
        }
      >
        <form className="system-release-form" onSubmit={handleSubmit}>
          <Select
            label="구분"
            value={form.type}
            onChange={(e) => updateField('type', e.target.value)}
            options={TYPE_OPTIONS}
          />
          <Input
            label="버전"
            placeholder={form.type === 'SOFTWARE' ? '1.2.0' : '예: 2.3.1'}
            hint={form.type === 'SOFTWARE' ? '유의적 버전(Major.Minor.Patch) 형식' : undefined}
            value={form.version}
            onChange={(e) => updateField('version', e.target.value)}
            requiredMark
          />
          <Input
            label="등록일"
            type="date"
            value={form.releasedAt}
            onChange={(e) => updateField('releasedAt', e.target.value)}
          />
          <Input
            label="업데이트한 사람 이름"
            value={form.updatedBy}
            onChange={(e) => updateField('updatedBy', e.target.value)}
            requiredMark
          />
          <Textarea
            label="변경 내용"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
          />
          {errorMessage && <p className="field-error">{errorMessage}</p>}
        </form>
      </BaseModal>

      <ConfirmModal
        visible={confirmOpen}
        title="업데이트 이력 등록"
        message="이 내용으로 이력을 등록하시겠습니까?"
        confirmLabel={submitting ? '등록 중...' : '등록'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      >
        <div className="confirm-modal__summary confirm-modal__summary--neutral">
          <span className="confirm-modal__summary-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <div className="confirm-modal__summary-body">
            <p className="confirm-modal__summary-row">
              <span className="confirm-modal__summary-label">버전</span>
              <span className="confirm-modal__summary-value">{form.version}</span>
              <span className="confirm-modal__summary-badge">{typeLabel}</span>
            </p>
            <p className="confirm-modal__summary-detail">등록자: {form.updatedBy}</p>
          </div>
        </div>
      </ConfirmModal>

      <ActionResultModal
        visible={Boolean(result)}
        type="success"
        title="등록이 완료되었습니다."
        subtitle="업데이트 이력이 등록되었습니다."
        infoRows={[
          { label: '버전', value: result?.version },
          { label: '구분', value: result?.typeLabel },
          { label: '등록 시각', value: formatResultDateTime() },
        ]}
        onClose={handleResultClose}
      />
    </>
  )
}
