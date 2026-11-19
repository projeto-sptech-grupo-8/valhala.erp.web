import s from './RequiredMark.module.css'

export function RequiredMark() {
  return <span className={s.mark} aria-hidden="true">*</span>
}
