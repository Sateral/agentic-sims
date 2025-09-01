import React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { useTRPC } from '@/trpc/client';
import { useQuery } from '@tanstack/react-query';
import useQueryStore from '@/stores/query-store';

const TopVideos = () => {
  const { selectedPlatform, selectedMetric, timeframe } = useQueryStore();

  const trpc = useTRPC();

  const { data: topVideos } = useQuery(
    trpc.dashboard.getTopPerformingVideos.queryOptions({
      limit: 5,
      platform: selectedPlatform === 'all' ? undefined : selectedPlatform,
      sortBy: selectedMetric,
      timeframe:
        timeframe === 'day' ? 'day' : timeframe === 'week' ? 'week' : 'month',
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performers</CardTitle>
        <CardDescription>Highest view counts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topVideos?.map((video, index: number) => (
            <div key={video.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {video.video.title}
                </div>
                <div className="text-xs text-gray-500">
                  {video.metricSnapshots[0].views.toLocaleString()} views
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
  );
};

export default TopVideos;
