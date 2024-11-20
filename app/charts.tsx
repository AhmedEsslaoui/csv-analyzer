import React, { useState } from 'react'
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

type ChartProps = {
  chartType: 'bar' | 'pie'
  chartData: ChartDataItem[]
  colors: string[]
}

type ChartDataItem = {
  name: string
  value: number
  percentage: string
  isOther?: boolean
}

type PieActiveShapeProps = {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  fill: string
  payload: ChartDataItem
  percent: number
  value: number
}

const RADIAN = Math.PI / 180

const renderCustomizedLabel = (props: PieActiveShapeProps) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, payload } = props
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      fontSize="12"
    >
      {`${payload.name}: ${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const renderActiveShape = (props: unknown) => {
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props as PieActiveShapeProps
  
  const sin = Math.sin(-RADIAN * midAngle)
  const cos = Math.cos(-RADIAN * midAngle)
  const sx = cx + (outerRadius + 10) * cos
  const sy = cy + (outerRadius + 10) * sin
  const mx = cx + (outerRadius + 30) * cos
  const my = cy + (outerRadius + 30) * sin
  const ex = mx + (cos >= 0 ? 1 : -1) * 22
  const ey = my
  const textAnchor = cos >= 0 ? 'start' : 'end'

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" fontSize="14">
        {`${payload.name} (${(percent * 100).toFixed(2)}%)`}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#666" fontSize="12">
        {`${Math.round(value)} entries`}
      </text>
    </g>
  )
}

export default function Charts({ chartType, chartData, colors }: ChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(undefined)
  }

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={500}>
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={150}
            fill="#8884d8"
            dataKey="value"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]}
                style={{
                  filter: activeIndex === index ? 'url(#shadow)' : 'none',
                  transition: 'filter 0.3s ease-in-out',
                }}
              />
            ))}
          </Pie>
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodOpacity="0.5" />
            </filter>
          </defs>
        </PieChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={500}>
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip 
          formatter={(value: number) => Math.round(value)}
          labelFormatter={(label) => `Category: ${label}`}
        />
        <Legend />
        <Bar 
          dataKey="value" 
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(undefined)}
        >
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={colors[index % colors.length]}
              style={{
                filter: activeIndex === index ? 'url(#shadow)' : 'none',
                transition: 'filter 0.3s ease-in-out',
              }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
