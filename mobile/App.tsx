import * as SplashScreen from "expo-splash-screen";
import React, { Suspense, lazy, useEffect } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { I18nProvider } from "./src/localization/I18nContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { colors } from "./src/theme";

// SDK 54 release builds do not reliably auto-hide the native splash screen, which
// can leave the app frozen on the launch icon. Take explicit control instead.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Safety net: guarantee the splash is dismissed even if first render is delayed.
setTimeout(() => {
  SplashScreen.hideAsync().catch(() => undefined);
}, 4000);

const MainApp = lazy(() =>
  import("./src/MainApp").then((module) => ({ default: module.MainApp }))
);

function AppContent() {
  const { token, loading } = useAuth();

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
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

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
