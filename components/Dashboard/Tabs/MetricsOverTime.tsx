import React, { useState } from 'react';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { AppRouter } from '@/trpc/routers/_app';
import { inferRouterOutputs } from '@trpc/server';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import useQueryStore from '@/stores/query-store';

type RouterOutput = inferRouterOutputs<AppRouter>;
type MetricsOverTimeOutput = RouterOutput['dashboard']['getMetricsOverTime'];
type PlatformDataOutput = RouterOutput['dashboard']['getPlatformComparison'];
type SimulationTypeOutput =
  RouterOutput['dashboard']['getSimulationTypePerformance'];

interface MetricsOverTimeProps {
  metricsOverTime: MetricsOverTimeOutput | undefined;
  platformComparison: PlatformDataOutput | undefined;
  simulationTypes: SimulationTypeOutput | undefined;
}

const MetricsOverTime = ({
  metricsOverTime,
  platformComparison,
  simulationTypes,
}: MetricsOverTimeProps) => {
  const { selectedMetric, setSelectedMetric, timeframe, setTimeframe } =
    useQueryStore();

  const platformData =
    platformComparison
      ?.filter((p: any) => p.platform === 'youtube')
      .map((platform: any) => ({
        platform:
          platform.platform.charAt(0).toUpperCase() +
          platform.platform.slice(1),
        avgViews: platform.avgViews,
        totalUploads: platform.count,
        color: '#FF0000', // YouTube red
      })) || [];

  const simulationTypeData =
    simulationTypes?.map((type: any, index: number) => ({
      name: type.type.replace('_', ' ').toUpperCase(),
      value: type.videoCount || type.uploadCount || 0,
      color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][index % 5],
    })) || [];

  return (
    <>
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Metrics Over Time</CardTitle>
              <CardDescription>
                Performance trends across platforms
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedMetric}
                onValueChange={(value) => setSelectedMetric(value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="views">Views</SelectItem>
                  <SelectItem value="likes">Likes</SelectItem>
                  <SelectItem value="comments">Comments</SelectItem>
                  <SelectItem value="shares">Shares</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={timeframe}
                onValueChange={(value) => setTimeframe(value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Last 24h</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsOverTime || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                strokeWidth={2}
                name={
                  selectedMetric.charAt(0).toUpperCase() +
                  selectedMetric.slice(1)
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Platform Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
          <CardDescription>Average views by platform</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={platformData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgViews" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Platform Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Distribution</CardTitle>
          <CardDescription>Videos by platform</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={simulationTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ platform, totalUploads }) =>
                  `${platform}: ${totalUploads}`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="totalUploads"
              >
                {simulationTypeData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
};

export default MetricsOverTime;
