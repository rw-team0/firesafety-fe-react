import { useId } from 'react'

// label/error 연결 포함한 공통 여러 줄 입력
export default function Textarea({ id, label, error, className = '', ...rest }) {
  const autoId = useId()
  const textareaId = id ?? autoId

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`field-textarea ${error ? 'has-error' : ''} ${className}`.trim()}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${textareaId}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
