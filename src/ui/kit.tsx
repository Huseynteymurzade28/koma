import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, font, space } from '@/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline' | 'plain';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  danger?: boolean;
};

export function Button({ label, onPress, variant = 'outline', disabled, style, danger }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        s.btn,
        variant === 'solid' && s.solid,
        variant === 'outline' && s.outline,
        variant === 'plain' && s.plain,
        pressed && { opacity: 0.55 },
        disabled && { opacity: 0.35 },
        style,
      ]}
    >
      <Text
        style={[
          s.btnText,
          variant === 'solid' && { color: color.sheet },
          danger && { color: color.danger },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type SegmentedProps<T extends string | number> = {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
};

export function Segmented<T extends string | number>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={s.seg}>
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <Pressable
            key={String(o.id)}
            onPress={() => onChange(o.id)}
            style={[s.segItem, i > 0 && s.segDivider, on && s.segOn]}
          >
            <Text style={[s.segText, on && { color: color.sheet }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.row, style]}>{children}</View>;
}

const s = StyleSheet.create({
  btn: {
    height: 40,
    paddingHorizontal: space(4),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  solid: { backgroundColor: color.ink },
  outline: { borderWidth: 1, borderColor: color.ink },
  plain: { paddingHorizontal: space(2) },
  btnText: { fontFamily: font.medium, fontSize: 14, color: color.ink, letterSpacing: 0.2 },

  seg: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: color.ink,
    borderRadius: 2,
    overflow: 'hidden',
  },
  segItem: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
  segDivider: { borderLeftWidth: 1, borderLeftColor: color.ink },
  segOn: { backgroundColor: color.ink },
  segText: { fontFamily: font.medium, fontSize: 13, color: color.ink },

  field: { gap: space(1.5) },
  label: {
    fontFamily: font.medium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: color.muted,
  },
  row: { flexDirection: 'row', gap: space(2), alignItems: 'center' },
});
