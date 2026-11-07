
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts'
import { formatMXN } from '@/lib/money'

export function GraficaUtilidad({
  datos,
}: {
  datos: { mes: string; utilidad: number }[]
}) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datos}
          margin={{ top: 12, right: 4, left: 4, bottom: 0 }}
          barCategoryGap="30%"
        >
          <XAxis
            dataKey="mes"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            dy={8}
          />

          <YAxis hide />

          <ReferenceLine y={0} stroke="#E2E8F0" />

          <Tooltip
            formatter={(valor) => [
              formatMXN(Number(valor)),
              'Utilidad neta',
            ]}
            cursor={{ fill: '#F8FAFC' }}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
              padding: '10px 12px',
              fontSize: '12px',
            }}
            labelStyle={{
              color: '#64748B',
              fontWeight: 600,
              marginBottom: '4px',
            }}
          />

          <Bar
            dataKey="utilidad"
            name="Utilidad neta"
            radius={[6, 6, 0, 0]}
            maxBarSize={34}
          >
            {datos.map((d) => (
              <Cell
                key={d.mes}
                fill={d.utilidad < 0 ? '#E11D48' : '#7C3AED'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
