import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import type { AutomationSettings } from '../../../shared/types/database';

type SettingsPatch = Partial<
  Pick<AutomationSettings, 'auto_dispatch' | 'predictive_schedule' | 'escalate_after_min' | 'offline_after_min'>
>;

/**
 * Cấu hình "bộ não tự động" trên server (bảng automation_settings, 1 dòng) và
 * các thao tác của quản lý: bật/tắt quy tắc, đổi ca trực, chạy vòng kiểm tra
 * ngay thay vì đợi lịch 5 phút.
 */
export function useAutomation() {
  const qc = useQueryClient();

  const settings = useQuery({
    queryKey: ['automation_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('automation_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return data as AutomationSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (patch: SettingsPatch) => {
      const { error } = await supabase
        .from('automation_settings')
        .update({ ...patch, updated_at: new Date().toISOString() } as never)
        .eq('id', 1);
      if (error) throw error;
    },
    // Đổi ngay trên giao diện, lỗi thì tải lại giá trị thật.
    onMutate: (patch) => {
      qc.setQueryData<AutomationSettings>(['automation_settings'], (old: AutomationSettings | undefined) => (old ? { ...old, ...patch } : old));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['automation_settings'] }),
  });

  const setOnDuty = useMutation({
    mutationFn: async ({ collectorId, onDuty }: { collectorId: string; onDuty: boolean }) => {
      const { error } = await supabase.from('profiles').update({ on_duty: onDuty } as never).eq('id', collectorId);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin_collectors'] }),
  });

  const runNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('run_automation');
      if (error) throw error;
      return data as { offline: number; escalated: number; planned: number };
    },
    onSuccess: () => {
      for (const queryKey of [['admin_tasks'], ['admin_devices'], ['notifications']]) {
        void qc.invalidateQueries({ queryKey });
      }
    },
  });

  return { settings: settings.data, isLoading: settings.isLoading, refetch: settings.refetch, updateSettings, setOnDuty, runNow };
}
