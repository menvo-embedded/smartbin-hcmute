import { useEffect, useRef } from 'react';
import { supabase } from './client';

/**
 * Lắng nghe Supabase Realtime: gọi onChange(tên bảng) mỗi khi có INSERT/UPDATE/
 * DELETE trên một trong các bảng (bảng phải nằm trong publication
 * supabase_realtime). Các thay đổi dồn dập được gộp lại trong debounceMs để
 * không tải lại liên tục.
 */
export function useTableChanges(
  channelName: string,
  tables: string[],
  onChange: (table: string) => void,
  debounceMs = 400,
) {
  // Giữ callback mới nhất mà không phải đăng ký lại kênh mỗi lần render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const tablesKey = tables.join(',');

  useEffect(() => {
    const pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase.channel(channelName);
    for (const table of tablesKey.split(',')) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        pending.add(table);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          pending.forEach((t) => onChangeRef.current(t));
          pending.clear();
        }, debounceMs);
      });
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [channelName, tablesKey, debounceMs]);
}
