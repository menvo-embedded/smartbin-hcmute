import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import { FORECAST_WINDOW_HOURS, type SortSample } from '../fillForecast';

/** Lượt bỏ rác 7 ngày qua của mọi thùng (admin đọc được toàn bộ qua RLS). */
export function useSortSamples() {
  return useQuery({
    queryKey: ['admin_sort_samples'],
    queryFn: async () => {
      const since = new Date(Date.now() - FORECAST_WINDOW_HOURS * 3_600_000).toISOString();
      const { data, error } = await supabase
        .from('sort_events')
        .select('device_id, waste_type, created_at')
        .gte('created_at', since);
      if (error) throw error;
      return data as unknown as SortSample[];
    },
  });
}
