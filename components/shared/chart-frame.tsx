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
      return <EmptyState icon={BarChart3} title="Chart unavailable" description="The data is still safe. Try refreshing this view." />;
    }
    return this.props.children;
  }
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
  if (data.length === 0) {
    return <EmptyState icon={BarChart3} title="No chart data yet" description="Log a few entries and this chart will fill in automatically." />;
  }

  return (
    <ChartErrorBoundary>
      <div className="w-full min-w-0" style={{ height, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={height} initialDimension={{ width: 800, height }}>
          <BarChart data={data}>
            <CartesianGrid stroke={theme.goal} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} stroke={theme.muted} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis stroke={theme.muted} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip contentStyle={{ background: theme.background, border: `1px solid ${theme.goal}`, borderRadius: 8 }} />
            {goal !== undefined && <ReferenceLine y={goal} stroke={theme.warning} strokeDasharray="4 4" />}
            <Bar dataKey={yKey} radius={[6, 6, 0, 0]} fill={theme.primary} />
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
  if (data.length === 0) {
    return <EmptyState icon={BarChart3} title="No chart data yet" description="Add a few entries to see the trend." />;
  }

  return (
    <ChartErrorBoundary>
      <div className="w-full min-w-0" style={{ height, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={height} initialDimension={{ width: 800, height }}>
          <LineChart data={data}>
            <CartesianGrid stroke={theme.goal} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} stroke={theme.muted} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis stroke={theme.muted} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip contentStyle={{ background: theme.background, border: `1px solid ${theme.goal}`, borderRadius: 8 }} />
            {goal !== undefined && <ReferenceLine y={goal} stroke={theme.warning} strokeDasharray="4 4" />}
            <Line type="monotone" dataKey={yKey} stroke={theme.primary} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartErrorBoundary>
  );
}
