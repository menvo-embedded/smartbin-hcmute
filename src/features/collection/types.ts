import type { CollectionTask, Profile } from '../../shared/types/database';

/** Công việc thu gom kèm thông tin thùng rác (và người phụ trách nếu có). */
export type TaskWithDevice = CollectionTask & {
  devices: {
    name: string;
    area: string;
    code?: string | null;
    /** Có giá trị = thùng riêng của một hộ gia đình. */
    owner_id?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  profiles?: Profile | null;
};
