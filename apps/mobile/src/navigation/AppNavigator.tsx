import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "../store/auth";
import TodayScreen from "../screens/TodayScreen";
import RoutesScreen from "../screens/RoutesScreen";
import ScanScreen from "../screens/ScanScreen";
import ProfileScreen from "../screens/ProfileScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import AddPlatformScreen from "../screens/AddPlatformScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import ActiveRouteScreen from "../screens/ActiveRouteScreen";
import type { Route } from "../types";

type AuthScreen = "login" | "register";
type AppTab = "today" | "routes" | "scan" | "profile";
type Overlay = "addPlatform" | "activeRoute" | "createRoute" | null;

export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadSession, needsOnboarding, completeOnboarding } =
    useAuthStore();
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);

  useEffect(() => {
    loadSession();
  }, []);

  const openRoute = (route: Route) => {
    setActiveRouteId(route.id);
    setOverlay("activeRoute");
  };

  const closeRoute = () => {
    setActiveRouteId(null);
    setOverlay(null);
  };

  const openCreateRoute = () => {
    // Navigate to routes tab with create modal
    setActiveTab("routes");
    setOverlay("createRoute");
  };

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

  // Onboarding flow
  if (isAuthenticated && needsOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  // Full-screen overlays
  if (overlay === "addPlatform") {
    return <AddPlatformScreen onDone={() => setOverlay(null)} />;
  }

  if (overlay === "activeRoute" && activeRouteId) {
    return <ActiveRouteScreen routeId={activeRouteId} onBack={closeRoute} />;
  }

  // Main tabbed app
  return (
    <View style={styles.appContainer}>
      <View style={styles.screenContainer}>
        {activeTab === "today" && (
          <TodayScreen onViewRoute={openRoute} onCreateRoute={openCreateRoute} />
        )}
        {activeTab === "routes" && <RoutesScreen onViewRoute={openRoute} />}
        {activeTab === "scan" && <ScanScreen />}
        {activeTab === "profile" && <ProfileScreen />}
      </View>

      {/* Bottom tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("today")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === "today" && styles.tabIconActive]}>
            {"\u2302"}
          </Text>
          <Text style={[styles.tabLabel, activeTab === "today" && styles.tabLabelActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("routes")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === "routes" && styles.tabIconActive]}>
            {"\u2630"}
          </Text>
          <Text style={[styles.tabLabel, activeTab === "routes" && styles.tabLabelActive]}>
            Routes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("scan")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === "scan" && styles.tabIconActive]}>
            {"\u2610"}
          </Text>
          <Text style={[styles.tabLabel, activeTab === "scan" && styles.tabLabelActive]}>Scan</Text>
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
