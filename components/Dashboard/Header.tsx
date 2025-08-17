import React, { useState } from 'react';

import { Loader2, Play, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ModeToggle';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const Header = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);

  const queryClient = useQueryClient();

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

  const handleSyncMetrics = () => {
    setSyncLoading(true);
    setIsRefreshing(true);
    try {
      syncMetrics.mutate();
    } catch (error) {
      console.error(error);
    } finally {
      setSyncLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRunDailyProcess = () => {
    runDailyProcess.mutate();
  };

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          AI Video Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor your simulation videos across all platforms
        </p>
      </div>
      <div className="flex gap-2">
        <ModeToggle />
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
        {lastSyncTime && (
          <p className="text-xs text-gray-500 self-center">
            Last sync: {lastSyncTime.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
};

Header.displayName = 'Header';

export default Header;
