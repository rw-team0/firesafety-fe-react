import { useId } from 'react'

// options: [{ value, label }]. label/error 연결 포함한 공통 select
export default function Select({
  id,
  label,
  error,
  options = [],
  placeholder,
  requiredMark = false,
  className = '',
  ...rest
}) {
  const autoId = useId()
  const selectId = id ?? autoId

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={selectId}>
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
      <select
        id={selectId}
        className={`field-select ${error ? 'has-error' : ''} ${className}`.trim()}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
