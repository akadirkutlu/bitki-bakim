import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { IllustrationImage } from "../components/PlantImage";
import { LanguageToggle } from "../components/LanguageToggle";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../localization/I18nContext";
import { heroImage } from "../plantImages";
import { extractApiMessage } from "../services/api";
import {
  isAppleSignInAvailable,
  isGoogleSignInConfigured,
  signInWithApple,
  signInWithGoogle,
} from "../services/socialAuth";
import { colors, radii, shadow, spacing, typography } from "../theme";
import { showErrorAlert, showMessageAlert } from "../utils/alerts";
import { openPrivacyPolicy, openTermsOfUse } from "../utils/legal";

type Props = {
  /** When provided, the screen renders as a modal (guest upgrade) with a close button. */
  onClose?: () => void;
};

export function LoginScreen({ onClose }: Props = {}) {
  const { t } = useI18n();
  const { login, register, loginWithGoogle, loginWithApple, loginAsGuest } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const showAppleButton = isAppleSignInAvailable();
  const showSocialSection = true;
  // In guest-upgrade mode (rendered from the Account screen) there is no point
  // offering "continue as guest" again.
  const showGuestOption = !onClose;

  async function onSubmit() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (isRegister && trimmedName.length < 2) {
      showMessageAlert(t, t("validationName"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showMessageAlert(t, t("validationEmail"));
      return;
    }

    if (trimmedPassword.length < 6) {
      showMessageAlert(t, t("validationPassword"));
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register({
          name: trimmedName,
          email: trimmedEmail,
          password: trimmedPassword,
        });
      } else {
        await login({ email: trimmedEmail, password: trimmedPassword });
      }
    } catch (error) {
      showErrorAlert(t, extractApiMessage(error, t("unexpectedError")));
    } finally {
      setLoading(false);
    }
  }

  async function onGooglePress() {
    if (!isGoogleSignInConfigured()) {
      showMessageAlert(t, t("googleNotReady"));
      return;
    }

    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) {
        return;
      }

      await loginWithGoogle(idToken);
    } catch (error) {
      const message =
        error instanceof Error && error.message === "GOOGLE_REQUIRES_DEV_BUILD"
          ? t("googleRequiresDevBuild")
          : extractApiMessage(error, t("unexpectedError"));
      showErrorAlert(t, message);
    } finally {
      setLoading(false);
    }
  }

  async function onApplePress() {
    setLoading(true);
    try {
      const result = await signInWithApple();
      if (!result) {
        return;
      }

      await loginWithApple(result);
    } catch (error) {
      showErrorAlert(t, extractApiMessage(error, t("unexpectedError")));
    } finally {
      setLoading(false);
    }
  }

  async function onGuestPress() {
    setLoading(true);
    try {
      await loginAsGuest();
    } catch (error) {
      showErrorAlert(t, extractApiMessage(error, t("unexpectedError")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={[colors.leafPale, colors.cream, colors.cream]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.flex}>
        <View style={[styles.topBar, onClose ? styles.topBarWithClose : null]}>
          {onClose ? (
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={styles.closeButton}
              accessibilityLabel={t("cancel")}
            >
              <Ionicons name="close" size={20} color={colors.textDark} />
            </Pressable>
          ) : null}
          <LanguageToggle />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <IllustrationImage source={heroImage} style={styles.hero} />

            <Text style={styles.title}>{t("appTitle")}</Text>
            <Text style={styles.tagline}>{t("appTagline")}</Text>

            <View style={styles.card}>
            {showSocialSection ? (
              <>
                <Pressable
                  onPress={onGooglePress}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.socialButton,
                    styles.googleButton,
                    pressed ? styles.pressed : null,
                    loading ? styles.disabled : null,
                  ]}
                >
                  <Ionicons name="logo-google" size={18} color={colors.textDark} />
                  <Text style={styles.socialButtonText}>{t("continueWithGoogle")}</Text>
                </Pressable>

                {showAppleButton ? (
                  <Pressable
                    onPress={onApplePress}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.socialButton,
                      styles.appleButton,
                      pressed ? styles.pressed : null,
                      loading ? styles.disabled : null,
                    ]}
                  >
                    <Ionicons name="logo-apple" size={18} color={colors.textOnDark} />
                    <Text style={styles.appleButtonText}>{t("continueWithApple")}</Text>
                  </Pressable>
                ) : null}

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t("orContinueWithEmail")}</Text>
                  <View style={styles.dividerLine} />
                </View>
              </>
            ) : null}

            {isRegister ? (
              <View style={styles.inputRow}>
                <Ionicons name="person" size={18} color={colors.leaf} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholder={t("name")}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ) : null}

            <View style={styles.inputRow}>
              <Ionicons name="mail" size={18} color={colors.leaf} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder={t("email")}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="lock-closed" size={18} color={colors.leaf} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t("password")}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Pressable onPress={onSubmit} disabled={loading}>
              <LinearGradient
                colors={[colors.leaf, colors.leafDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                <Text style={styles.buttonText}>
                  {loading ? t("loading") : isRegister ? t("register") : t("login")}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => setIsRegister((prev) => !prev)} disabled={loading}>
              <Text style={styles.linkText}>
                {isRegister ? t("login") : t("register")}
              </Text>
            </Pressable>
          </View>

          {showGuestOption ? (
            <Pressable
              onPress={onGuestPress}
              disabled={loading}
              style={({ pressed }) => [
                styles.guestButton,
                pressed ? styles.pressed : null,
                loading ? styles.disabled : null,
              ]}
            >
              <Text style={styles.guestButtonText}>{t("continueAsGuest")}</Text>
            </Pressable>
          ) : null}

          <View style={styles.legalLinks}>
            <Pressable onPress={openTermsOfUse} hitSlop={8}>
              <Text style={styles.legalLink}>{t("termsOfUse")}</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable onPress={openPrivacyPolicy} hitSlop={8}>
              <Text style={styles.legalLink}>{t("privacyPolicy")}</Text>
            </Pressable>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  topBarWithClose: {
    justifyContent: "space-between",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    width: "100%",
    height: 160,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.title + 4,
    fontWeight: "800",
    color: colors.leafDark,
    textAlign: "center",
  },
  tagline: {
    fontSize: typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadow.card,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: spacing.lg - 2,
    borderWidth: 1.5,
  },
  googleButton: {
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  socialButtonText: {
    color: colors.textDark,
    fontWeight: "600",
    fontSize: typography.body,
  },
  appleButton: {
    borderColor: colors.textDark,
    backgroundColor: colors.textDark,
  },
  appleButtonText: {
    color: colors.textOnDark,
    fontWeight: "600",
    fontSize: typography.body,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cream,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.textDark,
  },
  primaryButton: {
    borderRadius: radii.md,
    paddingVertical: spacing.lg - 2,
    alignItems: "center",
  },
  buttonText: {
    color: colors.textOnDark,
    fontWeight: "700",
    fontSize: typography.body + 1,
  },
  linkText: {
    textAlign: "center",
    color: colors.terracotta,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  guestButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  guestButtonText: {
    color: colors.leafDark,
    fontWeight: "700",
    fontSize: typography.body,
    textDecorationLine: "underline",
  },
  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  legalLink: {
    color: colors.leafDark,
    fontSize: typography.small,
    fontWeight: "700",
  },
  legalDot: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
