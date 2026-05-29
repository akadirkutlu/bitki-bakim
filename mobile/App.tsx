import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { useI18n, I18nProvider } from "./src/localization/I18nContext";
import {
  createPlant,
  extractApiMessage,
  getCalendar,
  getPlants,
  getPlantTypes,
  identifyByPhoto,
} from "./src/services/api";
import { schedulePlantReminders } from "./src/services/notifications";
import type { CalendarEvent, Plant, PlantType } from "./src/types";

type Tab = "home" | "add" | "calendar";

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function LoginScreen() {
  const { t } = useI18n();
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (isRegister && trimmedName.length < 2) {
      Alert.alert("Error", t("validationName"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert("Error", t("validationEmail"));
      return;
    }

    if (trimmedPassword.length < 6) {
      Alert.alert("Error", t("validationPassword"));
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
      Alert.alert("Error", extractApiMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{t("appTitle")}</Text>

        {isRegister ? (
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder={t("name")}
          />
        ) : null}

        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder={t("email")}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t("password")}
        />

        <Pressable style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? t("loading") : isRegister ? t("register") : t("login")}
          </Text>
        </Pressable>

        <Pressable onPress={() => setIsRegister((prev) => !prev)}>
          <Text style={styles.linkText}>
            {isRegister ? t("login") : t("register")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function MainApp() {
  const { t, language, setLanguage } = useI18n();
  const { token, user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("home");
  const [loading, setLoading] = useState(true);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [nickname, setNickname] = useState("");
  const [selectedPlantTypeId, setSelectedPlantTypeId] = useState("");
  const [lastWateringDate, setLastWateringDate] = useState("");
  const [lastFeedingDate, setLastFeedingDate] = useState("");
  const [lastSoilDate, setLastSoilDate] = useState("");
  const [identifiedCandidates, setIdentifiedCandidates] = useState<PlantType[]>([]);

  const plantTypeMap = useMemo(() => {
    return new Map(plantTypes.map((item) => [item.id, item]));
  }, [plantTypes]);

  async function loadAll() {
    if (!token) {
      return;
    }
    setLoading(true);
    try {
      const [types, userPlants, calendarEvents] = await Promise.all([
        getPlantTypes(token),
        getPlants(token),
        getCalendar(token),
      ]);
      setPlantTypes(types);
      setPlants(userPlants);
      setEvents(calendarEvents);
      if (!selectedPlantTypeId && types[0]) {
        setSelectedPlantTypeId(types[0].id);
      }
    } catch (error) {
      Alert.alert("Error", extractApiMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll().catch(() => undefined);
  }, [token]);

  async function onPickImage() {
    if (!token) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.6,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    try {
      const uri = result.assets[0].uri;
      const candidates = await identifyByPhoto(token, uri.toLowerCase());
      setIdentifiedCandidates(candidates);
      if (candidates[0]) {
        setSelectedPlantTypeId(candidates[0].id);
      }
      Alert.alert("AI", t("aiHelp"));
    } catch (error) {
      Alert.alert("Error", extractApiMessage(error));
    }
  }

  async function onCreatePlant() {
    if (!token) {
      return;
    }
    if (
      !isValidIsoDate(lastWateringDate) ||
      !isValidIsoDate(lastFeedingDate) ||
      !isValidIsoDate(lastSoilDate)
    ) {
      Alert.alert("Error", t("invalidDate"));
      return;
    }

    try {
      const newPlant = await createPlant(token, {
        nickname,
        plantTypeId: selectedPlantTypeId,
        lastWateringDate,
        lastFeedingDate,
        lastSoilChangeDate: lastSoilDate,
      });

      const selectedType = plantTypeMap.get(selectedPlantTypeId);
      if (selectedType) {
        await schedulePlantReminders({
          plantNickname: nickname,
          plantType: selectedType,
          lastWateringDate,
          lastFeedingDate,
          lastSoilChangeDate: lastSoilDate,
        });
      }

      setPlants((prev) => [newPlant, ...prev]);
      setNickname("");
      setLastWateringDate("");
      setLastFeedingDate("");
      setLastSoilDate("");
      setIdentifiedCandidates([]);
      setTab("home");
      await loadAll();
    } catch (error) {
      const message = extractApiMessage(error);
      if (message.toLowerCase().includes("free plan limit")) {
        Alert.alert("Plan", t("premiumRequired"));
      } else {
        Alert.alert("Error", message);
      }
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("appTitle")}</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setLanguage(language === "tr" ? "en" : "tr")}
          >
            <Text>{language.toUpperCase()}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={logout}>
            <Text>{t("logout")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabBar}>
        <Pressable style={styles.tabButton} onPress={() => setTab("home")}>
          <Text>{t("home")}</Text>
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => setTab("add")}>
          <Text>{t("addPlant")}</Text>
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => setTab("calendar")}>
          <Text>{t("calendar")}</Text>
        </Pressable>
      </View>

      {tab === "home" ? (
        <View style={styles.flexArea}>
          <Text style={styles.sectionTitle}>
            {t("plants")} ({plants.length}/5) - {user?.plan}
          </Text>
          <FlatList
            data={plants}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text>{t("noPlants")}</Text>}
            renderItem={({ item }) => {
              const type = plantTypeMap.get(item.plantTypeId);
              return (
                <View style={styles.plantCard}>
                  <Text style={styles.plantName}>{item.nickname}</Text>
                  <Text>{type?.latinName ?? item.plantTypeId}</Text>
                  <Text>{type?.turkishNames.join(", ")}</Text>
                </View>
              );
            }}
          />
        </View>
      ) : null}

      {tab === "add" ? (
        <ScrollView contentContainerStyle={styles.formContainer}>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder={t("plantName")}
          />

          <Pressable style={styles.secondaryButton} onPress={onPickImage}>
            <Text>{t("identifyByPhoto")}</Text>
          </Pressable>
          <Text>{t("manualSelect")}</Text>

          <View style={styles.typeList}>
            {(identifiedCandidates.length > 0 ? identifiedCandidates : plantTypes).map(
              (type) => (
                <Pressable
                  key={type.id}
                  onPress={() => setSelectedPlantTypeId(type.id)}
                  style={[
                    styles.typeItem,
                    selectedPlantTypeId === type.id && styles.typeItemSelected,
                  ]}
                >
                  <Text>{type.latinName}</Text>
                  <Text>{type.turkishNames.join(", ")}</Text>
                </Pressable>
              )
            )}
          </View>

          <TextInput
            style={styles.input}
            value={lastWateringDate}
            onChangeText={setLastWateringDate}
            placeholder={t("lastWateringDate")}
          />
          <TextInput
            style={styles.input}
            value={lastFeedingDate}
            onChangeText={setLastFeedingDate}
            placeholder={t("lastFeedingDate")}
          />
          <TextInput
            style={styles.input}
            value={lastSoilDate}
            onChangeText={setLastSoilDate}
            placeholder={t("lastSoilChangeDate")}
          />

          <Pressable style={styles.primaryButton} onPress={onCreatePlant}>
            <Text style={styles.buttonText}>{t("save")}</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {tab === "calendar" ? (
        <FlatList
          contentContainerStyle={styles.formContainer}
          data={events}
          keyExtractor={(item, index) => `${item.plantId}-${item.date}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.plantCard}>
              <Text>{item.date}</Text>
              <Text>
                {item.plantNickname} - {item.plantLatinName}
              </Text>
              <Text>{item.eventType}</Text>
            </View>
          )}
        />
      ) : null}

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

function AppContent() {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  return token ? <MainApp /> : <LoginScreen />;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f8f5",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  flexArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#fff",
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#c9d6ca",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  primaryButton: {
    backgroundColor: "#3f7d3f",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c9d6ca",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  linkText: {
    textAlign: "center",
    color: "#2f5fa6",
    marginTop: 6,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8e2",
    backgroundColor: "#fff",
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  plantCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    gap: 4,
  },
  plantName: {
    fontSize: 16,
    fontWeight: "600",
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  typeList: {
    gap: 8,
  },
  typeItem: {
    borderWidth: 1,
    borderColor: "#c9d6ca",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
  },
  typeItemSelected: {
    borderColor: "#3f7d3f",
    backgroundColor: "#e9f7ea",
  },
});
