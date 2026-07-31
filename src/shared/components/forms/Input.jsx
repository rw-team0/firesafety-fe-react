import { useId } from 'react'

// label/hint/error 연결 포함한 공통 텍스트 입력
// requiredMark는 표시 전용 — 네이티브 required를 붙이면 브라우저 검증이 화면 검증보다 먼저 끼어듦
export default function Input({ id, label, error, hint, requiredMark = false, className = '', ...rest }) {
  const autoId = useId()
  const inputId = id ?? autoId // id 미지정 시 자동 생성 → label 연결용
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
          {requiredMark && (
            <>
              <span className="field-required" aria-hidden="true">
                *
              </span>
              <span className="u-sr-only">필수</span>
            </>
          )}
        </label>
      )}
      <input
        id={inputId}
        className={`field-input ${error ? 'has-error' : ''} ${className}`.trim()}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
