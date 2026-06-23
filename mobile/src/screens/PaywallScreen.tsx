import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ProductSubscription } from "expo-iap";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../localization/I18nContext";
import { extractApiMessage } from "../services/api";
import {
  fetchPremiumProducts,
  purchasePremium,
  restorePremiumPurchases,
} from "../services/subscriptions";
import { colors, radii, spacing, typography } from "../theme";
import { showErrorAlert, showMessageAlert } from "../utils/alerts";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function PaywallScreen({ visible, onClose, onSuccess }: Props) {
  const { t } = useI18n();
  const { token, user, updateUser } = useAuth();
  const [products, setProducts] = useState<ProductSubscription[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!visible || Platform.OS !== "ios") {
      return;
    }

    let alive = true;
    setLoadingProducts(true);

    fetchPremiumProducts()
      .then((items) => {
        if (alive) {
          setProducts(items);
        }
      })
      .catch(() => {
        if (alive) {
          setProducts([]);
        }
      })
      .finally(() => {
        if (alive) {
          setLoadingProducts(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [visible]);

  const primaryProduct = products[0];
  const priceLabel = primaryProduct?.displayPrice ?? t("paywallPriceUnavailable");

  async function handleSubscribe() {
    if (!token || !user) {
      return;
    }

    if (Platform.OS !== "ios") {
      showMessageAlert(t, t("paywallIosOnly"));
      return;
    }

    setProcessing(true);
    try {
      const nextUser = await purchasePremium(token, user.id);
      await updateUser(nextUser);
      onSuccess();
      onClose();
    } catch (error) {
      showErrorAlert(t, extractApiMessage(error, t("paywallPurchaseFailed")));
    } finally {
      setProcessing(false);
    }
  }

  async function handleRestore() {
    if (!token) {
      return;
    }

    if (Platform.OS !== "ios") {
      showMessageAlert(t, t("paywallIosOnly"));
      return;
    }

    setProcessing(true);
    try {
      const nextUser = await restorePremiumPurchases(token);
      if (!nextUser) {
        showMessageAlert(t, t("paywallNothingToRestore"));
        return;
      }

      await updateUser(nextUser);
      onSuccess();
      onClose();
    } catch (error) {
      showErrorAlert(t, extractApiMessage(error, t("paywallRestoreFailed")));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton} disabled={processing}>
            <Ionicons name="close" size={22} color={colors.textDark} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name="leaf" size={36} color={colors.leaf} />
          </View>
          <Text style={styles.title}>{t("paywallTitle")}</Text>
          <Text style={styles.subtitle}>{t("paywallSubtitle")}</Text>

          <View style={styles.benefits}>
            <Text style={styles.benefit}>{t("paywallBenefitUnlimited")}</Text>
          </View>

          <View style={styles.priceCard}>
            {loadingProducts ? (
              <ActivityIndicator color={colors.leaf} />
            ) : (
              <>
                <Text style={styles.price}>{priceLabel}</Text>
                <Text style={styles.priceHint}>{t("paywallMonthlyHint")}</Text>
              </>
            )}
          </View>

          <Pressable
            style={[styles.primaryButton, processing && styles.buttonDisabled]}
            onPress={handleSubscribe}
            disabled={processing || loadingProducts}
          >
            {processing ? (
              <ActivityIndicator color={colors.textOnDark} />
            ) : (
              <Text style={styles.primaryButtonText}>{t("paywallSubscribe")}</Text>
            )}
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleRestore} disabled={processing}>
            <Text style={styles.secondaryButtonText}>{t("paywallRestore")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.leafPale,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: {
    fontSize: typography.title,
    fontWeight: "800",
    color: colors.textDark,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  benefits: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  benefit: {
    fontSize: typography.body,
    color: colors.textDark,
    fontWeight: "600",
  },
  priceCard: {
    backgroundColor: colors.sunYellowLight,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.sunYellow,
    padding: spacing.xl,
    alignItems: "center",
    minHeight: 96,
    justifyContent: "center",
  },
  price: {
    fontSize: typography.title,
    fontWeight: "800",
    color: colors.textDark,
  },
  priceHint: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    color: colors.textMuted,
  },
  primaryButton: {
    backgroundColor: colors.leaf,
    borderRadius: radii.pill,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.textOnDark,
    fontSize: typography.body,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.leafDark,
    fontSize: typography.body,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
