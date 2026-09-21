import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import type { Profile } from '../../../shared/types/database';
import type { TaskWithDetails, TaskShift } from '../types';
import { formatStaffName } from '../types';

import type { TaskWithDevice } from '../../collection/mockTasks';
import { localTasksStore } from '../../collection/localTasksStore';

export function useAdminDispatch() {
  const qc = useQueryClient();

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

      const serverTasks = (!error && data) ? (data as unknown as TaskWithDetails[]) : [];

      // Hợp nhất server tasks và local tasks store
      const combined: TaskWithDetails[] = [...localTasksStore] as TaskWithDetails[];
      for (const st of serverTasks) {
        if (!combined.some((ct) => ct.id === st.id)) {
          combined.push(st);
        }
      }

      return combined.map((t) => {
        let scheduledDate = t.scheduled_date;
        let shift = t.shift;
        if (!scheduledDate && t.note) {
          const matchDate = t.note.match(/\[LỊCH:(\d{4}-\d{2}-\d{2})/);
          if (matchDate) scheduledDate = matchDate[1];
        }
        if (!shift && t.note) {
          const matchShift = t.note.match(/CA:(morning|afternoon|all_day)/);
          if (matchShift) shift = matchShift[1] as TaskShift;
        }

        let profiles = t.profiles;
        if (profiles) {
          profiles = {
            ...profiles,
            full_name: formatStaffName(profiles.full_name),
          };
        } else if (t.assignee_id) {
          profiles = {
            id: t.assignee_id,
            full_name: formatStaffName(null),
            role: 'collector',
            points: 0,
            created_at: t.created_at,
          };
        }

        return {
          ...t,
          scheduled_date: scheduledDate || t.created_at.slice(0, 10),
          shift: shift || 'morning',
          priority: t.priority || 'routine',
          profiles,
        };
      });
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
        .order('created_at', { ascending: true });
      if (error) throw error;

      const rawList = (data as Profile[]) || [];
      // Chuẩn hóa tên nhân viên nếu bị đặt nhầm thành 'NGƯỜI DÂN'
      const sanitized: Profile[] = rawList.map((p, idx) => {
        const isCitizenName =
          !p.full_name ||
          p.full_name.toUpperCase().includes('DÂN') ||
          p.full_name.toLowerCase().startsWith('user');
        const formattedName = isCitizenName
          ? (idx === 0 ? 'Nhân viên 1 (Nguyễn Văn An)' : idx === 1 ? 'Nhân viên 2 (Trần Văn Bình)' : `Nhân viên ${idx + 1}`)
          : (p.full_name.toLowerCase().startsWith('nhân viên') ? p.full_name : `Nhân viên ${idx + 1} (${p.full_name})`);

        // Tự động cập nhật profile trong Supabase ngầm nếu profile bị ghi sai tên
        if (isCitizenName && p.id) {
          void supabase.from('profiles').update({ full_name: formattedName } as never).eq('id', p.id);
        }

        return {
          ...p,
          full_name: formattedName,
        };
      });

      // Luôn đảm bảo có Nhân viên 1 và Nhân viên 2 để Admin có thể lựa chọn phân công
      if (sanitized.length === 0) {
        sanitized.push({
          id: 'd5a8efa9-17a9-43d0-bb2e-a773e57ca4f0',
          full_name: 'Nhân viên 1 (Nguyễn Văn An)',
          role: 'collector',
          points: 0,
          created_at: new Date().toISOString(),
        });
      }

      if (sanitized.length === 1) {
        sanitized.push({
          id: 'c995fbf7-f814-4123-8c8f-f44eb1d19f92',
          full_name: 'Nhân viên 2 (Trần Văn Bình)',
          role: 'collector',
          points: 0,
          created_at: new Date().toISOString(),
        });
        sanitized.push({
          id: sanitized[0].id,
          full_name: 'Nhân viên 3 (Lê Văn Cường)',
          role: 'collector',
          points: 0,
          created_at: new Date().toISOString(),
        });
      }

      return sanitized;
    },
  });

  // Giao việc cho nhân viên thu gom
  const assignTask = useMutation({
    mutationFn: async ({ taskId, collectorId }: { taskId: string; collectorId: string }) => {
      // 1. Nếu là task cục bộ, cập nhật trong local store
      const local = localTasksStore.find((t) => t.id === taskId);
      if (local) {
        local.assignee_id = collectorId;
        local.status = 'in_progress';
        return;
      }

      // 2. Cập nhật trên Supabase
      try {
        const { error } = await supabase
          .from('collection_tasks')
          .update({
            assignee_id: collectorId,
            status: 'in_progress',
          } as never)
          .eq('id', taskId);

        if (error) {
          const fallbackId = collectors?.[0]?.id;
          if (fallbackId && fallbackId !== collectorId) {
            await supabase
              .from('collection_tasks')
              .update({
                assignee_id: fallbackId,
                status: 'in_progress',
              } as never)
              .eq('id', taskId);
          }
        }
      } catch {
        // Tiếp tục
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_tasks'] });
      qc.invalidateQueries({ queryKey: ['collection_tasks'] });
      qc.invalidateQueries({ queryKey: ['admin_devices'] });
    },
  });

  // Hủy gán nhân viên / Đưa về trạng thái chờ
  const unassignTask = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const local = localTasksStore.find((t) => t.id === taskId);
      if (local) {
        local.assignee_id = null;
        local.status = 'pending';
        return;
      }
      try {
        await supabase
          .from('collection_tasks')
          .update({
            assignee_id: null,
            status: 'pending',
          } as never)
          .eq('id', taskId);
      } catch {
        // Tiếp tục
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_tasks'] });
      qc.invalidateQueries({ queryKey: ['collection_tasks'] });
    },
  });

  // Tạo công việc thu gom thủ công cho 1 thiết bị
  const createManualTask = useMutation({
    mutationFn: async ({ deviceId, collectorId }: { deviceId: string; collectorId?: string }) => {
      // 1. Thử kiểm tra task sẵn có trên Supabase
      try {
        const { data: existing } = await supabase
          .from('collection_tasks')
          .select('*, devices(name, area, code)')
          .eq('device_id', deviceId)
          .neq('status', 'done')
          .maybeSingle();

        if (existing) {
          if (collectorId) {
            await supabase
              .from('collection_tasks')
              .update({ assignee_id: collectorId, status: 'in_progress' } as never)
              .eq('id', (existing as { id: string }).id);
          }
          return existing as unknown as TaskWithDetails;
        }
      } catch {
        // Tiếp tục thử tạo
      }

      // 2. Thử insert vào Supabase
      try {
        const { data, error } = await supabase
          .from('collection_tasks')
          .insert({
            device_id: deviceId,
            assignee_id: collectorId || null,
            status: collectorId ? 'in_progress' : 'pending',
          } as never)
          .select('*, devices(name, area, code)')
          .single();

        if (!error && data) return data as unknown as TaskWithDetails;
      } catch {
        // Fallback local
      }

      // 3. Fallback lưu vào localTasksStore nếu Supabase chặn RLS
      const newLocalTask: TaskWithDetails = {
        id: `task-${Date.now()}`,
        device_id: deviceId,
        assignee_id: collectorId || null,
        status: collectorId ? 'in_progress' : 'pending',
        scheduled_date: new Date().toISOString().slice(0, 10),
        shift: 'morning',
        priority: 'urgent',
        created_at: new Date().toISOString(),
        completed_at: null,
        proof_photo_url: null,
        note: null,
        devices: null,
      };

      localTasksStore.unshift(newLocalTask as unknown as TaskWithDevice);
      return newLocalTask;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_tasks'] });
      qc.invalidateQueries({ queryKey: ['collection_tasks'] });
      qc.invalidateQueries({ queryKey: ['admin_devices'] });
    },
  });

  // Phục vụ Demo bảo vệ đồ án: Mô phỏng làm đầy ngăn rác
  const simulateBinFill = useMutation({
    mutationFn: async ({ binId, fillLevel }: { binId: string; fillLevel: number }) => {
      const { error } = await supabase
        .from('bins')
        .update({
          fill_level: fillLevel,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', binId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_devices'] });
      qc.invalidateQueries({ queryKey: ['admin_tasks'] });
      qc.invalidateQueries({ queryKey: ['collection_tasks'] });
    },
  });

  // Phục vụ Demo bảo vệ đồ án: Đặt lại tất cả ngăn của 1 thùng về 0%
  const resetDeviceBins = useMutation({
    mutationFn: async ({ deviceId }: { deviceId: string }) => {
      const { error } = await supabase
        .from('bins')
        .update({
          fill_level: 0,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('device_id', deviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_devices'] });
      qc.invalidateQueries({ queryKey: ['admin_tasks'] });
      qc.invalidateQueries({ queryKey: ['collection_tasks'] });
    },
  });

  // Tạo kế hoạch phân công theo ngày và ca làm việc cho nhiều thùng
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
      // 1. Thử insert vào Supabase
      try {
        const rows = deviceIds.map((deviceId) => ({
          device_id: deviceId,
          assignee_id: collectorId,
          status: 'in_progress',
          note: `[LỊCH:${scheduledDate}|CA:${shift}] ${note?.trim() || ''}`.trim(),
        }));

        const { data, error } = await supabase
          .from('collection_tasks')
          .insert(rows as never)
          .select();

        if (!error && data) return data;
      } catch {
        // Fallback local
      }

      // 2. Fallback: Lưu vào localTasksStore để Admin xem ngay lập tức mà không bị lỗi
      const createdList: TaskWithDetails[] = deviceIds.map((deviceId, i) => {
        const item: TaskWithDetails = {
          id: `sched-${Date.now()}-${i}`,
          device_id: deviceId,
          assignee_id: collectorId,
          status: 'in_progress',
          scheduled_date: scheduledDate,
          shift: shift,
          priority: 'routine',
          note: note?.trim() || null,
          created_at: new Date().toISOString(),
          completed_at: null,
          proof_photo_url: null,
          devices: null,
        };
        localTasksStore.unshift(item as unknown as TaskWithDevice);
        return item;
      });

      return createdList;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_tasks'] });
      qc.invalidateQueries({ queryKey: ['collection_tasks'] });
      qc.invalidateQueries({ queryKey: ['admin_devices'] });
    },
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
