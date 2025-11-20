"use client"

import * as React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Area,
  AreaChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type LayoutType,
} from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

// Define a type for the chart components
type ChartComponent =
  | typeof LineChart
  | typeof BarChart
  | typeof PieChart
  | typeof RadialBarChart
  | typeof AreaChart
  | typeof ScatterChart

// Define a type for the chart elements (lines, bars, etc.)
type ChartElement =
  | typeof Line
  | typeof Bar
  | typeof Pie
  | typeof RadialBar
  | typeof Area
  | typeof Scatter

// Define a mapping from string names to chart components
const CHART_COMPONENTS: Record<string, ChartComponent> = {
  LineChart,
  BarChart,
  PieChart,
  RadialBarChart,
  AreaChart,
  ScatterChart,
}

// Define a mapping from string names to chart elements
const CHART_ELEMENTS: Record<string, ChartElement> = {
  Line,
  Bar,
  Pie,
  RadialBar,
  Area,
  Scatter,
}

interface ChartProps extends React.ComponentProps<typeof ChartContainer> {
  data: Record<string, any>[]
  config: ChartConfig
  chartType: keyof typeof CHART_COMPONENTS
  layout?: LayoutType
  syncId?: string
  hideTooltip?: boolean
  hideLegend?: boolean
  children?: React.ReactNode
}

const Chart = React.forwardRef<HTMLDivElement, ChartProps>(
  (
    {
      data,
      config,
      chartType,
      layout = "horizontal",
      syncId,
      hideTooltip = false,
      hideLegend = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const ChartComponent = CHART_COMPONENTS[chartType]
    if (!ChartComponent) {
      console.error(`Invalid chart type: ${chartType}`)
      return null
    }

    const defaultXAxisKey = Object.keys(data[0] || {})[0]
    const defaultYAxisKey = Object.keys(data[0] || {})[1]

    return (
      <ChartContainer
        ref={ref}
        config={config}
        className={cn("min-h-[200px] w-full", className)}
        {...props}
      >
        <ResponsiveContainer>
          <ChartComponent data={data} layout={layout} syncId={syncId}>
            <CartesianGrid vertical={layout === "vertical"} horizontal={layout === "horizontal"} />
            <XAxis
              dataKey={config.xAxis?.dataKey || defaultXAxisKey}
              type={layout === "horizontal" ? "category" : "number"}
              tickFormatter={config.xAxis?.tickFormatter}
              hide={config.xAxis?.hide}
            />
            <YAxis
              dataKey={config.yAxis?.dataKey || defaultYAxisKey}
              type={layout === "vertical" ? "category" : "number"}
              tickFormatter={config.yAxis?.tickFormatter}
              hide={config.yAxis?.hide}
            />
            {!hideTooltip && (
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            )}
            {!hideLegend && (
              <ChartLegend content={<ChartLegendContent />} />
            )}
            {children ||
              Object.entries(config).map(([key, item]) => {
                if (key.startsWith("data")) {
                  const ChartElement = CHART_ELEMENTS[item.type as string]
                  if (!ChartElement) {
                    console.error(`Invalid chart element type: ${item.type}`)
                    return null
                  }
                  return (
                    <ChartElement
                      key={key}
                      dataKey={item.dataKey}
                      fill={item.color}
                      stroke={item.color}
                      name={item.label || item.dataKey}
                      {...(item.type === "Pie" && { data: data })} // PieChart needs data prop on Pie element
                    />
                  )
                }
                return null
              })}
          </ChartComponent>
        </ResponsiveContainer>
      </ChartContainer>
    )
  }
)

Chart.displayName = "Chart"

export { Chart }