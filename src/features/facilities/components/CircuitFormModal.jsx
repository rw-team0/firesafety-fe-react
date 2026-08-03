import { useEffect, useState } from 'react'
import Button from '@/shared/components/buttons/Button'
import Input from '@/shared/components/forms/Input'
import BaseModal from '@/shared/components/modals/BaseModal'
import { extractServerMessage } from '../utils/facilityFormatters'

// 회로 등록 모달
export default function CircuitFormModal({ visible, channelNo, panelName, onClose, onSubmit }) {
  const [loadType, setLoadType] = useState('')
  const [error, setError] = useState('')
  const [serverMessage, setServerMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadType('')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError('')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServerMessage('')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubmitting(false)
  }, [visible, channelNo])

  // 회로 등록
  async function handleSubmit() {
    if (loadType.trim().length > 50) {
      setError('부하 종류는 50자 이하로 입력해주세요.')
      return
    }
    setSubmitting(true)
    setServerMessage('')
    try {
      await onSubmit({ channelNo, loadType: loadType.trim() || null })
      onClose()
    } catch (error) {
      setServerMessage(extractServerMessage(error, '회로 등록에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BaseModal
      visible={visible}
      title="회로 등록"
      onClose={onClose}
      className="facility-modal facility-modal--small"
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
      {serverMessage && <p className="banner banner-danger">{serverMessage}</p>}
      <div className="facility-form">
        <p className="facility-muted">
          {panelName || '선택 분전반'}의 {channelNo}번 채널에 회로를 등록합니다.
        </p>
        <Input
          label="부하 종류"
          placeholder="예: 조명"
          value={loadType}
          maxLength={50}
          error={error}
          onChange={(event) => {
            setLoadType(event.target.value)
            setError('')
            setServerMessage('')
          }}
        />
      </div>
    </BaseModal>
  )
}
