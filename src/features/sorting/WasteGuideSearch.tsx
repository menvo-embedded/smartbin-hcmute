import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WASTE_LABELS, WASTE_ICONS, type WasteType } from '../../shared/constants/waste';
import { colors } from '../../theme/colors';
import { Card } from '../../shared/ui';
import { searchGuide } from './wasteGuide';

interface Props {
  /** Có thì mỗi kết quả kèm nút "Bỏ ngay" vào đúng ngăn. */
  onPick?: (type: WasteType) => void;
  disabled?: boolean;
  /** Gọi khi bắt đầu gõ — màn hình cuộn ô tra cứu lên để bàn phím không che kết quả. */
  onFocus?: () => void;
}

/** Ô tra cứu "rác này bỏ ngăn nào?" — gõ có dấu hay không dấu đều được. */
export function WasteGuideSearch({ onPick, disabled, onFocus }: Props) {
  const [query, setQuery] = useState('');
  const results = searchGuide(query);
  const searched = query.trim().length > 0;

  return (
    <Card style={styles.card}>
      <View style={styles.inputRow}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rác này bỏ ngăn nào? VD: vỏ chuối, hộp sữa, pin..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCorrect={false}
          onFocus={onFocus}
        />
        {searched && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {searched && results.length === 0 && (
        <Text style={styles.empty}>
          Chưa có trong danh mục. Nếu không chắc chắn, hãy bỏ vào ngăn Vô cơ.
        </Text>
      )}

      {results.map((r) =>
        r.kind === 'hazard' ? (
          <View key={`h-${r.name}`} style={[styles.result, styles.hazard]}>
            <Ionicons name="warning" size={20} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{r.name} — rác nguy hại</Text>
              <Text style={styles.tip}>Không bỏ vào thùng. {r.tip}.</Text>
            </View>
          </View>
        ) : (
          <View key={`i-${r.item.name}`} style={styles.result}>
            <Ionicons name={WASTE_ICONS[r.item.type] as never} size={20} color={colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {r.item.name} › <Text style={styles.type}>{WASTE_LABELS[r.item.type]}</Text>
              </Text>
              {r.item.tip && <Text style={styles.tip}>{r.item.tip}</Text>}
            </View>
            {onPick && (
              <Pressable
                onPress={() => {
                  onPick(r.item.type);
                  setQuery('');
                }}
                disabled={disabled}
                style={[styles.pickBtn, disabled && { opacity: 0.5 }]}
              >
                <Text style={styles.pickText}>Bỏ ngay</Text>
              </Pressable>
            )}
          </View>
        ),
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 4,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  hazard: {
    backgroundColor: colors.dangerBg,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  type: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  tip: {
    fontSize: 12,
    color: colors.textMuted,
  },
  pickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  pickText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
