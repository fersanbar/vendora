
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatMXN } from '@/lib/money'

export function GraficaUtilidad({
  datos,
}: {
  datos: { mes: string; utilidad: number }[]
}) {
  return (
    <div className="w-full">
      {datos.length === 0 ? (
        <div className="flex h-44 items-center justify-center rounded-xl bg-slate-50">
          <p className="text-sm text-slate-400">
            Aún no hay datos para mostrar.
          </p>
        </div>
      ) : (
        <>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={datos}
                margin={{ top: 12, right: 8, left: 8, bottom: 0 }}
              >
                <XAxis
                  dataKey="mes"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickMargin={10}
                  minTickGap={12}
                />

                <YAxis hide domain={['auto', 'auto']} />

                <ReferenceLine
                  y={0}
                  stroke="#cbd5e1"
                  strokeDasharray="3 3"
                />

                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(valor) => [
                    formatMXN(Number(valor)),
                    'Utilidad neta',
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                    padding: '10px 14px',
                    fontSize: '12px',
                  }}
                  labelStyle={{
                    color: '#64748b',
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                  itemStyle={{
                    color: '#172554',
                    fontWeight: 700,
                  }}
                />

                <Bar
                  dataKey="utilidad"
                  name="Utilidad neta"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                  minPointSize={3}
                >
                  {datos.map((d, index) => (
                    <Cell
                      key={`${d.mes}-${index}`}
                      fill={d.utilidad < 0 ? '#e11d48' : '#7c3aed'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex items-center justify-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-violet-600" />
              <span className="text-xs text-slate-500">Utilidad positiva</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-600" />
              <span className="text-xs text-slate-500">Pérdida</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
