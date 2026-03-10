import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAccentColor } from '@/hooks/use-accent';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { type AppLocale, useI18n } from '@/i18n';

type StatusMessage = {
  tone: 'error' | 'success';
  text: string;
};

type SectionPanelTone = 'default' | 'accent' | 'danger';

type SectionPanelProps = {
  children: React.ReactNode;
  description?: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  style?: StyleProp<ViewStyle>;
  title: string;
  tone?: SectionPanelTone;
};

const LOCALE_OPTIONS: AppLocale[] = ['de', 'en'];

function SectionPanel({
  children,
  description,
  icon,
  style,
  title,
  tone = 'default',
}: SectionPanelProps) {
  const theme = useTheme();

  const palette =
    tone === 'accent'
      ? {
          backgroundColor: theme.primarySoft,
          borderColor: theme.primaryMuted,
          iconBackgroundColor: theme.background,
          iconColor: theme.primary,
        }
      : tone === 'danger'
        ? {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.danger,
            iconBackgroundColor: theme.background,
            iconColor: theme.danger,
          }
        : {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            iconBackgroundColor: theme.background,
            iconColor: theme.primary,
          };

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.sectionPanel,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        style,
      ]}>
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionIcon,
            {
              backgroundColor: palette.iconBackgroundColor,
            },
          ]}>
          <Feather name={icon} size={18} color={palette.iconColor} />
        </View>

        <View style={styles.sectionHeaderCopy}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            {title}
          </ThemedText>
          {description ? (
            <ThemedText themeColor="textSecondary" style={styles.sectionDescription}>
              {description}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {children}
    </ThemedView>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.infoPill,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
        },
      ]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

function StatusBanner({ status }: { status: StatusMessage }) {
  const theme = useTheme();
  const isSuccess = status.tone === 'success';

  return (
    <View
      style={[
        styles.statusBanner,
        {
          backgroundColor: theme.background,
          borderColor: isSuccess ? theme.primary : theme.danger,
        },
      ]}>
      <Feather
        name={isSuccess ? 'check-circle' : 'alert-circle'}
        size={16}
        color={isSuccess ? theme.primary : theme.danger}
      />
      <ThemedText
        type="smallBold"
        style={{
          color: isSuccess ? theme.primary : theme.danger,
          flex: 1,
        }}>
        {status.text}
      </ThemedText>
    </View>
  );
}

export default function ExploreScreen() {
  const { session, signOut, updateEmail, updatePassword, updateProfile } = useAuth();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { accent, options, setAccent } = useAccentColor();
  const { locale, setLocale, t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [email, setEmail] = useState(session?.user.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [nameStatus, setNameStatus] = useState<StatusMessage | null>(null);
  const [emailStatus, setEmailStatus] = useState<StatusMessage | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<StatusMessage | null>(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    const metadata = session?.user.user_metadata ?? {};
    const currentName =
      (metadata.full_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      '';

    setProfileName(currentName);
    setEmail(session?.user.email ?? '');
  }, [session]);

  const isWideLayout = width >= 960;
  const useTwoColumnOptions = width >= 420;
  const displayName = profileName.trim() || session?.user.email?.split('@')[0] || 'PRLY';
  const profileInitial = displayName.charAt(0).toUpperCase();
  const currentLanguageLabel = t(`explore.languageOptions.${locale}`);
  const inputStyle = {
    backgroundColor: theme.background,
    borderColor: theme.border,
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
  };

  const handleUpdateName = async () => {
    const trimmed = profileName.trim();

    if (!trimmed) {
      setNameStatus({ tone: 'error', text: t('explore.nameRequired') });
      return;
    }

    setNameSaving(true);
    setNameStatus(null);
    const result = await updateProfile(trimmed);

    if (result.error) {
      setNameStatus({ tone: 'error', text: result.error });
    } else {
      setNameStatus({ tone: 'success', text: t('explore.nameSaved') });
    }

    setNameSaving(false);
  };

  const handleUpdateEmail = async () => {
    const trimmed = email.trim();

    if (!trimmed) {
      setEmailStatus({ tone: 'error', text: t('explore.emailRequired') });
      return;
    }

    setEmailSaving(true);
    setEmailStatus(null);
    const result = await updateEmail(trimmed);

    if (result.error) {
      setEmailStatus({ tone: 'error', text: result.error });
    } else {
      setEmailStatus({ tone: 'success', text: t('explore.emailUpdated') });
    }

    setEmailSaving(false);
  };

  const handleUpdatePassword = async () => {
    const trimmed = newPassword.trim();

    if (trimmed.length < 8) {
      setPasswordStatus({ tone: 'error', text: t('explore.passwordTooShort') });
      return;
    }

    setPasswordSaving(true);
    setPasswordStatus(null);
    const result = await updatePassword(trimmed);

    if (result.error) {
      setPasswordStatus({ tone: 'error', text: result.error });
    } else {
      setPasswordStatus({ tone: 'success', text: t('explore.passwordUpdated') });
      setNewPassword('');
    }

    setPasswordSaving(false);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: BottomTabInset + Spacing.four },
          ]}>
          <View style={styles.contentShell}>
            <View style={[styles.content, { maxWidth: MaxContentWidth + 160 }]}>
              <ThemedView
                style={[
                  styles.hero,
                  {
                    backgroundColor: theme.primarySoft,
                    borderColor: theme.primaryMuted,
                  },
                ]}>
                <View
                  style={[
                    styles.heroGlowLarge,
                    {
                      backgroundColor: theme.primaryMuted,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.heroGlowSmall,
                    {
                      backgroundColor: theme.primary,
                    },
                  ]}
                />

                <View style={[styles.heroContent, isWideLayout && styles.heroContentWide]}>
                  <View style={styles.heroCopy}>
                    <View
                      style={[
                        styles.brandBadge,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.primaryMuted,
                        },
                      ]}>
                      <Feather name="star" size={14} color={theme.primary} />
                      <ThemedText type="smallBold" style={{ color: theme.primary }}>
                        PRLY
                      </ThemedText>
                    </View>

                    <View style={styles.heroHeading}>
                      <ThemedText style={[styles.heroTitle, { color: theme.text }]}>
                        {t('explore.title')}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={styles.heroSubtitle}>
                        {t('explore.subtitle')}
                      </ThemedText>
                    </View>

                    <View style={styles.heroPillRow}>
                      <InfoPill label={t('explore.appColor')} value={accent.label} />
                      <InfoPill label={t('explore.language')} value={currentLanguageLabel} />
                    </View>
                  </View>

                  <ThemedView
                    style={[
                      styles.profileSpotlight,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.primaryMuted,
                      },
                    ]}>
                    <View
                      style={[
                        styles.profileAvatar,
                        {
                          backgroundColor: theme.primary,
                        },
                      ]}>
                      <ThemedText style={styles.profileAvatarText}>{profileInitial}</ThemedText>
                    </View>

                    <View style={styles.profileSummary}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('explore.profile')}
                      </ThemedText>
                      <ThemedText style={styles.profileName}>{displayName}</ThemedText>
                      <ThemedText themeColor="textSecondary" numberOfLines={1}>
                        {session?.user.email ?? '—'}
                      </ThemedText>
                    </View>

                    <View style={styles.profileMeta}>
                      <InfoPill label={t('explore.appColor')} value={accent.label} />
                      <InfoPill label={t('explore.language')} value={currentLanguageLabel} />
                    </View>
                  </ThemedView>
                </View>
              </ThemedView>

              <View style={[styles.mainGrid, isWideLayout && styles.mainGridWide]}>
                <View style={styles.column}>
                  <SectionPanel
                    icon="user"
                    title={t('explore.profile')}
                    description={session?.user.email ?? '—'}>
                    <View style={styles.formGroup}>
                      <ThemedText type="smallBold">{t('explore.yourName')}</ThemedText>
                      <TextField
                        value={profileName}
                        onChangeText={setProfileName}
                        placeholder={t('explore.yourName')}
                        style={inputStyle}
                      />
                      {nameStatus ? <StatusBanner status={nameStatus} /> : null}
                      <PrimaryButton
                        label={t('explore.saveName')}
                        loading={nameSaving}
                        onPress={handleUpdateName}
                      />
                    </View>
                  </SectionPanel>

                  <SectionPanel
                    icon="droplet"
                    title={t('explore.appColor')}
                    description={t('explore.chooseAccent')}
                    tone="accent">
                    <View style={styles.optionGrid}>
                      {options.map((option) => {
                        const selected = option.key === accent.key;

                        return (
                          <Pressable
                            key={option.key}
                            onPress={() => setAccent(option.key)}
                            style={[
                              styles.optionTile,
                              {
                                width: useTwoColumnOptions ? '48%' : '100%',
                                backgroundColor: theme.background,
                                borderColor: selected ? theme.primary : theme.primaryMuted,
                              },
                            ]}>
                            <View
                              style={[
                                styles.accentPreview,
                                {
                                  backgroundColor: option.value,
                                },
                              ]}
                            />

                            <View style={styles.optionTileHeader}>
                              <View style={styles.optionTileCopy}>
                                <ThemedText type="smallBold">{option.label}</ThemedText>
                                <ThemedText type="small" themeColor="textSecondary">
                                  {option.value}
                                </ThemedText>
                              </View>

                              {selected ? (
                                <View
                                  style={[
                                    styles.selectionBadge,
                                    {
                                      backgroundColor: theme.primary,
                                    },
                                  ]}>
                                  <Feather name="check" size={14} color="#ffffff" />
                                </View>
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </SectionPanel>

                  <SectionPanel
                    icon="globe"
                    title={t('explore.language')}
                    description={t('explore.chooseLanguage')}>
                    <View style={styles.optionGrid}>
                      {LOCALE_OPTIONS.map((option) => {
                        const selected = option === locale;

                        return (
                          <Pressable
                            key={option}
                            onPress={() => setLocale(option)}
                            style={[
                              styles.optionTile,
                              styles.languageTile,
                              {
                                width: '48%',
                                backgroundColor: selected
                                  ? theme.primarySoft
                                  : theme.background,
                                borderColor: selected ? theme.primary : theme.border,
                              },
                            ]}>
                            <View style={styles.languageTileCopy}>
                              <ThemedText
                                style={[
                                  styles.languageTileCode,
                                  {
                                    color: selected ? theme.primary : theme.text,
                                  },
                                ]}>
                                {option.toUpperCase()}
                              </ThemedText>
                              <ThemedText type="smallBold">
                                {t(`explore.languageOptions.${option}`)}
                              </ThemedText>
                            </View>

                            {selected ? (
                              <View
                                style={[
                                  styles.selectionBadge,
                                  {
                                    backgroundColor: theme.primary,
                                  },
                                ]}>
                                <Feather name="check" size={14} color="#ffffff" />
                              </View>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </SectionPanel>
                </View>

                <View style={styles.column}>
                  <SectionPanel
                    icon="mail"
                    title={t('explore.changeEmail')}
                    description={session?.user.email ?? '—'}>
                    <View style={styles.formGroup}>
                      <TextField
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder={t('common.emailPlaceholder')}
                        style={inputStyle}
                      />
                      {emailStatus ? <StatusBanner status={emailStatus} /> : null}
                      <PrimaryButton
                        label={t('explore.updateEmail')}
                        loading={emailSaving}
                        onPress={handleUpdateEmail}
                      />
                    </View>
                  </SectionPanel>

                  <SectionPanel
                    icon="shield"
                    title={t('explore.changePassword')}
                    description={t('explore.newPassword')}>
                    <View style={styles.formGroup}>
                      <TextField
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        placeholder={t('explore.newPassword')}
                        style={inputStyle}
                      />
                      {passwordStatus ? <StatusBanner status={passwordStatus} /> : null}
                      <PrimaryButton
                        label={t('explore.updatePassword')}
                        loading={passwordSaving}
                        onPress={handleUpdatePassword}
                      />
                    </View>
                  </SectionPanel>

                  <SectionPanel
                    icon="zap"
                    title={t('explore.tipTitle')}
                    description={t('explore.tipBody')}
                    tone="accent">
                    <View
                      style={[
                        styles.tipCallout,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.primaryMuted,
                        },
                      ]}>
                      <View
                        style={[
                          styles.tipMarker,
                          {
                            backgroundColor: theme.primarySoft,
                          },
                        ]}
                      />
                      <ThemedText themeColor="textSecondary" style={styles.tipText}>
                        {t('explore.tipBody')}
                      </ThemedText>
                    </View>
                  </SectionPanel>

                  <SectionPanel icon="log-out" title={t('explore.signOut')} tone="danger">
                    <PrimaryButton
                      label={t('explore.signOut')}
                      variant="danger"
                      loading={loading}
                      onPress={handleSignOut}
                    />
                  </SectionPanel>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  accentPreview: {
    borderRadius: 12,
    height: 14,
    width: '100%',
  },
  brandBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  column: {
    flex: 1,
    gap: Spacing.three,
  },
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    width: '100%',
  },
  contentShell: {
    alignItems: 'center',
    width: '100%',
  },
  formGroup: {
    gap: Spacing.two,
  },
  hero: {
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.four,
    position: 'relative',
  },
  heroContent: {
    gap: Spacing.three,
  },
  heroContentWide: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.three,
    zIndex: 1,
  },
  heroGlowLarge: {
    borderRadius: 180,
    height: 260,
    opacity: 0.55,
    position: 'absolute',
    right: -70,
    top: -90,
    width: 260,
  },
  heroGlowSmall: {
    borderRadius: 80,
    bottom: 36,
    height: 120,
    opacity: 0.12,
    position: 'absolute',
    right: 24,
    width: 120,
  },
  heroHeading: {
    gap: Spacing.two,
    maxWidth: 540,
  },
  heroPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  heroSubtitle: {
    fontSize: 17,
    lineHeight: 28,
    maxWidth: 520,
  },
  heroTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  infoPill: {
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.half,
    minWidth: 132,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  languageTile: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 98,
  },
  languageTileCode: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  languageTileCopy: {
    gap: Spacing.one,
  },
  mainGrid: {
    gap: Spacing.three,
  },
  mainGridWide: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionTile: {
    borderRadius: 24,
    borderWidth: 1,
    gap: Spacing.two,
    minHeight: 112,
    padding: Spacing.three,
  },
  optionTileCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  optionTileHeader: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  profileAvatar: {
    alignItems: 'center',
    borderRadius: 24,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  profileAvatarText: {
    color: '#ffffff',
    fontFamily: Fonts.rounded,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 32,
  },
  profileMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  profileName: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  profileSpotlight: {
    borderRadius: 28,
    borderWidth: 1,
    gap: Spacing.three,
    minWidth: 280,
    padding: Spacing.four,
    zIndex: 1,
  },
  profileSummary: {
    gap: Spacing.one,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  sectionDescription: {
    lineHeight: 22,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  sectionIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sectionPanel: {
    borderRadius: 28,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  selectionBadge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  statusBanner: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  tipCallout: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  tipMarker: {
    borderRadius: 999,
    marginTop: 6,
    minHeight: 10,
    minWidth: 10,
  },
  tipText: {
    flex: 1,
    lineHeight: 24,
  },
});
