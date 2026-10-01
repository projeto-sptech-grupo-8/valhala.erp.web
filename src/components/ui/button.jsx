import { Slot } from '@radix-ui/react-slot'
import { cn } from '../../lib/utils'
import s from './button.module.css'

export function Button({ className, variant = 'default', size = 'default', asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(s.btn, s[variant], s[size], className)}
      {...props}
    />
  )
}
