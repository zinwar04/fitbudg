"use client";

import { Component, ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useChartTheme } from "@/components/shared/use-chart-theme";

interface ChartErrorBoundaryState {
  hasError: boolean;
}

class ChartErrorBoundary extends Component<{ children: ReactNode }, ChartErrorBoundaryState> {
  state: ChartErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    return undefined;
  }

  render() {
    if (this.state.hasError) {
      return <EmptyState icon={BarChart3} title="Chart unavailable" description="The rest of this page is still available." />;
    }
    return this.props.children;
  }
}

function cleanChartData(data: Record<string, string | number>[], xKey: string, yKey: string) {
  return data
    .filter((row) => row[xKey] !== undefined && row[xKey] !== null && Number.isFinite(Number(row[yKey])))
    .map((row) => ({ ...row, [yKey]: Number(row[yKey]) }));
}

function cleanGoal(goal: number | undefined) {
  return Number.isFinite(goal) ? goal : undefined;
}

export function ResponsiveBar({
  data,
  xKey,
  yKey,
  goal,
  height = 260,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  goal?: number;
  height?: number;
}) {
  const theme = useChartTheme();
  const chartData = cleanChartData(data, xKey, yKey);
  const goalLine = cleanGoal(goal);
  if (chartData.length === 0) {
    return <EmptyState icon={BarChart3} title="No chart data yet" description="Log a few entries and this chart will fill in automatically." />;
  }

  return (
    <ChartErrorBoundary>
      <div className="w-full min-w-0" style={{ height, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={height} initialDimension={{ width: 800, height }}>
          <BarChart data={chartData}>
            <CartesianGrid stroke={theme.goal} strokeDasharray="4 6" vertical={false} />
            <XAxis dataKey={xKey} stroke={theme.muted} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis stroke={theme.muted} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip cursor={{ fill: "rgba(15, 159, 138, 0.08)" }} contentStyle={{ background: theme.background, border: `1px solid ${theme.goal}`, borderRadius: 8, boxShadow: "var(--shadow-card)" }} />
            {goalLine !== undefined && <ReferenceLine y={goalLine} stroke={theme.warning} strokeDasharray="4 4" />}
            <Bar dataKey={yKey} radius={[8, 8, 2, 2]} fill={theme.primary} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  );
}

export function ResponsiveLine({
  data,
  xKey,
  yKey,
  goal,
  height = 260,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  goal?: number;
  height?: number;
}) {
  const theme = useChartTheme();
  const chartData = cleanChartData(data, xKey, yKey);
  const goalLine = cleanGoal(goal);
  if (chartData.length === 0) {
    return <EmptyState icon={BarChart3} title="No chart data yet" description="Add a few entries to see the trend." />;
  }

  return (
    <ChartErrorBoundary>
      <div className="w-full min-w-0" style={{ height, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={height} initialDimension={{ width: 800, height }}>
          <LineChart data={chartData}>
            <CartesianGrid stroke={theme.goal} strokeDasharray="4 6" vertical={false} />
            <XAxis dataKey={xKey} stroke={theme.muted} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis stroke={theme.muted} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip contentStyle={{ background: theme.background, border: `1px solid ${theme.goal}`, borderRadius: 8, boxShadow: "var(--shadow-card)" }} />
            {goalLine !== undefined && <ReferenceLine y={goalLine} stroke={theme.warning} strokeDasharray="4 4" />}
            <Line type="monotone" dataKey={yKey} stroke={theme.primary} strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: theme.background }} activeDot={{ r: 6, strokeWidth: 0, fill: theme.primary }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  );
}
