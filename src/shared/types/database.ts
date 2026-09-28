import type { Role, WasteType } from '../constants/waste';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  points: number;
  /** Nhân viên đang trực — chỉ người đang trực mới được hệ thống tự giao việc. */
  on_duty?: boolean;
  created_at: string;
}

export interface Device {
  id: string;
  code: string;              // mã in trên QR dán ở thùng
  name: string;
  area: string;
  latitude: number | null;
  longitude: number | null;
  is_online: boolean;
  last_seen_at: string | null;
  /** Thiết bị riêng của 1 hộ gia đình (profiles.id) — null nghĩa là thiết bị công cộng. */
  owner_id: string | null;
}

export interface Bin {
  id: string;
  device_id: string;
  waste_type: WasteType;
  fill_level: number;        // 0..1
  updated_at: string;
}

export interface SortEvent {
  id: string;
  device_id: string;
  user_id: string | null;
  waste_type: WasteType;
  source: 'manual' | 'ai';   // phân loại tay hay do mô hình nhận diện
  confidence: number | null;
  created_at: string;
}

export interface CollectionTask {
  id: string;
  device_id: string;
  assignee_id: string | null;
  status: 'pending' | 'in_progress' | 'done';
  proof_photo_url: string | null;
  note: string | null;
  scheduled_date?: string | null;
  shift?: 'morning' | 'afternoon' | 'all_day' | null;
  priority?: 'routine' | 'urgent' | null;
  created_at: string;
  completed_at: string | null;
  /** Nhân viên chấm khi thu gom thùng của hộ gia đình. */
  sorting_quality?: 'good' | 'mixed' | null;
  /** Ai tạo việc: quản lý, hệ thống khi thùng đầy, hay hệ thống dự báo trước. */
  origin?: 'manual' | 'auto_full' | 'auto_forecast';
  /** Hệ thống tự chọn nhân viên (không phải quản lý giao tay). */
  auto_assigned?: boolean;
  escalated_at?: string | null;
}

/** Thông báo do trigger/vòng tự động trên server sinh ra. */
export interface AppNotification {
  id: string;
  /** null = gửi cho mọi quản lý (nhật ký tự động). */
  recipient_id: string | null;
  kind: string;
  title: string;
  body: string;
  device_id: string | null;
  task_id: string | null;
  created_at: string;
  read_at: string | null;
}

export interface AutomationSettings {
  id: number;
  auto_dispatch: boolean;
  predictive_schedule: boolean;
  escalate_after_min: number;
  offline_after_min: number;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] };
      devices: { Row: Device; Insert: Partial<Device>; Update: Partial<Device>; Relationships: [] };
      bins: { Row: Bin; Insert: Partial<Bin>; Update: Partial<Bin>; Relationships: [] };
      sort_events: { Row: SortEvent; Insert: Partial<SortEvent>; Update: Partial<SortEvent>; Relationships: [] };
      collection_tasks: { Row: CollectionTask; Insert: Partial<CollectionTask>; Update: Partial<CollectionTask>; Relationships: [] };
      notifications: { Row: AppNotification; Insert: Partial<AppNotification>; Update: Partial<AppNotification>; Relationships: [] };
      automation_settings: { Row: AutomationSettings; Insert: Partial<AutomationSettings>; Update: Partial<AutomationSettings>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      device_heartbeat: { Args: { p_device_id: string }; Returns: undefined };
      run_automation: {
        Args: Record<string, never>;
        Returns: { offline: number; escalated: number; planned: number };
      };
    };
  };
}
