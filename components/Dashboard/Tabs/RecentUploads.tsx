import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Eye, Heart, MessageCircle, Share } from 'lucide-react';
import React from 'react';

import { useTRPC } from '@/trpc/client';
import { useQuery } from '@tanstack/react-query';

const RecentUploads = () => {
  const trpc = useTRPC();
  const { data: recentUploads } = useQuery(
    trpc.dashboard.getRecentUploads.queryOptions({ limit: 10 })
  );

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Recent Uploads</CardTitle>
        <CardDescription>Latest videos across all platforms</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentUploads?.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{upload.video.title}</h3>
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
                      upload.status === 'published' ? 'default' : 'secondary'
                    }
                  >
                    {upload.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {upload.video.simulation.type} • {upload.video.duration}s •
                  {new Date(upload.uploadedAt).toLocaleDateString()}
                </div>
                {upload.metricSnapshots[0] && (
                  <div className="flex gap-4 text-sm text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {upload.metricSnapshots[0].views.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {upload.metricSnapshots[0].likes.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {upload.metricSnapshots[0].comments}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share className="w-3 h-3" />
                      {upload.metricSnapshots[0].shares}
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
  );
};

export default RecentUploads;
