import { useEffect, useState } from 'react';
import { Image, useWindowDimensions } from 'react-native';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NONA_CONFIG } from '@nona/shared';
import { CONTENT } from '../config/content';
import { colors, radii, spacing, typography } from '../config/theme';
import { supabase } from '../services/supabase';
import { completeRegistration, getProfile, loginDevelopment, requestDevelopmentOtp, verifyDevelopmentOtp, verifyMpin } from '../services/api';
import type { DevelopmentSession } from '../services/api';
import { APP_CONFIG } from '../config/app';
import { useAuthStore } from '../store/auth';
import { useSettingsStore } from '../store/settings';

type Step = 'phone' | 'otp' | 'mpin' | 'profile';

export function AuthScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const language = useSettingsStore((state) => state.language);
  const copy = CONTENT[language];
  const session = useAuthStore((state) => state.session);
  const setBackendProfile = useAuthStore((state) => state.setBackendProfile);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [mpin, setMpinValue] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [fullName, setFullName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [developmentOtp, setDevelopmentOtp] = useState<{ code: string; expiresAt: number } | null>(null);
  const logoSize = Math.min(screenWidth * 0.55, 280);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const fail = (text: string) => { setError(text); setMessage(''); };
  const resetMessages = () => { setError(''); setMessage(''); };
  const getPhoneNumber = () => `+63${phone.replace(/\D/g, '').slice(0, 10)}`;
  const formatPhoneDigits = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    return digits.replace(/^(\d{3})(\d{0,3})(\d{0,4})$/, (_match, first: string, second: string, third: string) =>
      [first, second, third].filter(Boolean).join(' '),
    );
  };

  const goBack = () => {
    resetMessages();
    if (step === 'profile') {
      setStep('mpin');
    } else if (step === 'mpin') {
      setStep(mode === 'signup' ? 'otp' : 'phone');
    } else if (step === 'otp') {
      setStep('phone');
      setDevelopmentOtp(null);
    }
  };

  const requestOtp = async () => {
    resetMessages();
    if (mode === 'login' && APP_CONFIG.developmentOtpEnabled) {
      setStep('mpin');
      return;
    }
    const normalizedPhone = getPhoneNumber();
    if (!phone) return fail(copy.requiredField);
    if (!new RegExp(NONA_CONFIG.auth.philippineMobilePattern).test(normalizedPhone)) {
      return fail(copy.philippineMobileInvalid);
    }
    setSubmitting(true);
    try {
      if (APP_CONFIG.developmentOtpEnabled) {
        const result = await requestDevelopmentOtp(normalizedPhone);
        setDevelopmentOtp(result);
      } else {
        const result = await supabase.auth.signInWithOtp({ phone: normalizedPhone, options: { shouldCreateUser: mode === 'signup' } });
        if (result.error) throw result.error;
      }
      setStep('otp');
      setCooldown(NONA_CONFIG.auth.otpResendCooldownSeconds);
      setMessage(copy.confirmationSent);
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : NONA_CONFIG.auth.backendConnectionError);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    resetMessages();
    const normalizedPhone = getPhoneNumber();
    if (!new RegExp(NONA_CONFIG.auth.philippineMobilePattern).test(normalizedPhone)) return fail(copy.philippineMobileInvalid);
    if (!new RegExp(`^\\d{${NONA_CONFIG.auth.otpLength}}$`).test(otp)) return fail(`${copy.otp} must be ${NONA_CONFIG.auth.otpLength} digits.`);
    setSubmitting(true);
    try {
      if (APP_CONFIG.developmentOtpEnabled) {
        const result = await verifyDevelopmentOtp(normalizedPhone, otp);
        const devSession: DevelopmentSession = { access_token: result.accessToken, user: { id: result.userId, phone: result.phone } };
        useAuthStore.getState().setSession(devSession);
      } else {
        const result = await supabase.auth.verifyOtp({ phone: normalizedPhone, token: otp, type: 'sms' });
        if (result.error || !result.data.session) throw result.error ?? new Error('Unable to verify the code.');
      }
      setStep('mpin');
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : 'Unable to verify the code.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveMpin = async () => {
    resetMessages();
    if (!/^\d{4}$/.test(mpin)) return fail(`${copy.mpin} must be 4 digits.`);
    if (mode === 'signup' && mpin !== confirmMpin) return fail(copy.passwordMismatch);
    setSubmitting(true);
    try {
      if (mode === 'login' && APP_CONFIG.developmentOtpEnabled) {
        const result = await loginDevelopment(getPhoneNumber(), mpin);
        const devSession: DevelopmentSession = { access_token: result.accessToken, user: { id: result.userId, phone: result.phone } };
        useAuthStore.getState().setSession(devSession);
        setBackendProfile(await getProfile(result.accessToken));
        setMessage(copy.accountReady);
        return;
      }
      if (!session) return fail(NONA_CONFIG.auth.backendConnectionError);
      const profile = mode === 'signup'
        ? { id: session.user.id, phone: getPhoneNumber(), preferredLanguage: language, mpinSet: false }
        : await verifyMpin(session.access_token, mpin).then(() => getProfile(session.access_token));
      if (mode === 'signup') {
        setStep('profile');
      } else {
        setBackendProfile(profile);
        setMessage(copy.accountReady);
      }
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : NONA_CONFIG.auth.backendConnectionError);
    } finally {
      setSubmitting(false);
    }
  };

  const saveProfile = async () => {
    resetMessages();
    if (!fullName.trim() || !emergencyContact.trim()) return fail(copy.requiredField);
    if (!session) return fail(NONA_CONFIG.auth.backendConnectionError);
    setSubmitting(true);
    try {
      const profile = await completeRegistration(session.access_token, { fullName: fullName.trim(), emergencyContact: emergencyContact.trim(), preferredLanguage: language, phone: getPhoneNumber(), mpin });
      setBackendProfile(profile);
      setMessage(copy.accountReady);
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : NONA_CONFIG.auth.backendConnectionError);
    } finally {
      setSubmitting(false);
    }
  };

  const input = (label: string, value: string, onChangeText: (value: string) => void, options?: { keyboardType?: 'default' | 'phone-pad' | 'number-pad'; secureTextEntry?: boolean }) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} autoCapitalize="none" onChangeText={onChangeText} placeholder={label} placeholderTextColor={colors.textSubtle} style={styles.input} value={value} {...options} />
    </>
  );

  const phoneInput = (
    <>
      <Text style={styles.label}>{copy.mobileNumber}</Text>
      <View style={styles.phoneField}>
        <View style={styles.countryCode}><Text style={styles.countryCodeText}>+63</Text></View>
        <TextInput
          accessibilityLabel={`${copy.mobileNumber}, Philippines +63`}
          autoCapitalize="none"
          autoComplete="tel"
          keyboardType="number-pad"
          maxLength={12}
          onChangeText={(value) => setPhone(formatPhoneDigits(value))}
          placeholder="123 456 7890"
          placeholderTextColor={colors.textSubtle}
          style={styles.phoneInput}
          value={phone}
        />
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'android' ? 'height' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/nona-logo-transparent.png')}
            style={[styles.logo, { height: logoSize * (963 / 1055), width: logoSize }]}
            resizeMode="contain"
            accessibilityLabel="Nona"
          />
        </View>
        <View style={styles.card}>
          {developmentOtp && <View style={styles.developmentOtp}><Text style={styles.developmentOtpLabel}>DEVELOPMENT OTP</Text><Text style={styles.developmentOtpCode}>{developmentOtp.code}</Text><Text style={styles.developmentOtpExpiry}>Expires in 5 minutes</Text></View>}
          {step !== 'phone' && <Pressable accessibilityRole="button" accessibilityLabel={copy.back} onPress={goBack} style={styles.backButton}><Text style={styles.backText}>‹ {copy.back}</Text></Pressable>}
          <Text style={styles.title}>{step === 'phone' ? (mode === 'login' ? copy.loginTitle : copy.signupTitle) : step === 'otp' ? copy.otp : step === 'mpin' ? (mode === 'login' ? copy.enterMpin : copy.setMpin) : copy.profileTitle}</Text>
        {step === 'phone' && phoneInput}
        {step === 'otp' && input(copy.otp, otp, setOtp, { keyboardType: 'number-pad' })}
        {step === 'mpin' && <>{input(copy.mpin, mpin, setMpinValue, { keyboardType: 'number-pad', secureTextEntry: true })}{mode === 'signup' && input(copy.confirmMpin, confirmMpin, setConfirmMpin, { keyboardType: 'number-pad', secureTextEntry: true })}</>}
        {step === 'profile' && <>{input(copy.fullName, fullName, setFullName)}{input(copy.emergencyContact, emergencyContact, setEmergencyContact, { keyboardType: 'phone-pad' })}</>}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!message && <Text style={styles.message}>{message}</Text>}
        <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void (step === 'phone' ? requestOtp() : step === 'otp' ? verifyOtp() : step === 'mpin' ? saveMpin() : saveProfile())} style={[styles.submit, submitting && styles.disabled]}><Text style={styles.submitText}>{submitting ? '...' : step === 'phone' ? mode === 'login' ? copy.continue : copy.sendCode : step === 'otp' ? copy.verifyCode : step === 'mpin' ? copy.continue : copy.continue}</Text></Pressable>
        {step === 'otp' && <Pressable disabled={cooldown > 0 || submitting} onPress={() => void requestOtp()}><Text style={styles.switchText}>{cooldown ? `${copy.resendIn} ${cooldown}s` : copy.resendCode}</Text></Pressable>}
          {step === 'phone' && <>
            <Pressable accessibilityRole="button" onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); resetMessages(); }} style={styles.switchButton}>
              <Text style={styles.switchPrompt}>{mode === 'login' ? copy.noAccount : copy.haveAccount}</Text>
              <Text style={styles.switchAction}>{mode === 'login' ? copy.signup : copy.login}</Text>
            </Pressable>
          </>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  brandRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  logo: { alignSelf: 'center' },
  connector: { alignSelf: 'center', backgroundColor: colors.primary, height: 3, marginTop: -1, marginBottom: -1, width: 60 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, elevation: 3, marginTop: spacing.lg, padding: spacing.lg, shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  title: { color: colors.text, fontSize: typography.heading, fontWeight: '800', marginBottom: spacing.lg },
  backButton: { alignSelf: 'flex-start', marginBottom: spacing.sm, minHeight: 36, justifyContent: 'center' },
  backText: { color: colors.primaryDark, fontSize: typography.label, fontWeight: '700' },
  label: { color: colors.text, fontSize: typography.label, fontWeight: '700', marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, color: colors.text, fontSize: typography.body, minHeight: 52, paddingHorizontal: spacing.md },
  phoneField: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, flexDirection: 'row', minHeight: 52, overflow: 'hidden' },
  countryCode: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.surfaceMuted, borderRightColor: colors.border, borderRightWidth: 1, justifyContent: 'center', paddingHorizontal: spacing.md },
  countryCodeText: { color: colors.text, fontSize: typography.body, fontWeight: '700' },
  phoneInput: { color: colors.text, flex: 1, fontSize: typography.body, minHeight: 52, paddingHorizontal: spacing.md },
  error: { color: colors.danger, fontSize: typography.caption, marginTop: spacing.sm },
  message: { color: colors.primaryDark, fontSize: typography.caption, marginTop: spacing.sm },
  developmentOtp: { alignSelf: 'flex-end', backgroundColor: colors.warning, borderColor: colors.warningText, borderRadius: radii.control, borderWidth: 1, marginBottom: spacing.md, padding: spacing.sm },
  developmentOtpLabel: { color: colors.warningText, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textAlign: 'right' },
  developmentOtpCode: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: 4, marginTop: 2, textAlign: 'right' },
  developmentOtpExpiry: { color: colors.warningText, fontSize: 10, marginTop: 2, textAlign: 'right' },
  submit: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.control, justifyContent: 'center', marginTop: spacing.lg, minHeight: 54 },
  disabled: { opacity: 0.6 },
  submitText: { color: colors.white, fontSize: typography.button, fontWeight: '800' },
  switchText: { color: colors.primaryDark, fontSize: typography.label, fontWeight: '700', marginTop: spacing.lg, textAlign: 'center' },
  switchButton: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, paddingTop: spacing.lg },
  switchPrompt: { color: colors.textMuted, fontSize: typography.caption },
  switchAction: { color: colors.primaryDark, fontSize: typography.caption, fontWeight: '800', marginLeft: spacing.xs },
});
