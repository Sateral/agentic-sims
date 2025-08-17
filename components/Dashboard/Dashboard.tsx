'use client';

import { useState, useEffect } from 'react';
import { useTRPC } from '@/trpc/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Header from './Header';
import StatsOverview from './StatsOverview';
import MainTabs from './MainTabs';
import useQueryStore from '@/stores/query-store';

const Dashboard = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);

  // tRPC hooks - using the useTRPC hook
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Queries - using the correct pattern
  const { data: stats, refetch: refetchStats } = useQuery(
    trpc.dashboard.getStats.queryOptions()
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto space-y-6 my-6">
        <Header />

        <StatsOverview stats={stats} />

        <MainTabs />
      </div>
    </div>
  );
};

export default Dashboard;
