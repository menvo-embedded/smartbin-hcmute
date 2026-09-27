import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import { toLocalDateString } from '../../../core/utils/time';
import type { Profile } from '../../../shared/types/database';
import type { TaskWithDetails, TaskShift } from '../types';

/**
 * Điều phối thu gom cho admin: danh sách việc, danh sách nhân viên và các
 * thao tác giao việc / lên lịch ca. Mọi lỗi từ Supabase được ném ra để màn
 * hình báo cho admin — không lưu tạm giả vào bộ nhớ.
 */
export function useAdminDispatch() {
  const qc = useQueryClient();

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['admin_tasks'] });
    qc.invalidateQueries({ queryKey: ['collection_tasks'] });
    qc.invalidateQueries({ queryKey: ['admin_devices'] });
  }

  // Danh sách công việc thu gom toàn hệ thống
  const {
    data: tasks,
    isLoading: isTasksLoading,
    isRefetching: isTasksRefetching,
    refetch: refetchTasks,
    error: tasksError,
  } = useQuery({
    queryKey: ['admin_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_tasks')
        .select('*, devices(name, area, code), profiles:assignee_id(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as TaskWithDetails[];
    },
  });

  // Danh sách nhân viên thu gom (role = collector)
  const {
    data: collectors,
    isLoading: isCollectorsLoading,
    refetch: refetchCollectors,
  } = useQuery({
    queryKey: ['admin_collectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'collector')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Giao việc cho nhân viên thu gom
  const assignTask = useMutation({
    mutationFn: async ({ taskId, collectorId }: { taskId: string; collectorId: string }) => {
      const { error } = await supabase
        .from('collection_tasks')
        .update({ assignee_id: collectorId, status: 'in_progress' } as never)
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // Hủy gán nhân viên / Đưa về trạng thái chờ
  const unassignTask = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const { error } = await supabase
        .from('collection_tasks')
        .update({ assignee_id: null, status: 'pending' } as never)
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // Tạo công việc thu gom đột xuất cho 1 thiết bị (dùng lại việc đang mở nếu có)
  const createManualTask = useMutation({
    mutationFn: async ({ deviceId, collectorId }: { deviceId: string; collectorId?: string }) => {
      const { data: existing, error: findError } = await supabase
        .from('collection_tasks')
        .select('*, devices(name, area, code)')
        .eq('device_id', deviceId)
        .neq('status', 'done')
        .limit(1)
        .maybeSingle();
      if (findError) throw findError;
      if (existing) return existing as unknown as TaskWithDetails;

      const { data, error } = await supabase
        .from('collection_tasks')
        .insert({
          device_id: deviceId,
          assignee_id: collectorId ?? null,
          status: collectorId ? 'in_progress' : 'pending',
          priority: 'urgent',
          scheduled_date: toLocalDateString(),
        } as never)
        .select('*, devices(name, area, code)')
        .single();
      if (error) throw error;
      return data as unknown as TaskWithDetails;
    },
    onSuccess: invalidateAll,
  });

  // Phục vụ demo: mô phỏng làm đầy ngăn rác (≥ 80% thì trigger tự tạo việc thu gom)
  const simulateBinFill = useMutation({
    mutationFn: async ({ binId, fillLevel }: { binId: string; fillLevel: number }) => {
      const { error } = await supabase
        .from('bins')
        .update({ fill_level: fillLevel, updated_at: new Date().toISOString() } as never)
        .eq('id', binId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // Phục vụ demo: đặt lại tất cả ngăn của 1 thùng về 0%
  const resetDeviceBins = useMutation({
    mutationFn: async ({ deviceId }: { deviceId: string }) => {
      const { error } = await supabase
        .from('bins')
        .update({ fill_level: 0, updated_at: new Date().toISOString() } as never)
        .eq('device_id', deviceId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // Lên lịch ca trực trong ngày: mỗi thùng được chọn thành 1 việc giao sẵn cho nhân viên
  const createDailySchedule = useMutation({
    mutationFn: async ({
      scheduledDate,
      shift,
      collectorId,
      deviceIds,
      note,
    }: {
      scheduledDate: string;
      shift: TaskShift;
      collectorId: string;
      deviceIds: string[];
      note?: string;
    }) => {
      const rows = deviceIds.map((deviceId) => ({
        device_id: deviceId,
        assignee_id: collectorId,
        status: 'in_progress',
        priority: 'routine',
        scheduled_date: scheduledDate,
        shift,
        note: note?.trim() || null,
      }));
      const { data, error } = await supabase.from('collection_tasks').insert(rows as never).select();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  return {
    tasks,
    isTasksLoading,
    isTasksRefetching,
    refetchTasks,
    tasksError,
    collectors: collectors ?? [],
    isCollectorsLoading,
    refetchCollectors,
    assignTask,
    unassignTask,
    createManualTask,
    createDailySchedule,
    simulateBinFill,
    resetDeviceBins,
  };
}
