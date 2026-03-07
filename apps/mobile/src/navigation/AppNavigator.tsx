import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import EarningsScreen from "../screens/EarningsScreen";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import AdminRoutesScreen from "../screens/AdminRoutesScreen";
import type { Route } from "../types";

type AuthScreen = "login" | "register";
type AppTab = "today" | "routes" | "scan" | "earnings" | "profile";
type Overlay = "addPlatform" | "activeRoute" | "createRoute" | null;

export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadSession, needsOnboarding, completeOnboarding, user } =
    useAuthStore();
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const isAdmin = user?.role === "HUB_ADMIN" || user?.role === "SUPER_ADMIN";
  const [adminTab, setAdminTab] = useState<
    "dashboard" | "adminRoutes" | "drivers" | "analytics" | "profile"
  >("dashboard");

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

  // Admin tabbed app
  if (isAdmin) {
    return (
      <View style={styles.appContainer}>
        <View style={styles.screenContainer}>
          {adminTab === "dashboard" && <AdminDashboardScreen />}
          {adminTab === "adminRoutes" && <AdminRoutesScreen onViewRoute={openRoute} />}
          {adminTab === "drivers" && (
            <PlaceholderScreen title="Drivers" subtitle="Coming in Phase C" />
          )}
          {adminTab === "analytics" && (
            <PlaceholderScreen title="Analytics" subtitle="Coming in Phase B" />
          )}
          {adminTab === "profile" && <ProfileScreen />}
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setAdminTab("dashboard")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="grid-outline"
              size={22}
              color={adminTab === "dashboard" ? "#3B82F6" : "#64748B"}
            />
            <Text style={[styles.tabLabel, adminTab === "dashboard" && styles.tabLabelActive]}>
              Dashboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setAdminTab("adminRoutes")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="map-outline"
              size={22}
              color={adminTab === "adminRoutes" ? "#3B82F6" : "#64748B"}
            />
            <Text style={[styles.tabLabel, adminTab === "adminRoutes" && styles.tabLabelActive]}>
              Routes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setAdminTab("drivers")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="people-outline"
              size={22}
              color={adminTab === "drivers" ? "#3B82F6" : "#64748B"}
            />
            <Text style={[styles.tabLabel, adminTab === "drivers" && styles.tabLabelActive]}>
              Drivers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setAdminTab("analytics")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="bar-chart-outline"
              size={22}
              color={adminTab === "analytics" ? "#3B82F6" : "#64748B"}
            />
            <Text style={[styles.tabLabel, adminTab === "analytics" && styles.tabLabelActive]}>
              Analytics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setAdminTab("profile")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="person-outline"
              size={22}
              color={adminTab === "profile" ? "#3B82F6" : "#64748B"}
            />
            <Text style={[styles.tabLabel, adminTab === "profile" && styles.tabLabelActive]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
        {activeTab === "earnings" && <EarningsScreen />}
        {activeTab === "profile" && <ProfileScreen />}
      </View>

      {/* Bottom tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("today")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="today-outline"
            size={22}
            color={activeTab === "today" ? "#3B82F6" : "#64748B"}
          />
          <Text style={[styles.tabLabel, activeTab === "today" && styles.tabLabelActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("routes")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="map-outline"
            size={22}
            color={activeTab === "routes" ? "#3B82F6" : "#64748B"}
          />
          <Text style={[styles.tabLabel, activeTab === "routes" && styles.tabLabelActive]}>
            Routes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("scan")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="scan-outline"
            size={22}
            color={activeTab === "scan" ? "#3B82F6" : "#64748B"}
          />
          <Text style={[styles.tabLabel, activeTab === "scan" && styles.tabLabelActive]}>Scan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("earnings")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="cash-outline"
            size={22}
            color={activeTab === "earnings" ? "#3B82F6" : "#64748B"}
          />
          <Text style={[styles.tabLabel, activeTab === "earnings" && styles.tabLabelActive]}>
            Earnings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("profile")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="person-outline"
            size={22}
            color={activeTab === "profile" ? "#3B82F6" : "#64748B"}
          />
          <Text style={[styles.tabLabel, activeTab === "profile" && styles.tabLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0F172A",
      }}
    >
      <Ionicons name="construct-outline" size={48} color="#64748B" />
      <Text style={{ color: "#F8FAFC", fontSize: 24, fontWeight: "700", marginTop: 16 }}>
        {title}
      </Text>
      <Text style={{ color: "#64748B", fontSize: 14, marginTop: 8 }}>{subtitle}</Text>
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
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  tabLabelActive: {
    color: "#3B82F6",
  },
});
