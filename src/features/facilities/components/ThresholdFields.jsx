import Input from '@/shared/components/forms/Input'
import { THRESHOLD_FIELDS } from '../utils/facilityFormatters'

// 임계값 입력 필드
export default function ThresholdFields({ form, errors, onChange }) {
  return (
    <div className="facility-form__thresholds">
      {THRESHOLD_FIELDS.map((field) => (
        <Input
          key={field.key}
          label={field.unit ? `${field.label} (${field.unit})` : field.label}
          type="number"
          step={field.type === 'integer' ? '1' : '0.1'}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          value={form[field.key]}
          error={errors[field.key]}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      ))}
    </div>
  )
}
