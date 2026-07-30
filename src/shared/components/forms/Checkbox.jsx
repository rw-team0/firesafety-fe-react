import { useId } from 'react'

// label 클릭으로도 토글되는 공통 체크박스
export default function Checkbox({ id, label, className = '', ...rest }) {
  const autoId = useId()
  const checkboxId = id ?? autoId

  return (
    <label className={`field-checkbox ${className}`.trim()} htmlFor={checkboxId}>
      <input id={checkboxId} type="checkbox" {...rest} />
      {label}
    </label>
  )
}
