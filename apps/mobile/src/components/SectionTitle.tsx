import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../config/theme';

export function SectionTitle({ children }: { children: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{children}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: typography.heading, fontWeight: '700' },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
});
