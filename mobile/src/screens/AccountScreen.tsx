import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../localization/I18nContext";
import { extractApiMessage } from "../services/api";
import { colors, radii, spacing, typography } from "../theme";
import { showConfirmAlert, showErrorAlert } from "../utils/alerts";
import { openManageSubscriptions, openPrivacyPolicy, openTermsOfUse } from "../utils/legal";
import { LoginScreen } from "./LoginScreen";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

function ActionRow({ icon, label, onPress, destructive, disabled }: RowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && !disabled ? styles.rowPressed : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons
        name={icon}
        size={20}
        color={destructive ? colors.danger : colors.leafDark}
      />
      <Text style={[styles.rowLabel, destructive ? styles.rowLabelDestructive : null]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export function AccountScreen({ visible, onClose }: Props) {
  const { t } = useI18n();
  const { user, logout, deleteAccount } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isGuest = user?.authProvider === "guest";
  const planLabel = user?.plan === "premium" ? t("premiumPlan") : t("freePlan");
  const displayName = isGuest ? t("accountGuestName") : user?.name ?? "";

  // Close the embedded sign-in flow once a guest has been upgraded to a real account.
  useEffect(() => {
    if (showAuth && !isGuest) {
      setShowAuth(false);
    }
  }, [showAuth, isGuest]);

  function onDeletePress() {
    showConfirmAlert(t, {
      title: t("deleteAccount"),
      message: t("deleteAccountConfirmMessage"),
      confirmLabel: t("deleteAccount"),
      onConfirm: () => {
        setDeleting(true);
        deleteAccount()
          .catch((error) => {
            showErrorAlert(t, extractApiMessage(error, t("deleteAccountFailed")));
          })
          .finally(() => setDeleting(false));
      },
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("account")}</Text>
          <Pressable onPress={onClose} style={styles.closeButton} disabled={deleting}>
            <Ionicons name="close" size={22} color={colors.textDark} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color={colors.leafDark} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              {!isGuest && user?.email ? (
                <Text style={styles.profileMeta}>{user.email}</Text>
              ) : null}
              <Text style={styles.profilePlan}>{planLabel}</Text>
            </View>
          </View>

          {isGuest ? (
            <View style={styles.guestCard}>
              <Text style={styles.guestTitle}>{t("guestModeTitle")}</Text>
              <Text style={styles.guestHint}>{t("guestModeHint")}</Text>
              <Pressable style={styles.primaryButton} onPress={() => setShowAuth(true)}>
                <Text style={styles.primaryButtonText}>{t("createOrSignIn")}</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>{t("paywallSubscriptionLabel")}</Text>
          <View style={styles.section}>
            <ActionRow
              icon="card-outline"
              label={t("manageSubscription")}
              onPress={openManageSubscriptions}
            />
          </View>

          <Text style={styles.sectionTitle}>{t("legalSection")}</Text>
          <View style={styles.section}>
            <ActionRow icon="document-text-outline" label={t("termsOfUse")} onPress={openTermsOfUse} />
            <View style={styles.rowDivider} />
            <ActionRow
              icon="shield-checkmark-outline"
              label={t("privacyPolicy")}
              onPress={openPrivacyPolicy}
            />
          </View>

          <Text style={styles.sectionTitle}>{t("dangerZone")}</Text>
          <View style={styles.section}>
            <ActionRow icon="log-out-outline" label={t("logout")} onPress={() => logout()} disabled={deleting} />
            <View style={styles.rowDivider} />
            {deleting ? (
              <View style={styles.deletingRow}>
                <ActivityIndicator color={colors.danger} />
                <Text style={styles.deletingText}>{t("deletingAccount")}</Text>
              </View>
            ) : (
              <ActionRow
                icon="trash-outline"
                label={t("deleteAccount")}
                onPress={onDeletePress}
                destructive
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showAuth}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAuth(false)}
      >
        <LoginScreen onClose={() => setShowAuth(false)} />
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.heading,
    fontWeight: "800",
    color: colors.textDark,
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.leafPale,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: typography.heading,
    fontWeight: "800",
    color: colors.textDark,
  },
  profileMeta: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  profilePlan: {
    fontSize: typography.small,
    color: colors.leafDark,
    fontWeight: "700",
    marginTop: 2,
  },
  guestCard: {
    backgroundColor: colors.leafPale,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.leafLight,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  guestTitle: {
    fontSize: typography.body,
    fontWeight: "800",
    color: colors.textDark,
  },
  guestHint: {
    fontSize: typography.small,
    color: colors.textMuted,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.leaf,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.textOnDark,
    fontSize: typography.body,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: typography.small,
    fontWeight: "700",
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg - 2,
  },
  rowPressed: {
    backgroundColor: colors.cream,
  },
  rowLabel: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: "600",
    color: colors.textDark,
  },
  rowLabelDestructive: {
    color: colors.danger,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 20 + spacing.md,
  },
  deletingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg - 2,
  },
  deletingText: {
    fontSize: typography.body,
    fontWeight: "600",
    color: colors.danger,
  },
});
