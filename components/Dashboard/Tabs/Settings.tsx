'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/trpc/client';

const Settings = () => {
  const trpc = useTRPC();

  const {
    data: youtubeStatus,
    isLoading,
    refetch: checkConnection,
    isFetching,
  } = useQuery(trpc.youtube.status.queryOptions());

  const youtubeConnection = youtubeStatus || {
    connected: false,
    reason: 'Loading...',
  };

  function refreshStatus() {
    checkConnection();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>Configure automatic processes</CardDescription>
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
          <CardDescription>Connected accounts and API status</CardDescription>
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
                  {youtubeConnection.connected
                    ? 'API Connected'
                    : youtubeConnection.reason || 'OAuth Setup Required'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLoading || isFetching ? (
                <Badge variant="secondary">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Checking...
                </Badge>
              ) : youtubeConnection.connected ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                  {/* {youtubeConnection.channelId && (
                    <div className="text-xs text-gray-500">
                      ID: {youtubeConnection.channelId.substring(0, 8)}...
                    </div>
                  )} */}
                </div>
              ) : (
                <>
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Disconnected
                  </Badge>
                  <Button size="sm" asChild>
                    <a href="/auth/youtube/setup">Configure</a>
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => checkConnection()}
                disabled={isLoading || isFetching}
              >
                <RefreshCw
                  className={`w-3 h-3 ${
                    isLoading || isFetching ? 'animate-spin' : ''
                  }`}
                />
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
  );
};

export default Settings;
