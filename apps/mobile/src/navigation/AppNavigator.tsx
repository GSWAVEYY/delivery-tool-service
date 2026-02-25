import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "../store/auth";
import DashboardScreen from "../screens/DashboardScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import EarningsScreen from "../screens/EarningsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AddPlatformScreen from "../screens/AddPlatformScreen";
import OnboardingScreen from "../screens/OnboardingScreen";

type AuthScreen = "login" | "register";
type AppTab = "dashboard" | "earnings" | "profile";
type Overlay = "addPlatform" | null;

export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadSession, needsOnboarding, completeOnboarding } =
    useAuthStore();
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [overlay, setOverlay] = useState<Overlay>(null);

  useEffect(() => {
    loadSession();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingLogo}>DB</Text>
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 16 }} />
      </View>
    );
  }

  // Auth flow
  if (!isAuthenticated) {
    if (authScreen === "register") {
      return <RegisterScreen onNavigateLogin={() => setAuthScreen("login")} />;
    }
    return <LoginScreen onNavigateRegister={() => setAuthScreen("register")} />;
  }

  // Onboarding flow — shown after first registration
  if (isAuthenticated && needsOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  // Overlay screens (full screen over tabs)
  if (overlay === "addPlatform") {
    return <AddPlatformScreen onDone={() => setOverlay(null)} />;
  }

  // Main tabbed app
  return (
    <View style={styles.appContainer}>
      {/* Active screen */}
      <View style={styles.screenContainer}>
        {activeTab === "dashboard" && (
          <DashboardScreen onAddPlatform={() => setOverlay("addPlatform")} />
        )}
        {activeTab === "earnings" && <EarningsScreen />}
        {activeTab === "profile" && <ProfileScreen />}
      </View>

      {/* Bottom tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("dashboard")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === "dashboard" && styles.tabIconActive]}>
            {"\u2302"}
          </Text>
          <Text style={[styles.tabLabel, activeTab === "dashboard" && styles.tabLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("earnings")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === "earnings" && styles.tabIconActive]}>$</Text>
          <Text style={[styles.tabLabel, activeTab === "earnings" && styles.tabLabelActive]}>
            Earnings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("profile")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === "profile" && styles.tabIconActive]}>
            {"\u2699"}
          </Text>
          <Text style={[styles.tabLabel, activeTab === "profile" && styles.tabLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  loadingLogo: {
    fontSize: 48,
    fontWeight: "900",
    color: "#3B82F6",
    letterSpacing: 2,
  },
  appContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 22,
    color: "#64748B",
    marginBottom: 2,
  },
  tabIconActive: {
    color: "#3B82F6",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  tabLabelActive: {
    color: "#3B82F6",
  },
});
