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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              AI Video Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor your simulation videos across all platforms
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSyncMetrics}
              disabled={syncLoading || isRefreshing}
            >
              {syncLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync Metrics
            </Button>
            <Button
              onClick={handleRunDailyProcess}
              disabled={dailyLoading || isRefreshing}
            >
              {dailyLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run Daily Process
            </Button>
            <Button className="hover:pointer">Test</Button>
            {lastSyncTime && (
              <p className="text-xs text-gray-500 self-center">
                Last sync: {lastSyncTime.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Videos
              </CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalVideos || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Generated simulations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Uploads
              </CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalUploads || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all platforms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Uploads
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.todayUploads || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +20% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalViews?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalLikes?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Views</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.avgViews?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">Per video</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="videos">Recent Videos</TabsTrigger>
            <TabsTrigger value="simulations">Simulations</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Metrics Over Time */}
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
                      <select
                        value={selectedMetric}
                        onChange={(e) =>
                          setSelectedMetric(e.target.value as any)
                        }
                        className="px-3 py-1 border rounded"
                      >
                        <option value="views">Views</option>
                        <option value="likes">Likes</option>
                        <option value="comments">Comments</option>
                        <option value="shares">Shares</option>
                      </select>
                      <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value as any)}
                        className="px-3 py-1 border rounded"
                      >
                        <option value="day">Last 24h</option>
                        <option value="week">Last Week</option>
                        <option value="month">Last Month</option>
                      </select>
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
            </div>
          </TabsContent>

          <TabsContent value="videos" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Uploads */}
              <Card className="col-span-1 lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Uploads</CardTitle>
                  <CardDescription>
                    Latest videos across all platforms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentUploads?.map((upload: any) => (
                      <div
                        key={upload.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">
                              {upload.video.title}
                            </h3>
                            <Badge
                              variant={
                                upload.platform === 'youtube'
                                  ? 'destructive'
                                  : upload.platform === 'tiktok'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {upload.platform}
                            </Badge>
                            <Badge
                              variant={
                                upload.status === 'published'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {upload.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {upload.video.simulation.type} •{' '}
                            {upload.video.duration}s •
                            {new Date(upload.uploadedAt).toLocaleDateString()}
                          </div>
                          {upload.metrics[0] && (
                            <div className="flex gap-4 text-sm text-gray-500 mt-2">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {upload.metrics[0].views.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {upload.metrics[0].likes.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {upload.metrics[0].comments}
                              </span>
                              <span className="flex items-center gap-1">
                                <Share className="w-3 h-3" />
                                {upload.metrics[0].shares}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={upload.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Videos */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>Highest view counts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topVideos?.map((video: any, index: number) => (
                      <div key={video.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {video.video.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {video.metrics[0].views.toLocaleString()} views
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {video.platform}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="simulations" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generate New Simulations</CardTitle>
                  <CardDescription>
                    Create new physics simulations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-100"></div>
                      Bouncing Balls
                    </Button>
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-purple-100"></div>
                      Particle Physics
                    </Button>
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-green-100"></div>
                      Fluid Dynamics
                    </Button>
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-yellow-100"></div>
                      Gravity Sim
                    </Button>
                  </div>
                  <Button className="w-full">
                    Generate All Types (20 videos)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Simulation Performance</CardTitle>
                  <CardDescription>
                    AI scores by simulation type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Bouncing Balls</span>
                        <span>85% avg score</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Particle Physics</span>
                        <span>92% avg score</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Fluid Dynamics</span>
                        <span>78% avg score</span>
                      </div>
                      <Progress value={78} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Gravity Sim</span>
                        <span>88% avg score</span>
                      </div>
                      <Progress value={88} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Automation Settings</CardTitle>
                  <CardDescription>
                    Configure automatic processes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Daily Video Generation</div>
                      <div className="text-sm text-gray-500">
                        Generate new videos every day at 9 AM
                      </div>
                    </div>
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Auto Upload</div>
                      <div className="text-sm text-gray-500">
                        Upload top 3 videos to all platforms
                      </div>
                    </div>
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Metrics Sync</div>
                      <div className="text-sm text-gray-500">
                        Update video metrics every 2 hours
                      </div>
                    </div>
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Integration</CardTitle>
                  <CardDescription>
                    Connected accounts and API status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white text-sm font-medium">
                        YT
                      </div>
                      <div>
                        <div className="font-medium">YouTube</div>
                        <div className="text-sm text-gray-500">
                          OAuth Setup Required
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Setup
                      </Badge>
                      <Button size="sm" asChild>
                        <a href="/auth/youtube/setup">Configure</a>
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white text-sm font-medium">
                        TT
                      </div>
                      <div>
                        <div className="font-medium">TikTok</div>
                        <div className="text-sm text-gray-500">
                          Disabled for testing
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">
                      <X className="w-3 h-3 mr-1" />
                      Disabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center text-white text-sm font-medium">
                        IG
                      </div>
                      <div>
                        <div className="font-medium">Instagram</div>
                        <div className="text-sm text-gray-500">
                          Disabled for testing
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">
                      <X className="w-3 h-3 mr-1" />
                      Disabled
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
