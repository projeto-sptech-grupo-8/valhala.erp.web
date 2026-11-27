import s from './DataTable.module.css'

export function PageSizeControl({ value, onChange, options = [10, 20, 50], label = 'Itens por página', ariaLabel }) {
  return (
    <label className={s.pageSize}>
      {label}
      <select aria-label={ariaLabel} value={value} onChange={event => onChange(Number(event.target.value))}>
        {options.map(size => <option key={size} value={size}>{size}</option>)}
      </select>
    </label>
  )
}
