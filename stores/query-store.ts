import * as z from 'zustand';

interface QueryState {
  selectedMetric: 'views' | 'likes' | 'comments' | 'shares';
  setSelectedMetric: (
    metric: 'views' | 'likes' | 'comments' | 'shares'
  ) => void;
  timeframe: 'day' | 'week' | 'month';
  setTimeframe: (timeframe: 'day' | 'week' | 'month') => void;
  selectedPlatform: 'youtube' | 'all'; // add more
  setSelectedPlatform: (platform: 'youtube' | 'all') => void;
}

const useQueryStore = z.create<QueryState>((set) => ({
  selectedMetric: 'views',
  setSelectedMetric: (metric) => set({ selectedMetric: metric }),

  timeframe: 'week',
  setTimeframe: (timeframe) => set({ timeframe }),

  selectedPlatform: 'youtube',
  setSelectedPlatform: (platform) => set({ selectedPlatform: platform }),
}));

export default useQueryStore;
