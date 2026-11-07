import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMXN } from '@/lib/money'

export function GraficaUtilidad({ datos }: { datos: { mes: string; utilidad: number }[] }) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis hide />
          <Tooltip formatter={(valor) => formatMXN(Number(valor))} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="utilidad" name="Utilidad neta" radius={[4, 4, 0, 0]}>
            {datos.map((d) => (
              <Cell key={d.mes} fill={d.utilidad < 0 ? '#dc2626' : '#059669'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}