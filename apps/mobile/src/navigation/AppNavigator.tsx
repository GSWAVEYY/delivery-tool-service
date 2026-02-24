import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "../store/auth";
import DashboardScreen from "../screens/DashboardScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import EarningsScreen from "../screens/EarningsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AddPlatformScreen from "../screens/AddPlatformScreen";

type Screen = "login" | "register" | "dashboard" | "earnings" | "profile" | "addPlatform";

export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadSession } = useAuthStore();
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");

  useEffect(() => {
    loadSession();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Auth screens
  if (!isAuthenticated) {
    if (currentScreen === "register") {
      return <RegisterScreen onNavigateLogin={() => setCurrentScreen("login")} />;
    }
    return <LoginScreen onNavigateRegister={() => setCurrentScreen("register")} />;
  }

  // App screens
  if (currentScreen === "addPlatform") {
    return <AddPlatformScreen onDone={() => setCurrentScreen("dashboard")} />;
  }
  if (currentScreen === "earnings") {
    return <EarningsScreen />;
  }
  if (currentScreen === "profile") {
    return <ProfileScreen />;
  }

  // Default: Dashboard
  return <DashboardScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
});
