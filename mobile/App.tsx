import * as SplashScreen from "expo-splash-screen";
import React, { Suspense, lazy, useEffect } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { I18nProvider } from "./src/localization/I18nContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { colors } from "./src/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const MainApp = lazy(() =>
  import("./src/MainApp").then((module) => ({ default: module.MainApp }))
);

function AppContent() {
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loading]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.leaf} />
      </SafeAreaView>
    );
  }

  if (!token) {
    return <LoginScreen />;
  }

  return (
    <Suspense
      fallback={
        <SafeAreaView style={[styles.screen, styles.centered]}>
          <ActivityIndicator size="large" color={colors.leaf} />
        </SafeAreaView>
      }
    >
      <MainApp />
    </Suspense>
  );
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
    backgroundColor: colors.cream,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
});
