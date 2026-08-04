import Button from '@/shared/components/buttons/Button'
import Input from '@/shared/components/forms/Input'
import Textarea from '@/shared/components/forms/Textarea'
import BaseModal from '@/shared/components/modals/BaseModal'

// 점검 항목 등록 모달
export default function InspectionItemModal({ visible, form, errors, loading, onChange, onSubmit, onClose }) {
  return (
    <BaseModal
      visible={visible}
      title="점검 항목 등록"
      onClose={onClose}
      className="facility-modal inspection-modal"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" loading={loading} onClick={onSubmit}>
            등록
          </Button>
        </>
      }
    >
      <div className="facility-form">
        <Input
          id="inspection-item-name"
          label="항목명"
          value={form.itemName}
          onChange={(event) => onChange('itemName', event.target.value)}
          error={errors.itemName}
          requiredMark
          placeholder="예: 누전차단기 동작 확인"
        />
        <Textarea
          id="inspection-item-description"
          label="항목 설명"
          value={form.description}
          onChange={(event) => onChange('description', event.target.value)}
          rows={4}
          placeholder="점검 방법이나 확인 기준을 입력하세요."
        />
      </div>
    </BaseModal>
  )
}
