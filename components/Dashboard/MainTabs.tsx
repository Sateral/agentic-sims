import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import MetricsOverTime from './Tabs/MetricsOverTime';
import RecentUploads from './Tabs/RecentUploads';
import TopVideos from './Tabs/TopVideos';
import SimulationsTab from './Tabs/SimulationsTab';
import Settings from './Tabs/Settings';

import type { AppRouter } from '@/trpc/routers/_app';
import { inferRouterOutputs } from '@trpc/server';

type RouterOutput = inferRouterOutputs<AppRouter>;
type MetricsOverTimeOutput = RouterOutput['dashboard']['getMetricsOverTime'];
type PlatformDataOutput = RouterOutput['dashboard']['getPlatformComparison'];
type SimulationTypeOutput =
  RouterOutput['dashboard']['getSimulationTypePerformance'];
type RecentUploadsOutput = RouterOutput['dashboard']['getRecentUploads'];
type TopVideosOutput = RouterOutput['dashboard']['getTopPerformingVideos'];

const MainTabs = () => {
  return (
    <Tabs defaultValue="analytics" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="videos">Recent Videos</TabsTrigger>
        <TabsTrigger value="simulations">Simulations</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="analytics" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricsOverTime />
        </div>
      </TabsContent>

      <TabsContent value="videos" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Uploads */}
          <RecentUploads />

          {/* Top Performing Videos */}
          <TopVideos />
        </div>
      </TabsContent>

      <TabsContent value="simulations" className="space-y-4">
        <SimulationsTab />
      </TabsContent>

      <TabsContent value="settings" className="space-y-4">
        <Settings />
      </TabsContent>
    </Tabs>
  );
};

export default MainTabs;
