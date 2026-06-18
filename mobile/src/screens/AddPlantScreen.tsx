import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { DateCalendarPicker } from "../components/DateCalendarPicker";
import { PlantImage, UserPhotoImage } from "../components/PlantImage";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../localization/I18nContext";
import { getPlantImage } from "../plantImages";
import {
  createPlant,
  extractApiMessage,
  identifyByPhoto,
  isCanceledError,
} from "../services/api";
import { colors, radii, shadow, spacing, typography } from "../theme";
import type { Plant, PlantType } from "../types";
import { showErrorAlert, showMessageAlert, showPlanAlert } from "../utils/alerts";
import { getPlantCommonNames } from "../utils/plantNames";

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[çğıöşü]/g, (char) => TURKISH_CHAR_MAP[char] ?? char);
}

function normalizeNickname(value: string): string {
  return value.trim().toLocaleLowerCase("tr");
}

function isDuplicateNickname(nickname: string, plants: Plant[]): boolean {
  const normalized = normalizeNickname(nickname);
  return plants.some((plant) => normalizeNickname(plant.nickname) === normalized);
}

type Props = {
  plantTypes: PlantType[];
  plants: Plant[];
  onCreated: () => void;
};

type DateFieldKey = "watering" | "feeding" | "soil";

type DateFieldConfig = {
  key: DateFieldKey;
  step: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  labelKey: string;
};

const TOTAL_STEPS = 5;

const DATE_FIELDS: DateFieldConfig[] = [
  { key: "watering", step: 3, icon: "water", color: colors.water, labelKey: "lastWateringDate" },
  { key: "feeding", step: 4, icon: "leaf", color: colors.leaf, labelKey: "lastFeedingDate" },
  { key: "soil", step: 5, icon: "flower", color: colors.soil, labelKey: "lastSoilChangeDate" },
];

const STEP_LABEL_KEYS = [
  "stepChooseType",
  "stepNamePlant",
  "lastWateringDate",
  "lastFeedingDate",
  "lastSoilChangeDate",
] as const;

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: "images",
  allowsEditing: true,
  quality: 0.4,
  base64: true,
};

type PlantTypeCardProps = {
  type: PlantType;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

const PlantTypeCard = memo(function PlantTypeCard({
  type,
  isSelected,
  onSelect,
}: PlantTypeCardProps) {
  const { language } = useI18n();

  return (
    <Pressable
      onPress={() => onSelect(type.id)}
      style={[styles.typeCard, isSelected && styles.typeCardSelected]}
    >
      {isSelected ? (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={14} color={colors.white} />
        </View>
      ) : null}
      <PlantImage source={getPlantImage(type.id)} style={styles.typeImage} />
      <Text style={styles.typeCommonName} numberOfLines={1}>
        {getPlantCommonNames(type, language)[0]}
      </Text>
      <Text style={styles.typeLatin} numberOfLines={1}>
        {type.latinName}
      </Text>
    </Pressable>
  );
});

function resetFormState(
  setStep: (step: number) => void,
  setNickname: (value: string) => void,
  setSelectedTypeId: (value: string) => void,
  setDates: (value: { watering: string; feeding: string; soil: string }) => void,
  setPhotoUri: (value: string | null) => void,
  setCandidates: (value: PlantType[]) => void,
  setSearch: (value: string) => void
) {
  setStep(1);
  setNickname("");
  setSelectedTypeId("");
  setDates({ watering: "", feeding: "", soil: "" });
  setPhotoUri(null);
  setCandidates([]);
  setSearch("");
}

export function AddPlantScreen({ plantTypes, plants, onCreated }: Props) {
  const { t, language } = useI18n();
  const { token } = useAuth();

  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [dates, setDates] = useState({ watering: "", feeding: "", soil: "" });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PlantType[]>([]);
  const [identifying, setIdentifying] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const identifyControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => identifyControllerRef.current?.abort();
  }, []);

  function cancelIdentify() {
    identifyControllerRef.current?.abort();
    identifyControllerRef.current = null;
    setIdentifying(false);
  }

  async function identifyFromUri(uri: string, base64?: string | null) {
    if (!token) {
      return;
    }

    identifyControllerRef.current?.abort();
    const controller = new AbortController();
    identifyControllerRef.current = controller;
    setIdentifying(true);

    try {
      const found = await identifyByPhoto(
        token,
        base64 ? { imageBase64: base64 } : { imageHint: uri.toLowerCase() },
        controller.signal
      );
      setCandidates(found);
      if (found[0]) {
        setSelectedTypeId(found[0].id);
      }
    } catch (error) {
      if (!isCanceledError(error)) {
        showErrorAlert(t, extractApiMessage(error, t("unexpectedError")));
      }
    } finally {
      if (identifyControllerRef.current === controller) {
        identifyControllerRef.current = null;
        setIdentifying(false);
      }
    }
  }

  function handlePickedImage(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || !result.assets[0]) {
      return;
    }
    const uri = result.assets[0].uri;
    const base64 = result.assets[0].base64;
    setPhotoUri(uri);
    identifyFromUri(uri, base64).catch(() => undefined);
  }

  async function onPickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    handlePickedImage(result);
  }

  async function onTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showMessageAlert(t, t("cameraPermissionDenied"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    handlePickedImage(result);
  }

  function onRemovePhoto() {
    cancelIdentify();
    setPhotoUri(null);
    setCandidates([]);
  }

  function validateCurrentStep(): boolean {
    switch (step) {
      case 1:
        if (!selectedTypeId) {
          showMessageAlert(t, t("validationPlantType"));
          return false;
        }
        return true;
      case 2:
        if (nickname.trim().length === 0) {
          showMessageAlert(t, t("validationPlantName"));
          return false;
        }
        if (isDuplicateNickname(nickname, plants)) {
          showMessageAlert(t, t("validationDuplicatePlantName"));
          return false;
        }
        return true;
      case 3:
      case 4:
      case 5: {
        const field = DATE_FIELDS.find((item) => item.step === step);
        if (!field || !isValidIsoDate(dates[field.key])) {
          showMessageAlert(t, t("selectDate"));
          return false;
        }
        return true;
      }
      default:
        return false;
    }
  }

  function onNext() {
    if (!validateCurrentStep()) {
      return;
    }
    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  }

  function onBack() {
    setStep((current) => Math.max(current - 1, 1));
  }

  async function onSave() {
    if (!token || !validateCurrentStep()) {
      return;
    }

    if (
      !isValidIsoDate(dates.watering) ||
      !isValidIsoDate(dates.feeding) ||
      !isValidIsoDate(dates.soil)
    ) {
      showMessageAlert(t, t("invalidDate"));
      return;
    }

    if (isDuplicateNickname(nickname, plants)) {
      showMessageAlert(t, t("validationDuplicatePlantName"));
      return;
    }

    setSaving(true);
    try {
      await createPlant(token, {
        nickname: nickname.trim(),
        plantTypeId: selectedTypeId,
        lastWateringDate: dates.watering,
        lastFeedingDate: dates.feeding,
        lastSoilChangeDate: dates.soil,
        photoUri: photoUri ?? undefined,
      });

      resetFormState(
        setStep,
        setNickname,
        setSelectedTypeId,
        setDates,
        setPhotoUri,
        setCandidates,
        setSearch
      );
      onCreated();
    } catch (error) {
      const message = extractApiMessage(error, t("unexpectedError"));
      if (message.toLowerCase().includes("free plan limit")) {
        showPlanAlert(t, t("premiumRequired"));
      } else if (message.toLowerCase().includes("nickname already exists")) {
        showMessageAlert(t, t("validationDuplicatePlantName"));
      } else {
        showErrorAlert(t, message);
      }
    } finally {
      setSaving(false);
    }
  }

  const typesToShow = useMemo(() => {
    const base = candidates.length > 0 ? candidates : plantTypes;
    const query = normalizeSearch(search.trim());
    if (!query) {
      return base;
    }
    return base.filter(
      (type) =>
        normalizeSearch(type.latinName).includes(query) ||
        type.turkishNames.some((name) => normalizeSearch(name).includes(query)) ||
        type.englishNames.some((name) => normalizeSearch(name).includes(query))
    );
  }, [candidates, plantTypes, search]);

  const activeDateField = DATE_FIELDS.find((field) => field.step === step);
  const selectedType = plantTypes.find((type) => type.id === selectedTypeId);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.stepHeader}>
        <Text style={styles.stepLabel}>
          {t("stepProgress")
            .replace("{current}", String(step))
            .replace("{total}", String(TOTAL_STEPS))}
        </Text>
        <Text style={styles.stepTitle}>{t(STEP_LABEL_KEYS[step - 1])}</Text>
        <View style={styles.stepDots}>
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <View
              key={index}
              style={[styles.stepDot, index + 1 <= step && styles.stepDotActive]}
            />
          ))}
        </View>
      </View>

      {step === 1 ? (
        <>
          <View style={styles.photoButtonsRow}>
            <Pressable style={styles.photoActionButton} onPress={onTakePhoto}>
              <Ionicons name="camera" size={20} color={colors.leafDark} />
              <Text style={styles.photoActionText}>{t("takePhoto")}</Text>
            </Pressable>
            <Pressable style={styles.photoActionButton} onPress={onPickFromGallery}>
              <Ionicons name="images" size={20} color={colors.leafDark} />
              <Text style={styles.photoActionText}>{t("pickFromGallery")}</Text>
            </Pressable>
          </View>

          {photoUri ? (
            <View style={styles.photoPreviewRow}>
              <UserPhotoImage uri={photoUri} style={styles.photoPreview} />
              <View style={styles.photoTextWrap}>
                <Text style={styles.photoTitle}>{t("yourPhoto")}</Text>
                {identifying ? (
                  <View style={styles.identifyingRow}>
                    <ActivityIndicator size="small" color={colors.leaf} />
                    <Text style={styles.photoHint}>{t("identifying")}</Text>
                    <Pressable onPress={cancelIdentify} style={styles.cancelChip}>
                      <Text style={styles.cancelChipText}>{t("cancel")}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.photoHint}>{t("photoSelected")}</Text>
                )}
              </View>
              <Pressable
                onPress={onRemovePhoto}
                style={styles.removePhotoButton}
                accessibilityLabel={t("removePhoto")}
              >
                <Ionicons name="close" size={18} color={colors.white} />
              </Pressable>
            </View>
          ) : null}

          {photoUri ? (
            <Text style={styles.plantNetAttribution}>{t("plantNetAttribution")}</Text>
          ) : null}

          <Text style={styles.sectionTitle}>{t("manualSelect")}</Text>

          <View style={styles.inputRow}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={search}
              onChangeText={setSearch}
              placeholder={t("searchPlantType")}
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {candidates.length > 0 ? (
            <Pressable style={styles.showAllChip} onPress={() => setCandidates([])}>
              <Ionicons name="grid" size={14} color={colors.leafDark} />
              <Text style={styles.showAllText}>{t("showAllTypes")}</Text>
            </Pressable>
          ) : null}

          <View style={styles.typeGrid}>
            {typesToShow.map((type) => (
              <PlantTypeCard
                key={type.id}
                type={type}
                isSelected={selectedTypeId === type.id}
                onSelect={setSelectedTypeId}
              />
            ))}
            {typesToShow.length === 0 ? (
              <Text style={styles.noResults}>{t("noTypeResults")}</Text>
            ) : null}
          </View>
        </>
      ) : null}

      {step === 2 ? (
        <>
          {selectedType ? (
            <View style={styles.selectedTypeSummary}>
              <PlantImage source={getPlantImage(selectedType.id)} style={styles.summaryImage} />
              <View style={styles.summaryTextWrap}>
                <Text style={styles.summaryLatin}>{selectedType.latinName}</Text>
                <Text style={styles.summaryCommonName}>
                  {getPlantCommonNames(selectedType, language)[0]}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <Ionicons name="pricetag" size={18} color={colors.leaf} />
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder={t("plantName")}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          </View>
        </>
      ) : null}

      {activeDateField ? (
        <DateCalendarPicker
          value={dates[activeDateField.key]}
          onChange={(isoDate) =>
            setDates((prev) => ({ ...prev, [activeDateField.key]: isoDate }))
          }
          accentColor={activeDateField.color}
          label={t(activeDateField.labelKey)}
        />
      ) : null}
      </ScrollView>

      <View style={styles.floatingActions} pointerEvents="box-none">
        {step > 1 ? (
          <Pressable style={styles.floatingBack} onPress={onBack}>
            <Ionicons name="arrow-back" size={18} color={colors.leafDark} />
            <Text style={styles.backText}>{t("back")}</Text>
          </Pressable>
        ) : null}

        {step < TOTAL_STEPS ? (
          <Pressable onPress={onNext} style={styles.floatingPrimary}>
            <LinearGradient
              colors={[colors.leaf, colors.leafDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.floatingPrimaryInner}
            >
              <Text style={styles.nextText}>{t("next")}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable onPress={onSave} disabled={saving} style={styles.floatingPrimary}>
            <LinearGradient
              colors={[colors.leaf, colors.leafDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.floatingPrimaryInner}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.nextText}>{saving ? t("loading") : t("save")}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const FLOATING_ACTION_HEIGHT = 56;
const FLOATING_ACTION_BOTTOM = spacing.lg;
const SCROLL_BOTTOM_INSET = FLOATING_ACTION_HEIGHT + FLOATING_ACTION_BOTTOM + spacing.lg;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: SCROLL_BOTTOM_INSET,
  },
  stepHeader: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  stepLabel: {
    fontSize: typography.small,
    fontWeight: "700",
    color: colors.leafDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  stepTitle: {
    fontSize: typography.heading,
    fontWeight: "700",
    color: colors.textDark,
  },
  stepDots: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  stepDot: {
    flex: 1,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.leaf,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.textDark,
  },
  photoButtonsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.leafPale,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.leafLight,
  },
  photoActionText: {
    fontSize: typography.small,
    fontWeight: "700",
    color: colors.leafDark,
  },
  photoPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  photoPreview: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
  },
  photoTextWrap: {
    flex: 1,
    gap: 2,
  },
  photoTitle: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.leafDark,
  },
  photoHint: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  plantNetAttribution: {
    fontSize: typography.tiny,
    color: colors.textMuted,
    textAlign: "center",
  },
  identifyingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cancelChip: {
    backgroundColor: colors.terracottaLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  cancelChipText: {
    fontSize: typography.tiny,
    fontWeight: "700",
    color: colors.terracotta,
  },
  removePhotoButton: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.textDark,
    marginTop: spacing.xs,
  },
  showAllChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.leafPale,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  showAllText: {
    fontSize: typography.small,
    fontWeight: "700",
    color: colors.leafDark,
  },
  noResults: {
    width: "100%",
    textAlign: "center",
    color: colors.textMuted,
    paddingVertical: spacing.lg,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.md,
  },
  typeCard: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    gap: 2,
    ...shadow.card,
  },
  typeCardSelected: {
    borderColor: colors.leaf,
    backgroundColor: colors.leafPale,
  },
  checkBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.leaf,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  typeImage: {
    width: "100%",
    height: 90,
    backgroundColor: colors.cream,
  },
  typeCommonName: {
    fontSize: typography.small,
    fontWeight: "700",
    color: colors.textDark,
  },
  typeLatin: {
    fontSize: typography.tiny,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  selectedTypeSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.leafPale,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.leafLight,
  },
  summaryImage: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.cream,
  },
  summaryTextWrap: {
    flex: 1,
    gap: 2,
  },
  summaryLatin: {
    fontSize: typography.small,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  summaryCommonName: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.leafDark,
  },
  floatingActions: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: FLOATING_ACTION_BOTTOM,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  floatingBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadow.card,
  },
  floatingPrimary: {
    marginLeft: "auto",
    borderRadius: radii.pill,
    ...shadow.card,
  },
  floatingPrimaryInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    minWidth: 132,
  },
  nextText: {
    color: colors.textOnDark,
    fontWeight: "700",
    fontSize: typography.body + 1,
  },
  backText: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.leafDark,
  },
});
