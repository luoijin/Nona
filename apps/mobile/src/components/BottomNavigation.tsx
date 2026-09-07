import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../config/theme';

export type NavigationTab = 'home' | 'inbox' | 'qr' | 'transactions' | 'profile';

type NavigationItem = {
  id: NavigationTab;
  label: string;
  icon: string;
};

type BottomNavigationProps = {
  activeTab: NavigationTab;
  labels: Record<NavigationTab, string>;
  onSelect: (tab: NavigationTab) => void;
};

export function BottomNavigation({ activeTab, labels, onSelect }: BottomNavigationProps) {
  const items: NavigationItem[] = [
    { id: 'home', label: labels.home, icon: '⌂' },
    { id: 'inbox', label: labels.inbox, icon: '✉' },
    { id: 'qr', label: labels.qr, icon: '▦' },
    { id: 'transactions', label: labels.transactions, icon: '◷' },
    { id: 'profile', label: labels.profile, icon: '●' },
  ];

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {items.map((item) => {
        const selected = activeTab === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [
              styles.item,
              item.id === 'qr' && styles.qrItem,
              selected && styles.itemSelected,
              pressed && styles.itemPressed,
            ]}
          >
            <View style={[
              styles.iconContainer,
              item.id === 'qr' && styles.qrIconContainer,
              selected && styles.iconContainerSelected,
            ]}>
              <Text style={[
                styles.icon,
                item.id === 'qr' && styles.qrIcon,
                selected && styles.selectedText,
                selected && item.id === 'qr' && styles.qrIconSelected,
              ]}>{item.icon}</Text>
            </View>
            <Text style={[styles.label, selected && styles.selectedText]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingTop: 2,
  },
  item: {
    alignItems: 'center',
    borderRadius: radii.control,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  qrItem: {
    marginTop: 0,
  },
  itemSelected: {
    backgroundColor: colors.surface,
  },
  itemPressed: {
    opacity: 0.7,
  },
  icon: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  qrIcon: {
    color: colors.primary,
    fontSize: 18,
  },
  qrIconSelected: {
    color: colors.primaryDark,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: radii.round,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  qrIconContainer: {
    backgroundColor: colors.primarySoft,
    height: 28,
    width: 28,
  },
  iconContainerSelected: {
    backgroundColor: colors.white,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
    lineHeight: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  selectedText: {
    color: colors.primary,
  },
});
