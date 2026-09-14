import type { Role, WasteType } from '../constants/waste';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  points: number;
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
  created_at: string;
  completed_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] };
      devices: { Row: Device; Insert: Partial<Device>; Update: Partial<Device>; Relationships: [] };
      bins: { Row: Bin; Insert: Partial<Bin>; Update: Partial<Bin>; Relationships: [] };
      sort_events: { Row: SortEvent; Insert: Partial<SortEvent>; Update: Partial<SortEvent>; Relationships: [] };
      collection_tasks: { Row: CollectionTask; Insert: Partial<CollectionTask>; Update: Partial<CollectionTask>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
