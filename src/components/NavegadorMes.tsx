import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { etiquetaPeriodo, moverPeriodo } from '@/lib/dates'

export function NavegadorMes({ periodo, onChange }: { periodo: string; onChange: (p: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" size="icon" onClick={() => onChange(moverPeriodo(periodo, -1))} aria-label="Mes anterior">
        <ChevronLeft className="size-4" />
      </Button>
      <p className="font-medium capitalize">{etiquetaPeriodo(periodo)}</p>
      <Button variant="outline" size="icon" onClick={() => onChange(moverPeriodo(periodo, 1))} aria-label="Mes siguiente">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}