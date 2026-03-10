import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { AuthShell } from "@/components/auth/auth-shell";
import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { useTheme } from "@/hooks/use-theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const result = await signIn(email.trim(), password);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <AuthShell
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
    >
      <Card
        style={[
          styles.card,
          {
            borderColor: theme.border,
            shadowColor: theme.text,
            backgroundColor: theme.backgroundElement,
          },
        ]}
      >
        <ThemedText type="smallBold">{t("common.email")}</ThemedText>
        <TextField
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t("common.emailPlaceholder")}
        />

        <ThemedText type="smallBold">{t("common.password")}</ThemedText>
        <TextField
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t("common.hiddenPassword")}
        />

        {error ? (
          <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
        ) : null}

        <PrimaryButton
          label={t("common.login")}
          loading={loading}
          onPress={handleLogin}
        />
      </Card>

      <Pressable
        style={styles.linkRow}
        onPress={() => router.push("/(auth)/register")}
      >
        <ThemedText themeColor="textSecondary">
          {t("auth.login.noAccount")}
        </ThemedText>
        <ThemedText type="linkPrimary">{t("common.register")}</ThemedText>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    borderWidth: 1,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  linkRow: {
    flexDirection: "row",
    gap: Spacing.one,
    alignItems: "center",
  },
  linkFallback: {
    alignSelf: "flex-start",
  },
});
