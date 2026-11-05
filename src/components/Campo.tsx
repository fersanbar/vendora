import type { ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Campo(props: {
  id: string
  label: string
  value: string
  type?: 'text' | 'date' | 'month'
  onChange: (v: string) => void
  maxLength: number
  inputMode?: 'text' | 'numeric' | 'decimal'
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        value={props.value}
        maxLength={props.maxLength}
        inputMode={props.inputMode}
        placeholder={props.placeholder}
        type={props.type}
        className="h-11"
        onChange={(e: ChangeEvent<HTMLInputElement>) => props.onChange(e.target.value)}
      />
    </div>
  )
}