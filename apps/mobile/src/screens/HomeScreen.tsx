import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ActionCard } from '../components/ActionCard';
import { BottomNavigation, type NavigationTab } from '../components/BottomNavigation';
import { SectionTitle } from '../components/SectionTitle';
import { APP_CONFIG } from '../config/app';
import { CONTENT } from '../config/content';
import { colors, radii, spacing, typography } from '../config/theme';
import { speak } from '../services/voice';
import { useSettingsStore } from '../store/settings';
import { useAuthStore } from '../store/auth';

export function HomeScreen() {
  const { language, voiceGuidance, highContrast, setLanguage, setVoiceGuidance, setHighContrast } = useSettingsStore();
  const signOut = useAuthStore((state) => state.signOut);
  const backendProfile = useAuthStore((state) => state.backendProfile);
  const copy = CONTENT[language];
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const backendError = useAuthStore((state) => state.backendError);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');

  const announce = (text: string) => {
    if (voiceGuidance) speak(text, language);
  };

  const openEmergencyDialer = () => {
    announce(copy.emergencyDescription);
    if (APP_CONFIG.emergency.phoneNumber) {
      void Linking.openURL(`${APP_CONFIG.emergency.phoneUrlPrefix}${APP_CONFIG.emergency.phoneNumber}`);
    }
  };

  const requestLogout = () => {
    Alert.alert(copy.logoutConfirmTitle, copy.logoutConfirmMessage, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.logout,
        style: 'destructive',
        onPress: () => {
          setLoggingOut(true);
          setLogoutError(null);
          void signOut().catch((error: unknown) => {
            setLoggingOut(false);
            setLogoutError(error instanceof Error ? error.message : 'Unable to log out');
          });
        },
      },
    ]);
  };

  const selectTab = (tab: NavigationTab) => {
    setActiveTab(tab);
    if (tab === 'qr') {
      setSelectedAction(copy.navQr);
    }
  };

  const renderTabContent = () => {
    if (activeTab === 'home') {
      return (
        <>
          <View style={styles.protectedBanner}>
            <Text style={styles.shield}>✓</Text>
            <View style={styles.bannerCopy}><Text style={styles.bannerTitle}>{copy.protected}</Text><Text style={styles.bannerSubtitle}>{backendProfile?.email || copy.sampleTransaction}</Text></View>
            <Pressable accessibilityLabel={copy.speak} onPress={() => announce(`${copy.protected}. ${copy.subtitle}`)}><Text style={styles.speaker}>◖</Text></Pressable>
          </View>
          {!!backendError && <View style={styles.backendWarning}><Text style={styles.backendWarningTitle}>{copy.backendConnectionTitle}</Text><Text style={styles.backendWarningText}>{backendError}</Text></View>}
          <SectionTitle>{copy.focus}</SectionTitle>
          <View style={styles.focusCard}><Text style={styles.focusTitle}>{copy.sampleTransaction}</Text><Text style={styles.focusText}>{copy.noActivity}</Text></View>
          <SectionTitle>{copy.today}</SectionTitle>
          <View style={styles.actionsRow}>
            <ActionCard label={copy.balance} icon="₱" onPress={() => { setSelectedAction(copy.balance); announce(copy.balance); }} />
            <ActionCard label={copy.pay} icon="↗" onPress={() => { setSelectedAction(copy.pay); announce(copy.pay); }} />
            <ActionCard label={copy.load} icon="▣" onPress={() => { setSelectedAction(copy.load); announce(copy.load); }} />
          </View>
          {selectedAction && <View style={styles.feedback}><Text style={styles.feedbackText}>{selectedAction}</Text><Text style={styles.feedbackHint}>{copy.sampleTransaction}</Text></View>}
          <SectionTitle>{copy.recent}</SectionTitle>
          <View style={styles.emptyCard}><Text style={styles.emptyIcon}>◌</Text><Text style={styles.emptyTitle}>{copy.noActivity}</Text><Text style={styles.emptyText}>{copy.sampleTransaction}</Text></View>
          <Pressable accessibilityRole="button" onPress={openEmergencyDialer} style={styles.emergency}>
            <Text style={styles.emergencyIcon}>!</Text><View style={styles.emergencyCopy}><Text style={styles.emergencyTitle}>{copy.emergency}</Text><Text style={styles.emergencyDescription}>{copy.emergencyDescription}</Text></View><Text style={styles.chevron}>›</Text>
          </Pressable>
        </>
      );
    }

    if (activeTab === 'profile') {
      return (
        <>
          <TabCard title={copy.profileTitle} description={`${copy.profileDescription} ${backendProfile?.email || ''}`} icon="●" />
          <View style={styles.settingsPanel}>
            <Text style={styles.settingsTitle}>{copy.settings}</Text>
            <SettingRow label={copy.voiceGuidance} value={voiceGuidance} onChange={setVoiceGuidance} />
            <SettingRow label={copy.highContrast} value={highContrast} onChange={setHighContrast} />
            <Text style={styles.languageLabel}>{copy.language}</Text>
            <View style={styles.languageRow}>{APP_CONFIG.supportedLanguages.map((item) => <Pressable key={item} onPress={() => setLanguage(item)} style={[styles.languageButton, language === item && styles.languageSelected]}><Text style={[styles.languageText, language === item && styles.languageSelectedText]}>{item.toUpperCase()}</Text></Pressable>)}</View>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: loggingOut }} disabled={loggingOut} onPress={requestLogout} style={[styles.logoutButton, loggingOut && styles.disabled]}><Text style={styles.logoutText}>{loggingOut ? '...' : copy.logout}</Text></Pressable>
            {!!logoutError && <Text accessibilityRole="alert" style={styles.logoutError}>{logoutError}</Text>}
          </View>
        </>
      );
    }

    if (activeTab === 'inbox') {
      return <TabCard title={copy.inboxTitle} description={copy.inboxDescription} message={copy.inboxEmpty} icon="✉" />;
    }

    if (activeTab === 'qr') {
      return (
        <View style={styles.tabStack}>
          <TabCard title={copy.qrTitle} description={copy.qrDescription} icon="▦" />
          <Pressable style={styles.primaryButton} onPress={() => setSelectedAction(copy.scanQr)}><Text style={styles.primaryButtonText}>{copy.scanQr}</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => setSelectedAction(copy.showQr)}><Text style={styles.secondaryButtonText}>{copy.showQr}</Text></Pressable>
        </View>
      );
    }

    return <TabCard title={copy.transactionsTitle} description={copy.transactionsDescription} message={copy.transactionsEmpty} icon="◷" />;
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} accessibilityLabel={APP_CONFIG.name}>
      <View style={styles.header}>
        <View>
          <Text style={styles.overline}>{copy.today.toUpperCase()}</Text>
          <Text style={styles.greeting}>{copy.greeting}, {backendProfile?.fullName || APP_CONFIG.user.displayName}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>
      </View>

      {renderTabContent()}

      </ScrollView>
      <BottomNavigation
        activeTab={activeTab}
        labels={{
          home: copy.navHome,
          inbox: copy.navInbox,
          qr: copy.navQr,
          transactions: copy.navTransactions,
          profile: copy.navProfile,
        }}
        onSelect={selectTab}
      />
    </View>
  );
}

function SettingRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.settingRow}><Text style={styles.settingText}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primarySoft }} thumbColor={value ? colors.primary : colors.textSubtle} /></View>;
}

function TabCard({ title, description, message, icon }: { title: string; description: string; message?: string; icon: string }) {
  return (
    <View style={styles.tabCard}>
      <View style={styles.tabIconContainer}><Text style={styles.tabIcon}>{icon}</Text></View>
      <Text style={styles.tabTitle}>{title}</Text>
      <Text style={styles.tabDescription}>{description}</Text>
      {message && <Text style={styles.tabMessage}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: spacing.sm },
  overline: { color: colors.textSubtle, fontSize: typography.caption, fontWeight: '800', letterSpacing: 1.4 },
  greeting: { color: colors.text, fontSize: typography.title, fontWeight: '800', marginTop: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: typography.body, marginTop: spacing.xs },
  protectedBanner: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radii.card, flexDirection: 'row', padding: spacing.md },
  shield: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.round, color: colors.white, display: 'flex', fontSize: 18, height: 34, paddingTop: 5, textAlign: 'center', width: 34 },
  bannerCopy: { flex: 1, marginLeft: spacing.sm },
  bannerTitle: { color: colors.primaryDark, fontSize: typography.label, fontWeight: '800' },
  bannerSubtitle: { color: colors.primary, fontSize: typography.caption, marginTop: 3 },
  speaker: { color: colors.primary, fontSize: 25 },
  focusCard: { backgroundColor: colors.primary, borderRadius: radii.card, padding: spacing.lg },
  focusTitle: { color: colors.white, fontSize: typography.heading, fontWeight: '800' },
  focusText: { color: colors.primarySoft, fontSize: typography.body, marginTop: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  feedback: { backgroundColor: colors.warning, borderRadius: radii.control, padding: spacing.md },
  feedbackText: { color: colors.warningText, fontSize: typography.body, fontWeight: '700' },
  feedbackHint: { color: colors.warningText, fontSize: typography.caption, marginTop: 3 },
  emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.card, borderWidth: 1, padding: spacing.xl },
  emptyIcon: { color: colors.textSubtle, fontSize: 36 },
  emptyTitle: { color: colors.text, fontSize: typography.body, fontWeight: '700', marginTop: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: typography.caption, marginTop: spacing.xs },
  emergency: { alignItems: 'center', backgroundColor: colors.emergencySurface, borderColor: colors.emergencyBorder, borderRadius: radii.card, borderWidth: 1, flexDirection: 'row', padding: spacing.md },
  emergencyIcon: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.round, color: colors.white, fontSize: 18, fontWeight: '800', height: 32, paddingTop: 5, textAlign: 'center', width: 32 },
  emergencyCopy: { flex: 1, marginLeft: spacing.sm },
  emergencyTitle: { color: colors.danger, fontSize: typography.body, fontWeight: '800' },
  emergencyDescription: { color: colors.emergencyText, fontSize: typography.caption, marginTop: 3 },
  chevron: { color: colors.danger, fontSize: 28 },
  settingsPanel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.card, borderWidth: 1, padding: spacing.md },
  settingsTitle: { color: colors.text, fontSize: typography.heading, fontWeight: '800', marginBottom: spacing.sm },
  settingRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  settingText: { color: colors.text, fontSize: typography.body },
  languageLabel: { color: colors.textMuted, fontSize: typography.label, marginTop: spacing.sm },
  languageRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  languageButton: { borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  languageSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  languageText: { color: colors.textMuted, fontSize: typography.caption, fontWeight: '800' },
  languageSelectedText: { color: colors.white },
  logoutButton: { borderColor: colors.danger, borderRadius: radii.control, borderWidth: 1, marginTop: spacing.lg, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  logoutText: { color: colors.danger, fontSize: typography.label, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  logoutError: { color: colors.danger, fontSize: typography.caption, marginTop: spacing.sm },
  backendWarning: { backgroundColor: colors.warning, borderColor: colors.warningText, borderRadius: radii.control, borderWidth: 1, padding: spacing.md },
  backendWarningTitle: { color: colors.warningText, fontSize: typography.label, fontWeight: '800' },
  backendWarningText: { color: colors.warningText, fontSize: typography.caption, marginTop: spacing.xs },
  tabStack: { gap: spacing.md },
  tabCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.card, borderWidth: 1, padding: spacing.xl },
  tabIconContainer: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radii.round, height: 68, justifyContent: 'center', width: 68 },
  tabIcon: { color: colors.primary, fontSize: 34, fontWeight: '700' },
  tabTitle: { color: colors.text, fontSize: typography.heading, fontWeight: '800', marginTop: spacing.md, textAlign: 'center' },
  tabDescription: { color: colors.textMuted, fontSize: typography.body, lineHeight: 24, marginTop: spacing.sm, textAlign: 'center' },
  tabMessage: { color: colors.text, fontSize: typography.body, fontWeight: '700', marginTop: spacing.lg, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.control, minHeight: 52, justifyContent: 'center', padding: spacing.md },
  primaryButtonText: { color: colors.white, fontSize: typography.button, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', borderColor: colors.primary, borderRadius: radii.control, borderWidth: 1, minHeight: 52, justifyContent: 'center', padding: spacing.md },
  secondaryButtonText: { color: colors.primaryDark, fontSize: typography.button, fontWeight: '800' },
});
