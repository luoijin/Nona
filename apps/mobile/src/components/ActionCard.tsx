import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../config/theme';

type Props = { label: string; icon: string; onPress: () => void };

export function ActionCard({ label, icon, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.iconContainer}><Text style={styles.icon}>{icon}</Text></View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 112, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.card, borderWidth: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.sm },
  pressed: { backgroundColor: colors.primarySoft },
  iconContainer: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radii.round, height: 48, justifyContent: 'center', marginBottom: spacing.sm, width: 48 },
  icon: { color: colors.primary, fontSize: 26 },
  label: { color: colors.text, fontSize: typography.label, fontWeight: '700', textAlign: 'center' },
});
