import { useEffect, useState } from 'react'
import Input from '@/shared/components/forms/Input'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { extractServerMessage } from '../utils/facilityFormatters'

// 회로 등록/연결 기기 수정 확인 모달 — 채널 번호는 등록 시(또는 자동생성 시) 이미 정해지고
// 연결 기기(loadType)만 나중에 고칠 수 있어 등록/수정 둘 다 같은 확인 모달 형식으로 통일한다.
export default function CircuitFormModal({ visible, mode = 'create', channelNo, circuit, panelName, onClose, onSubmit }) {
  const targetChannel = mode === 'edit' ? circuit?.channelNo : channelNo
  const [loadType, setLoadType] = useState('')
  const [error, setError] = useState('')
  const [serverMessage, setServerMessage] = useState('')

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadType(mode === 'edit' ? (circuit?.loadType ?? '') : '')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError('')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServerMessage('')
  }, [visible, mode, circuit])

  // 회로 등록 또는 연결 기기 수정
  async function handleConfirm() {
    if (loadType.trim().length > 50) {
      setError('연결 기기는 50자 이하로 입력해주세요.')
      return
    }
    setServerMessage('')
    try {
      if (mode === 'edit') {
        await onSubmit({ loadType: loadType.trim() || null })
      } else {
        await onSubmit({ channelNo, loadType: loadType.trim() || null })
      }
      onClose()
    } catch (error) {
      setServerMessage(
        extractServerMessage(error, mode === 'edit' ? '연결 기기 수정에 실패했습니다.' : '회로 등록에 실패했습니다.'),
      )
    }
  }

  const title = mode === 'edit' ? '연결 기기 수정' : '회로 등록'
  const message =
    mode === 'edit'
      ? `${panelName || '선택 분전반'}의 ${targetChannel ?? ''}번 채널 연결 기기를 수정하시겠습니까?`
      : `${panelName || '선택 분전반'}의 ${targetChannel ?? ''}번 채널에 회로를 등록하시겠습니까?`

  return (
    <ConfirmModal
      visible={visible}
      title={title}
      message={message}
      confirmLabel={mode === 'edit' ? '수정' : '등록'}
      onCancel={onClose}
      onConfirm={handleConfirm}
    >
      {serverMessage && <p className="banner banner-danger">{serverMessage}</p>}
      <Input
        label="연결 기기"
        placeholder="예: 조명 (참고용, 선택 입력)"
        value={loadType}
        maxLength={50}
        error={error}
        onChange={(event) => {
          setLoadType(event.target.value)
          setError('')
          setServerMessage('')
        }}
      />
    </ConfirmModal>
  )
}
