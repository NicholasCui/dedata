/* eslint-disable react/jsx-no-comment-textnodes */
'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { useCheckInSummary } from '@/application/hooks/useAuth'

interface TokenTrendsProps {
  days?: 7 | 30
}

interface TrendDataPoint {
  date: string
  amount: number
  dailyAmount: number
}

export function TokenTrends({ days = 7 }: TokenTrendsProps) {
  const [selectedDays, setSelectedDays] = useState(days)
  const { data: summary, isLoading } = useCheckInSummary()

  // Process dailyStats into chart data
  const trendData = useMemo<TrendDataPoint[]>(() => {
    if (!summary?.dailyStats) return []

    // Create a map of date -> token amount
    const statsMap = new Map<string, number>()
    summary.dailyStats.forEach(stat => {
      const date = new Date(stat.date).toISOString().split('T')[0]
      const amount = parseFloat(stat.token_amount)
      statsMap.set(date, amount)
    })

    // Generate date range for the selected period
    const result: TrendDataPoint[] = []
    const today = new Date()
    let cumulativeAmount = 0

    for (let i = selectedDays - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dailyAmount = statsMap.get(dateStr) || 0
      cumulativeAmount += dailyAmount

      result.push({
        date: dateStr,
        amount: cumulativeAmount,
        dailyAmount: dailyAmount,
      })
    }

    return result
  }, [summary, selectedDays])

  // Calculate total earnings (cumulative)
  const totalEarnings = trendData.length > 0 ? trendData[trendData.length - 1].amount : 0

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-black/90 border border-green-500/50 rounded p-3 font-mono">
          <p className="text-green-400 text-xs">{`Date: ${new Date(label).toLocaleDateString()}`}</p>
          <p className="text-green-500 text-sm font-bold">
            {`Cumulative: ${payload[0].value} DDATA`}
          </p>
          {data.dailyAmount > 0 && (
            <p className="text-green-300 text-xs">
              {`Daily: +${data.dailyAmount} DDATA`}
            </p>
          )}
        </div>
      )
    }
    return null
  }
  
  return (
    <div className="terminal rounded-lg p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-lg font-bold text-green-500 font-mono">&gt; EARNINGS_TREND</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setSelectedDays(7)}
            className={`px-3 py-1 border ${
              selectedDays === 7 
                ? 'bg-green-500 text-black border-green-500 font-bold' 
                : 'border-green-500/50 text-green-400 hover:border-green-500 hover:text-green-500'
            } rounded font-mono text-xs transition-colors`}
          >
            7_DAYS
          </button>
          <button 
            onClick={() => setSelectedDays(30)}
            className={`px-3 py-1 border ${
              selectedDays === 30 
                ? 'bg-green-500 text-black border-green-500 font-bold' 
                : 'border-green-500/50 text-green-400 hover:border-green-500 hover:text-green-500'
            } rounded font-mono text-xs transition-colors`}
          >
            30_DAYS
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center border border-green-500/20 rounded bg-black/50">
          <p className="text-green-400 font-mono text-sm animate-pulse">// Loading trend data...</p>
        </div>
      ) : trendData.length > 0 ? (
        <div className="relative flex-1 border border-green-500/20 rounded bg-black/50 p-4">
          {/* Chart */}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trendData}
              margin={{
                top: 30,
                right: 20,
                left: 20,
                bottom: 20,
              }}
            >
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff41" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00ff41" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#00ff41" 
                strokeOpacity={0.1}
              />
              <XAxis 
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fill: '#00ff41', 
                  fontSize: 10, 
                  fontFamily: 'monospace' 
                }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fill: '#00ff41', 
                  fontSize: 10, 
                  fontFamily: 'monospace' 
                }}
                tickFormatter={(value) => `${value}`}
                interval={0}
                domain={[0, 'dataMax']}
                ticks={(() => {
                  const max = Math.max(...(trendData.length > 0 ? trendData.map(d => d.amount) : [0]))
                  const maxTick = Math.ceil(max / 10) * 10
                  const ticks = []
                  for (let i = 0; i <= maxTick; i += 10) {
                    ticks.push(i)
                  }
                  return ticks
                })()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#00ff41"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorEarnings)"
              />
            </AreaChart>
          </ResponsiveContainer>
          
          {/* Summary overlay */}
          <div className="absolute top-2 left-2 text-xs font-mono bg-black/80 px-2 py-1 rounded border border-green-500/30">
            <span className="text-green-400">TOTAL: </span>
            <span className="text-green-500 font-bold">
              {totalEarnings} DDATA
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center border border-green-500/20 rounded bg-black/50">
          <div className="text-center">
            <p className="text-green-400 font-mono text-sm">// No earnings data</p>
            <p className="text-green-300 font-mono text-xs mt-1">Start checking in to earn DDATA</p>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="flex items-center justify-between mt-4 text-xs font-mono shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-green-300">Cumulative Earnings</span>
          </div>
        </div>
        <div className="text-green-400">
          Period: Last {selectedDays} days
        </div>
      </div>
    </div>
  )
}