'use client';

import { useState, useEffect } from 'react';
import { useTRPC } from '@/trpc/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Play,
  Upload,
  Eye,
  Heart,
  MessageCircle,
  Share,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import Header from './Header';
import StatsOverview from './StatsOverview';
import MainTabs from './MainTabs';

const Dashboard = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<
    'views' | 'likes' | 'comments' | 'shares'
  >('views');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('youtube');
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [syncLoading, setSyncLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);

  // tRPC hooks - using the useTRPC hook
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Queries - using the correct pattern
  const { data: stats, refetch: refetchStats } = useQuery(
    trpc.dashboard.getStats.queryOptions()
  );
  const { data: recentUploads, refetch: refetchUploads } = useQuery(
    trpc.dashboard.getRecentUploads.queryOptions({ limit: 10 })
  );
  const { data: metricsOverTime, refetch: refetchMetrics } = useQuery(
    trpc.dashboard.getMetricsOverTime.queryOptions({
      days: timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30,
      platform: selectedPlatform === 'all' ? undefined : selectedPlatform,
      metric: selectedMetric,
    })
  );
  const { data: platformComparison, refetch: refetchPlatforms } = useQuery(
    trpc.dashboard.getPlatformComparison.queryOptions()
  );
  const { data: topVideos, refetch: refetchTopVideos } = useQuery(
    trpc.dashboard.getTopPerformingVideos.queryOptions({
      limit: 5,
      platform: selectedPlatform === 'all' ? undefined : selectedPlatform,
      sortBy: selectedMetric,
      timeframe:
        timeframe === 'day' ? 'day' : timeframe === 'week' ? 'week' : 'month',
    })
  );
  const { data: simulationTypes, refetch: refetchSimTypes } = useQuery(
    trpc.dashboard.getSimulationTypePerformance.queryOptions()
  );

  // Mutations using standard React Query pattern
  const syncMetrics = useMutation({
    mutationFn: () =>
      fetch('/api/trpc/simulation.syncMetrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then((r) => r.json()),
    onSuccess: () => {
      setSyncLoading(false);
      setLastSyncTime(new Date());
      queryClient.invalidateQueries();
    },
    onError: () => setSyncLoading(false),
  });

  const runDailyProcess = useMutation({
    mutationFn: () =>
      fetch('/api/trpc/simulation.runDailyProcess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then((r) => r.json()),
    onSuccess: () => {
      setDailyLoading(false);
      queryClient.invalidateQueries();
    },
    onError: () => setDailyLoading(false),
  });
  const refreshAllData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
        refetchUploads(),
        refetchMetrics(),
        refetchPlatforms(),
        refetchTopVideos(),
        refetchSimTypes(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSyncMetrics = () => {
    syncMetrics.mutate();
  };

  const handleRunDailyProcess = () => {
    runDailyProcess.mutate();
  };

  // Format platform data for charts (YouTube only for now)
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

  // Format simulation type data for pie chart
  const simulationTypeData =
    simulationTypes?.map((type: any, index: number) => ({
      name: type.type.replace('_', ' ').toUpperCase(),
      value: type.videoCount || type.uploadCount || 0,
      color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][index % 5],
    })) || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Header
          handleSyncMetrics={handleSyncMetrics}
          handleRunDailyProcess={handleRunDailyProcess}
          syncLoading={syncLoading}
          dailyLoading={dailyLoading}
          lastSyncTime={lastSyncTime}
          isRefreshing={isRefreshing}
        />

        {/* Stats Overview */}
        <StatsOverview stats={stats} />

        {/* Main Content Tabs */}
        <MainTabs
          metricsOverTime={metricsOverTime}
          platformComparison={platformComparison}
          simulationTypes={simulationTypes}
          recentUploads={recentUploads}
          topVideos={topVideos}
        />
      </div>
    </div>
  );
};

export default Dashboard;
