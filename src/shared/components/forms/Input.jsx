import { useId } from 'react'

// label/error 연결 포함한 공통 텍스트 입력
export default function Input({ id, label, error, className = '', ...rest }) {
  const autoId = useId()
  const inputId = id ?? autoId // id 미지정 시 자동 생성 → label 연결용

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`field-input ${error ? 'has-error' : ''} ${className}`.trim()}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
