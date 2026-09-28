import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import { FILL_ALERT_THRESHOLD } from '../../../shared/constants/waste';
import type { DeviceWithBins } from '../types';

/** Mọi thùng rác kèm các ngăn — dùng chung cho các tab admin (cùng một cache). */
export function useAdminDevices() {
  return useQuery({
    queryKey: ['admin_devices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('devices').select('*, bins(*)');
      if (error) throw error;
      return data as DeviceWithBins[];
    },
  });
}

export function isDeviceFull(d: DeviceWithBins) {
  return d.bins?.some((b) => b.fill_level >= FILL_ALERT_THRESHOLD) ?? false;
}
